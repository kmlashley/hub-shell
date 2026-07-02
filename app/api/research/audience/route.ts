import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase-server";
import { searchWithTavily, extractJsonFromClaude } from "@/lib/research/api-clients";
import { saveReport, todaySlug } from "@/lib/research/run-helpers";
import { BUSINESS_CONTEXT, AUDIENCE_CONTEXT, NICHE_CONTEXT } from "@/lib/research/context";

export const maxDuration = 120;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST() {
  const supabase = createServerClient();
  const slug = todaySlug();

  try {
    const audienceLine = AUDIENCE_CONTEXT.split("\n")[0]?.replace("[FILL IN:", "").replace("]", "").trim()
      ?? "entrepreneurs";
    const nicheLine = NICHE_CONTEXT.split("\n")[0]?.trim() ?? "small business owners";

    const [painResults, questionResults] = await Promise.all([
      searchWithTavily(`${audienceLine} biggest struggles challenges problems 2025`, {
        searchDepth: "advanced",
        maxResults: 7,
        includeAnswer: true,
      }),
      searchWithTavily(`questions ${nicheLine} asking Reddit forums communities`, {
        searchDepth: "basic",
        maxResults: 5,
        includeDomains: ["reddit.com", "quora.com"],
      }),
    ]);

    const analysis = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      system: `You are an audience intelligence research agent.

${BUSINESS_CONTEXT}

Analyze real conversations and search data to understand what this audience is currently struggling with, asking, and talking about. The goal is content that speaks to real, current pain — not generic topics.

Return JSON:
{
  "date": "YYYY-MM-DD",
  "top_pain_points": [
    {
      "pain": "string — specific pain, not generic",
      "frequency": "high|medium|low",
      "exact_language": "string — how they actually describe this problem in their own words",
      "content_opportunity": "string — post or video that directly addresses this"
    }
  ],
  "active_questions": ["string — questions they're actually asking right now"],
  "language_patterns": ["string — phrases and words they use that content should mirror"],
  "emotional_triggers": ["string — moments when they're most receptive to help"],
  "summary": "string"
}

Return ONLY valid JSON.`,
      messages: [
        {
          role: "user",
          content: `Pain point data:\n${JSON.stringify(painResults)}\n\nQuestion data:\n${JSON.stringify(questionResults)}\n\nDate: ${slug}`,
        },
      ],
    });

    const raw = analysis.content[0].type === "text" ? analysis.content[0].text : "";
    const data = extractJsonFromClaude(raw);
    if (!data) throw new Error("Failed to parse audience research JSON");

    await saveReport(supabase, "audience", slug, data as Record<string, unknown>);
    return NextResponse.json({ success: true, slug });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Audience Agent]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
