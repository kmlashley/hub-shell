import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase-server";
import { searchWithTavily, extractJsonFromClaude } from "@/lib/research/api-clients";
import { saveReport, todaySlug } from "@/lib/research/run-helpers";
import { BUSINESS_CONTEXT, CORE_TOPICS } from "@/lib/research/context";

export const maxDuration = 120;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST() {
  const supabase = createServerClient();
  const slug = todaySlug();

  try {
    const topicLine = CORE_TOPICS.split("\n").find((l) => l.trim().startsWith("-"))?.replace("-", "").trim()
      ?? "content marketing";

    const [trendResults, formatResults] = await Promise.all([
      searchWithTavily(`trending topics ${topicLine} content 2025`, {
        searchDepth: "advanced",
        maxResults: 7,
        includeAnswer: true,
      }),
      searchWithTavily(`viral content formats ${topicLine} what's working now`, {
        searchDepth: "basic",
        maxResults: 5,
      }),
    ]);

    const analysis = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      system: `You are a content trends research agent.

${BUSINESS_CONTEXT}

Analyze what content is performing well and what topics are trending in this niche right now. Focus on actionable signals — not vague "AI is big" observations, but specific formats, angles, and topics with evidence of momentum.

Return JSON:
{
  "date": "YYYY-MM-DD",
  "trending_topics": [
    {
      "topic": "string",
      "momentum": "rising|peak|fading",
      "evidence": "string — what signals this trend",
      "content_angle": "string — how to approach this specifically"
    }
  ],
  "format_trends": [
    {
      "format": "string — e.g., 'step-by-step tutorial', 'case study', 'contrarian take'",
      "why_working": "string",
      "apply_to": "string — specific topic from this niche"
    }
  ],
  "topics_with_momentum": ["string"],
  "topics_losing_steam": ["string"],
  "summary": "string"
}

Return ONLY valid JSON.`,
      messages: [
        {
          role: "user",
          content: `Trend data:\n${JSON.stringify(trendResults)}\n\nFormat data:\n${JSON.stringify(formatResults)}\n\nDate: ${slug}`,
        },
      ],
    });

    const raw = analysis.content[0].type === "text" ? analysis.content[0].text : "";
    const data = extractJsonFromClaude(raw);
    if (!data) throw new Error("Failed to parse content trends JSON");

    await saveReport(supabase, "content-trends", slug, data as Record<string, unknown>);
    return NextResponse.json({ success: true, slug });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Content Trends Agent]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
