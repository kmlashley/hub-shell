import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase-server";
import { searchWithTavily, extractJsonFromClaude } from "@/lib/research/api-clients";
import { saveReport, todaySlug } from "@/lib/research/run-helpers";
import { isInternalRequest } from "@/lib/research/internal-auth";
import { BUSINESS_CONTEXT, AUDIENCE_CONTEXT, NICHE_CONTEXT } from "@/lib/research/context";

export const maxDuration = 120;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  if (!isInternalRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const slug = todaySlug();

  try {
    // Audience segments — one per non-empty line of AUDIENCE_CONTEXT. Each
    // segment gets its own pain-point + question search, so a multi-audience
    // business doesn't have the second (and third...) segment silently dropped.
    const segments = AUDIENCE_CONTEXT.split("\n").map((l) => l.trim()).filter(Boolean);
    const nicheLine = NICHE_CONTEXT.split("\n")[0]?.trim() ?? "small business owners";

    const segmentResults = await Promise.all(
      segments.map(async (segment) => {
        const [painResults, questionResults] = await Promise.all([
          searchWithTavily(`${segment} biggest struggles challenges problems 2025`, {
            searchDepth: "advanced",
            maxResults: 7,
            includeAnswer: true,
          }),
          searchWithTavily(`questions ${segment} asking Reddit forums communities`, {
            searchDepth: "basic",
            maxResults: 5,
            includeDomains: ["reddit.com", "quora.com"],
          }),
        ]);
        return { segment, painResults, questionResults };
      })
    );

    // Shared "what's this niche asking about online" search — not segment-specific.
    const nicheQuestionResults = await searchWithTavily(`questions ${nicheLine} asking Reddit forums communities`, {
      searchDepth: "basic",
      maxResults: 5,
      includeDomains: ["reddit.com", "quora.com"],
    });

    const analysis = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 5000,
      system: `You are an audience intelligence research agent.

${BUSINESS_CONTEXT}

This business serves ${segments.length} distinct audience segment${segments.length === 1 ? "" : "s"}. Analyze each segment SEPARATELY using its own search data below — do not let one segment's data bleed into another's analysis. The goal is content that speaks to real, current pain for each segment — not generic topics, and not just the loudest segment.

Return JSON:
{
  "date": "YYYY-MM-DD",
  "segments": [
    {
      "audience": "string — short label for this segment (e.g. 'Educators', 'Corporate/L&D leaders'), inferred from its description",
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
      "emotional_triggers": ["string — moments when they're most receptive to help"]
    }
  ],
  "summary": "string — 2-3 sentences covering the sharpest opportunity across ALL segments"
}

Return ONLY valid JSON.`,
      messages: [
        {
          role: "user",
          content: segmentResults
            .map(
              ({ segment, painResults, questionResults }) =>
                `### Segment: ${segment}\nPain point data:\n${JSON.stringify(painResults)}\n\nQuestion data:\n${JSON.stringify(questionResults)}`
            )
            .join("\n\n")
            + `\n\n### Niche-wide question data:\n${JSON.stringify(nicheQuestionResults)}\n\nDate: ${slug}`,
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
