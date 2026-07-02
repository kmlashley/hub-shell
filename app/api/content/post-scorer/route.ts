import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase-server";
import { extractJsonFromClaude } from "@/lib/research/api-clients";
import { BUSINESS_CONTEXT } from "@/lib/research/context";

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function calcGrade(total: number): "A" | "B" | "C" | "D" | "F" {
  const pct = (total / 25) * 100;
  if (pct >= 90) return "A";
  if (pct >= 80) return "B";
  if (pct >= 70) return "C";
  if (pct >= 60) return "D";
  return "F";
}

export async function POST(request: NextRequest) {
  const { content, save }: { content: string; save?: boolean } = await request.json();

  if (!content?.trim()) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: `You are a content scoring expert. Score the post on 5 dimensions (0–5 each).

Business context:
${BUSINESS_CONTEXT}

Dimensions:
1. Clarity (0–5): Is the main point immediately obvious? Can a reader state the takeaway in one sentence after reading?
2. Hook (0–5): Does the opening line stop the scroll? Does it create curiosity or tension in the first sentence or two?
3. Value (0–5): Does it deliver real, specific insight? Or is it vague? Would a reader save or share this?
4. Authenticity (0–5): Does it sound like a real person with experience, or generic AI-sounding content?
5. CTA (0–5): Is there a clear next step? Does it match what the content just promised?

Return ONLY valid JSON, no other text:
{
  "dimensions": {
    "clarity": { "score": number, "note": "one specific observation (1-2 sentences)" },
    "hook": { "score": number, "note": "one specific observation (1-2 sentences)" },
    "value": { "score": number, "note": "one specific observation (1-2 sentences)" },
    "authenticity": { "score": number, "note": "one specific observation (1-2 sentences)" },
    "cta": { "score": number, "note": "one specific observation (1-2 sentences)" }
  },
  "fixes": [
    "Specific, actionable fix #1 — quote the problem text, tell them exactly what to change",
    "Specific, actionable fix #2",
    "Specific, actionable fix #3"
  ],
  "rewrites": [
    {
      "original": "exact excerpt from the post (15–40 words)",
      "suggested": "your improved version of that same excerpt",
      "reason": "why this version is stronger (1 sentence)"
    },
    {
      "original": "another excerpt",
      "suggested": "improved version",
      "reason": "reason"
    }
  ]
}`,
      messages: [{ role: "user", content: content.slice(0, 8000) }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    const data = extractJsonFromClaude(raw) as {
      dimensions?: Record<string, { score: number; note: string }>;
      fixes?: string[];
      rewrites?: Array<{ original: string; suggested: string; reason: string }>;
    } | null;

    if (!data?.dimensions) {
      return NextResponse.json({ error: "Failed to parse score" }, { status: 500 });
    }

    const dims = data.dimensions;
    const total = Object.values(dims).reduce((sum, d) => sum + (d.score ?? 0), 0);
    const grade = calcGrade(total);

    const result = {
      grade,
      overall_score: total,
      dimensions: dims,
      fixes: data.fixes ?? [],
      rewrites: data.rewrites ?? [],
    };

    if (save) {
      const supabase = createServerClient();
      await supabase.from("post_scores").insert({
        content_preview: content.slice(0, 300),
        overall_score: total,
        grade,
        dimensions_json: dims,
        fixes_json: data.fixes ?? [],
        rewrites_json: data.rewrites ?? [],
        created_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
