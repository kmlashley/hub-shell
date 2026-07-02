import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase-server";
import { searchWithTavily, extractJsonFromClaude } from "@/lib/research/api-clients";
import { saveReport, todaySlug } from "@/lib/research/run-helpers";
import { isInternalRequest } from "@/lib/research/internal-auth";
import { BUSINESS_CONTEXT, COMPETITORS, NICHE_CONTEXT, AUDIENCE_CONTEXT } from "@/lib/research/context";

export const maxDuration = 120;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  if (!isInternalRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const slug = todaySlug();

  try {
    // Audience segments — one per non-empty line of AUDIENCE_CONTEXT. Same
    // per-segment + shared-niche-wide pattern as the Audience report.
    const segments = AUDIENCE_CONTEXT.split("\n").map((l) => l.trim()).filter(Boolean);

    const segmentResults = await Promise.all(
      segments.map(async (segment) => {
        const [competitorResults, landscapeResults] = await Promise.all([
          searchWithTavily(`${segment} content creators recent posts 2025`, {
            searchDepth: "advanced",
            maxResults: 7,
            includeAnswer: true,
          }),
          searchWithTavily(`best resources ${segment} online`, {
            searchDepth: "basic",
            maxResults: 5,
          }),
        ]);
        return { segment, competitorResults, landscapeResults };
      })
    );

    // Shared "what's this niche's landscape" search — not segment-specific.
    const nicheLandscapeResults = await searchWithTavily(`best resources ${NICHE_CONTEXT.split("\n")[0]} online`, {
      searchDepth: "basic",
      maxResults: 5,
    });

    const analysis = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 5000,
      system: `You are a competitive research agent for a content creator.

${BUSINESS_CONTEXT}

Competitors and adjacent creators to monitor:
${COMPETITORS}

This business serves ${segments.length} distinct audience segment${segments.length === 1 ? "" : "s"}. Analyze each segment SEPARATELY using its own search data below — do not let one segment's data bleed into another's analysis. For each segment identify:
1. What topics competitors are actively covering for that segment
2. Gaps and angles they're missing
3. Positioning opportunities

Return JSON:
{
  "date": "YYYY-MM-DD",
  "segments": [
    {
      "audience": "string — short label for this segment (e.g. 'Educators', 'Corporate/L&D leaders'), inferred from its description",
      "competitor_observations": [
        {
          "source": "string — who or what this is about",
          "what_they_cover": "string",
          "what_they_miss": "string",
          "opportunity": "string — how you can fill this gap"
        }
      ],
      "positioning_opportunities": ["string — specific angles where you have a differentiation advantage with this segment"]
    }
  ],
  "market_landscape": "2-3 sentence overview of the competitive landscape across both segments",
  "topics_to_avoid": ["string — topics so well covered that you'd be swimming upstream"],
  "summary": "string"
}

Return ONLY valid JSON.`,
      messages: [
        {
          role: "user",
          content: segmentResults
            .map(
              ({ segment, competitorResults, landscapeResults }) =>
                `### Segment: ${segment}\nSearch data:\n${JSON.stringify(competitorResults)}\n\nLandscape data:\n${JSON.stringify(landscapeResults)}`
            )
            .join("\n\n")
            + `\n\n### Niche-wide landscape data:\n${JSON.stringify(nicheLandscapeResults)}\n\nDate: ${slug}`,
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
