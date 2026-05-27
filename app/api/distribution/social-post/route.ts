import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { BUSINESS_CONTEXT } from "@/lib/research/context";

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─────────────────────────────────────────────────────────────────────────────
// Distribution Layer (L5) — Social Post Generator
//
// This is a starting point. Extend it for the platforms you actually use.
// To add LinkedIn publishing: connect the LinkedIn MCP or use the LinkedIn API.
// To add Substack Notes: use the Substack undocumented API pattern.
// To add scheduling: integrate with Nuelink, Buffer, or build your own queue.
// ─────────────────────────────────────────────────────────────────────────────

type Platform = "linkedin" | "substack_note" | "instagram" | "twitter";

interface SocialPostRequest {
  content: string;
  platforms: Platform[];
  post_id?: string;
}

interface SocialPostVariant {
  platform: Platform;
  text: string;
  character_count: number;
  notes: string;
}

export async function POST(request: NextRequest) {
  const { content, platforms = ["linkedin"], post_id }: SocialPostRequest = await request.json();

  if (!content) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  const PLATFORM_RULES: Record<Platform, string> = {
    linkedin: "LinkedIn post: 400-1200 characters. Hook → Context → Value → Question. No hashtags. Professional but conversational. First line must stand alone (it's all people see before 'see more').",
    substack_note: "Substack Note: 1-3 sentences max. Single punchy point. Opinionated. Like texting a smart friend. No preamble.",
    instagram: "Instagram caption: 300-600 words. More personal. Story angle. Mention link in bio if relevant.",
    twitter: "Tweet thread: Tweet 1 is the hook (under 240 chars). Threads 2-5 each add one point. Thread ends with a CTA.",
  };

  try {
    const platformPrompts = platforms
      .filter((p): p is Platform => p in PLATFORM_RULES)
      .map((p) => `- ${p}: ${PLATFORM_RULES[p]}`)
      .join("\n");

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: `You are a social media content adapter for this business.

${BUSINESS_CONTEXT}

For each platform requested, adapt the source content into platform-native format. Do NOT just shorten it — find the angle, the hook, the single most shareable point. Each platform version should feel native, not like a repost.

Platform rules:
${platformPrompts}

Return JSON:
{
  "variants": [
    {
      "platform": "string",
      "text": "string — the full post text",
      "character_count": number,
      "notes": "string — brief note on what angle you took and why"
    }
  ]
}

Return ONLY valid JSON.`,
      messages: [
        { role: "user", content: `Source content:\n\n${content.slice(0, 4000)}\n\nPost ID: ${post_id ?? "none"}` },
      ],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";

    // Parse JSON from response
    const parsed = raw.match(/```(?:json)?\s*([\s\S]+?)```/);
    const jsonStr = parsed ? parsed[1] : raw;
    let variants: SocialPostVariant[] = [];
    try {
      const data = JSON.parse(jsonStr.trim()) as { variants?: SocialPostVariant[] };
      variants = data.variants ?? [];
    } catch {
      return NextResponse.json({ error: "Failed to parse social post variants" }, { status: 500 });
    }

    return NextResponse.json({ success: true, variants });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
