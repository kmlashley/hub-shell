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
    // Audience segments — one per non-empty line of AUDIENCE_CONTEXT. Same
    // per-segment + shared-niche-wide pattern as the Audience report.
    const segments = AUDIENCE_CONTEXT.split("\n").map((l) => l.trim()).filter(Boolean);
    const topicLine = CORE_TOPICS.split("\n")[1]?.trim() ?? "content marketing";

    const segmentResults = await Promise.all(
      segments.map(async (segment) => {
        const [trendResults, questionResults] = await Promise.all([
          searchWithTavily(`trending keywords ${segment} 2025`, {
            searchDepth: "advanced",
            maxResults: 7,
            includeAnswer: true,
          }),
          searchWithTavily(`top search questions ${segment} AI tools`, {
            searchDepth: "basic",
            maxResults: 5,
          }),
        ]);
        return { segment, trendResults, questionResults };
      })
    );

    // Shared "what's this niche's topic searching for" search — not segment-specific.
    const nicheQuestionResults = await searchWithTavily(`top search questions ${topicLine} AI tools`, {
      searchDepth: "basic",
      maxResults: 5,
    });

    const analysis = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 5000,
      system: `You are a keyword research agent for a content creator.

${BUSINESS_CONTEXT}

This business serves ${segments.length} distinct audience segment${segments.length === 1 ? "" : "s"}. Analyze each segment SEPARATELY using its own search data below — do not let one segment's data bleed into another's analysis. Focus on:
- Keywords that match real audience search intent, per segment
- Topics where competitors are thin or generic
- Questions each segment is actively asking

Return JSON:
{
  "date": "YYYY-MM-DD",
  "segments": [
    {
      "audience": "string — short label for this segment (e.g. 'Educators', 'Corporate/L&D leaders'), inferred from its description",
      "top_keywords": [
        {
          "keyword": "string",
          "intent": "informational|commercial|navigational",
          "opportunity": "high|medium|low",
          "rationale": "why this keyword fits this segment",
          "content_angle": "a specific, differentiated way to approach this"
        }
      ],
      "trending_questions": ["string — questions this segment is actively asking"]
    }
  ],
  "content_gap_opportunities": ["string — topics not well covered by competitors, across either segment"],
  "summary": "2-3 sentence summary of the biggest keyword opportunities right now, covering both segments"
}

Return ONLY valid JSON.`,
      messages: [
        {
          role: "user",
          content: segmentResults
            .map(
              ({ segment, trendResults, questionResults }) =>
                `### Segment: ${segment}\nTrend data:\n${JSON.stringify(trendResults)}\n\nQuestion data:\n${JSON.stringify(questionResults)}`
            )
            .join("\n\n")
            + `\n\n### Niche-wide question data:\n${JSON.stringify(nicheQuestionResults)}\n\nDate: ${slug}`,
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
