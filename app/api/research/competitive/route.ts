import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase-server";
import { searchWithTavily, extractJsonFromClaude } from "@/lib/research/api-clients";
import { saveReport, todaySlug } from "@/lib/research/run-helpers";
import { BUSINESS_CONTEXT, COMPETITORS, NICHE_CONTEXT } from "@/lib/research/context";

export const maxDuration = 120;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST() {
  const supabase = createServerClient();
  const slug = todaySlug();

  try {
    // Search for competitor activity and market landscape
    const [competitorResults, landscapeResults] = await Promise.all([
      searchWithTavily(`${NICHE_CONTEXT.split("\n")[0]} content creators recent posts 2025`, {
        searchDepth: "advanced",
        maxResults: 7,
        includeAnswer: true,
      }),
      searchWithTavily(`best resources ${NICHE_CONTEXT.split("\n")[0]} online`, {
        searchDepth: "basic",
        maxResults: 5,
      }),
    ]);

    const analysis = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      system: `You are a competitive research agent for a content creator.

${BUSINESS_CONTEXT}

Competitors and adjacent creators to monitor:
${COMPETITORS}

Analyze the search data below and identify:
1. What topics competitors are actively covering
2. Gaps and angles they're missing
3. Positioning opportunities

Return JSON:
{
  "date": "YYYY-MM-DD",
  "market_landscape": "2-3 sentence overview of the competitive landscape",
  "competitor_observations": [
    {
      "source": "string — who or what this is about",
      "what_they_cover": "string",
      "what_they_miss": "string",
      "opportunity": "string — how you can fill this gap"
    }
  ],
  "positioning_opportunities": ["string — specific angles where you have a differentiation advantage"],
  "topics_to_avoid": ["string — topics so well covered that you'd be swimming upstream"],
  "summary": "string"
}

Return ONLY valid JSON.`,
      messages: [
        {
          role: "user",
          content: `Search data:\n${JSON.stringify(competitorResults)}\n\nLandscape data:\n${JSON.stringify(landscapeResults)}\n\nDate: ${slug}`,
        },
      ],
    });

    const raw = analysis.content[0].type === "text" ? analysis.content[0].text : "";
    const data = extractJsonFromClaude(raw);
    if (!data) throw new Error("Failed to parse competitive research JSON");

    await saveReport(supabase, "competitive", slug, data as Record<string, unknown>);
    return NextResponse.json({ success: true, slug });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Competitive Agent]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
