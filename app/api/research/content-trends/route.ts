import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase-server";
import { searchWithTavily, extractJsonFromClaude } from "@/lib/research/api-clients";
import { saveReport, todaySlug } from "@/lib/research/run-helpers";
import { isInternalRequest } from "@/lib/research/internal-auth";
import { BUSINESS_CONTEXT, CORE_TOPICS, AUDIENCE_CONTEXT } from "@/lib/research/context";

export const maxDuration = 120;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  if (!isInternalRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const slug = todaySlug();

  try {
    const topicLine = CORE_TOPICS.split("\n").find((l) => l.trim().startsWith("-"))?.replace("-", "").trim()
      ?? "content marketing";

    // Audience segments — one per non-empty line of AUDIENCE_CONTEXT. Same
    // per-segment + shared-niche-wide pattern as the Audience report.
    const segments = AUDIENCE_CONTEXT.split("\n").map((l) => l.trim()).filter(Boolean);

    const segmentResults = await Promise.all(
      segments.map(async (segment) => {
        const [trendResults, formatResults] = await Promise.all([
          searchWithTavily(`trending topics ${segment} content 2025`, {
            searchDepth: "advanced",
            maxResults: 7,
            includeAnswer: true,
          }),
          searchWithTavily(`viral content formats ${segment} what's working now`, {
            searchDepth: "basic",
            maxResults: 5,
          }),
        ]);
        return { segment, trendResults, formatResults };
      })
    );

    // Shared "what's working for this niche's core topic" search — not segment-specific.
    const nicheFormatResults = await searchWithTavily(`viral content formats ${topicLine} what's working now`, {
      searchDepth: "basic",
      maxResults: 5,
    });

    const analysis = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 5000,
      system: `You are a content trends research agent.

${BUSINESS_CONTEXT}

This business serves ${segments.length} distinct audience segment${segments.length === 1 ? "" : "s"}. Analyze what content is performing well and what topics are trending for EACH segment separately using its own search data below — do not let one segment's data bleed into another's analysis. Focus on actionable signals — not vague "AI is big" observations, but specific formats, angles, and topics with evidence of momentum.

Return JSON:
{
  "date": "YYYY-MM-DD",
  "segments": [
    {
      "audience": "string — short label for this segment (e.g. 'Educators', 'Corporate/L&D leaders'), inferred from its description",
      "trending_topics": [
        {
          "topic": "string",
          "momentum": "rising|peak|fading",
          "evidence": "string — what signals this trend",
          "content_angle": "string — how to approach this specifically for this segment"
        }
      ],
      "format_trends": [
        {
          "format": "string — e.g., 'step-by-step tutorial', 'case study', 'contrarian take'",
          "why_working": "string",
          "apply_to": "string — specific topic from this segment"
        }
      ]
    }
  ],
  "topics_with_momentum": ["string — across either segment"],
  "topics_losing_steam": ["string — across either segment"],
  "summary": "string"
}

Return ONLY valid JSON.`,
      messages: [
        {
          role: "user",
          content: segmentResults
            .map(
              ({ segment, trendResults, formatResults }) =>
                `### Segment: ${segment}\nTrend data:\n${JSON.stringify(trendResults)}\n\nFormat data:\n${JSON.stringify(formatResults)}`
            )
            .join("\n\n")
            + `\n\n### Niche-wide format data:\n${JSON.stringify(nicheFormatResults)}\n\nDate: ${slug}`,
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
