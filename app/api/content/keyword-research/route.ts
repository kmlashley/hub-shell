import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase-server";
import { searchWithTavily, extractJsonFromClaude } from "@/lib/research/api-clients";
import { BUSINESS_CONTEXT } from "@/lib/research/context";

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface KeywordEntry {
  keyword: string;
  intent: string;
  content_angle: string;
  headline: string;
}

interface ResearchResult {
  topic_summary: string;
  clusters: {
    informational: KeywordEntry[];
    commercial: KeywordEntry[];
    navigational: KeywordEntry[];
  };
}

export async function POST(request: NextRequest) {
  const {
    topic,
    audience,
    results,
    save,
  }: { topic: string; audience?: string; results?: ResearchResult; save?: boolean } =
    await request.json();

  if (!topic?.trim()) {
    return NextResponse.json({ error: "topic is required" }, { status: 400 });
  }

  // Save-only mode: persist pre-computed results without re-running Claude
  if (save && results) {
    try {
      const supabase = createServerClient();
      await supabase.from("keyword_research_runs").insert({
        topic,
        audience: audience?.trim() ?? null,
        results_json: results,
        created_at: new Date().toISOString(),
      });
      return NextResponse.json({ success: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
  }

  try {
    const [volumeData, questionsData, opportunityData] = await Promise.all([
      searchWithTavily(`${topic} keywords SEO content ideas`, {
        searchDepth: "advanced",
        maxResults: 5,
        includeAnswer: true,
      }),
      searchWithTavily(`${topic} questions people ask audience needs`, {
        maxResults: 5,
        includeAnswer: true,
      }),
      searchWithTavily(`${topic} content gaps opportunities what to write`, {
        maxResults: 4,
        includeAnswer: true,
      }),
    ]);

    const audienceNote = audience?.trim() ? `Target Audience: ${audience.trim()}` : "";

    const searchContext = [
      volumeData.answer && `Keyword landscape:\n${volumeData.answer}`,
      questionsData.answer && `Questions people ask:\n${questionsData.answer}`,
      opportunityData.answer && `Content opportunities:\n${opportunityData.answer}`,
      volumeData.results
        .slice(0, 3)
        .map((r) => `- ${r.title}: ${r.content.slice(0, 200)}`)
        .join("\n"),
    ]
      .filter(Boolean)
      .join("\n\n");

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      system: `You are a keyword research and content strategy expert. Generate specific keyword clusters with content angles tailored to the business context provided.

${BUSINESS_CONTEXT}
${audienceNote ? "\n" + audienceNote : ""}

Rules:
- Keywords must be phrases people actually type (3–6 words)
- Intent describes what the searcher actually wants — one short phrase
- Content angles must be specific to this business, not generic SEO advice
- Headlines must be concrete and click-worthy

Organize into 3 intent clusters:
- informational: Educational, how-to, definitional queries
- commercial: Comparison, best-of, tool, and purchase-intent queries
- navigational: Brand or destination queries specific to this niche

Return ONLY valid JSON, no other text:
{
  "topic_summary": "1–2 sentences on the keyword landscape and main opportunity",
  "clusters": {
    "informational": [
      {
        "keyword": "exact keyword phrase",
        "intent": "what the searcher wants",
        "content_angle": "specific angle for this business (1 sentence)",
        "headline": "Specific Headline for This Keyword"
      }
    ],
    "commercial": [...],
    "navigational": [...]
  }
}

Aim for 5–7 keywords per cluster.`,
      messages: [
        {
          role: "user",
          content: `Topic: "${topic}"\n\nSearch data:\n${searchContext}`,
        },
      ],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    const data = extractJsonFromClaude(raw) as ResearchResult | null;

    if (!data?.clusters) {
      return NextResponse.json({ error: "Failed to generate keyword clusters" }, { status: 500 });
    }

    return NextResponse.json({ success: true, result: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
