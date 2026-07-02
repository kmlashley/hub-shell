import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase-server";
import { searchWithTavily, extractJsonFromClaude } from "@/lib/research/api-clients";
import { saveReport, todaySlug } from "@/lib/research/run-helpers";
import { BUSINESS_CONTEXT, CORE_TOPICS, AUDIENCE_CONTEXT } from "@/lib/research/context";

export const maxDuration = 120;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST() {
  const supabase = createServerClient();
  const slug = todaySlug();

  try {
    // Search for keyword opportunities relevant to this niche
    const [trendResults, competitorResults] = await Promise.all([
      searchWithTavily(`trending keywords ${CORE_TOPICS.split("\n")[1]?.trim() ?? "content marketing"} 2025`, {
        searchDepth: "advanced",
        maxResults: 7,
        includeAnswer: true,
      }),
      searchWithTavily(`top search questions ${AUDIENCE_CONTEXT.split("\n")[0]?.trim() ?? "entrepreneurs"} AI tools`, {
        searchDepth: "basic",
        maxResults: 5,
      }),
    ]);

    const analysis = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      system: `You are a keyword research agent for a content creator.

${BUSINESS_CONTEXT}

Analyze the search data below and identify the best keyword opportunities for this business. Focus on:
- Keywords that match real audience search intent
- Topics where competitors are thin or generic
- Questions the target audience is actively asking

Return JSON:
{
  "date": "YYYY-MM-DD",
  "top_keywords": [
    {
      "keyword": "string",
      "intent": "informational|commercial|navigational",
      "opportunity": "high|medium|low",
      "rationale": "why this keyword fits this business",
      "content_angle": "a specific, differentiated way to approach this"
    }
  ],
  "trending_questions": ["string"],
  "content_gap_opportunities": ["string — topics not well covered by competitors"],
  "summary": "2-3 sentence summary of the biggest keyword opportunities right now"
}

Return ONLY valid JSON.`,
      messages: [
        {
          role: "user",
          content: `Trend data:\n${JSON.stringify(trendResults)}\n\nQuestion data:\n${JSON.stringify(competitorResults)}\n\nDate: ${slug}`,
        },
      ],
    });

    const raw = analysis.content[0].type === "text" ? analysis.content[0].text : "";
    const data = extractJsonFromClaude(raw);
    if (!data) throw new Error("Failed to parse keyword research JSON");

    await saveReport(supabase, "keyword", slug, data as Record<string, unknown>);
    return NextResponse.json({ success: true, slug });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Keyword Agent]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
