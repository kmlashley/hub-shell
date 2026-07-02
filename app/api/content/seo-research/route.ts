import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase-server";
import {
  searchWithTavily,
  scrapeWithFirecrawl,
  extractJsonFromClaude,
} from "@/lib/research/api-clients";
import { BUSINESS_CONTEXT } from "@/lib/research/context";

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface RankingItem {
  title: string;
  url: string;
  why_ranking: string;
  takeaway: string;
}

interface GapItem {
  gap: string;
  why_it_matters: string;
  content_idea: string;
}

interface KeywordItem {
  keyword: string;
  intent: string;
  difficulty: "low" | "medium" | "high";
  angle: string;
}

interface QuickWin {
  action: string;
  impact: string;
  effort: "low" | "medium" | "high";
}

interface SeoResult {
  query_summary: string;
  tabs: {
    top_ranking: RankingItem[];
    content_gaps: GapItem[];
    keyword_opportunities: KeywordItem[];
    quick_wins: QuickWin[];
  };
}

function isUrl(str: string): boolean {
  return /^https?:\/\//i.test(str.trim());
}

export async function POST(request: NextRequest) {
  const {
    query,
    results,
    save,
  }: { query: string; results?: SeoResult; save?: boolean } = await request.json();

  if (!query?.trim()) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  // Save-only mode
  if (save && results) {
    try {
      const supabase = createServerClient();
      await supabase.from("seo_research_runs").insert({
        query,
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
    const queryIsUrl = isUrl(query);
    const searchTopic = queryIsUrl
      ? new URL(query.trim()).hostname.replace(/^www\./, "")
      : query.trim();

    // Scrape the URL if provided (non-fatal)
    let scrapedContent = "";
    if (queryIsUrl) {
      try {
        const raw = await scrapeWithFirecrawl(query.trim());
        scrapedContent = raw.slice(0, 3000);
      } catch {
        // continue without scraped content
      }
    }

    // Parallel searches
    const [serpData, questionsData, gapsData] = await Promise.all([
      searchWithTavily(`${searchTopic} top ranking content SEO`, {
        searchDepth: "advanced",
        maxResults: 6,
        includeAnswer: true,
      }),
      searchWithTavily(`${searchTopic} questions people ask audience pain points`, {
        maxResults: 5,
        includeAnswer: true,
      }),
      searchWithTavily(`${searchTopic} content gaps missing what to write`, {
        maxResults: 4,
        includeAnswer: true,
      }),
    ]);

    const topRankingContext = [
      serpData.answer && `SERP overview: ${serpData.answer}`,
      serpData.results
        .map((r) => `- ${r.title} (${r.url}): ${r.content.slice(0, 200)}`)
        .join("\n"),
    ]
      .filter(Boolean)
      .join("\n\n");

    const gapsContext = [
      questionsData.answer && `Questions people ask: ${questionsData.answer}`,
      gapsData.answer && `Content gaps: ${gapsData.answer}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const scrapedSection = scrapedContent
      ? `\n\nCurrent page content (scraped):\n${scrapedContent}`
      : "";

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3500,
      system: `You are an SEO strategist. Analyze the search data and produce a structured SEO research report for the business context provided.

${BUSINESS_CONTEXT}

Produce 4 analysis sections:
1. top_ranking — What's currently winning in the SERPs and why (use the actual URLs from the search data)
2. content_gaps — What audiences need that isn't being covered well
3. keyword_opportunities — Specific keywords to target, with difficulty estimates
4. quick_wins — Concrete actions ranked by effort (low/medium/high)

Difficulty and effort must be one of: "low", "medium", "high"

Return ONLY valid JSON, no other text:
{
  "query_summary": "2–3 sentence overview of the SEO landscape and main opportunity",
  "tabs": {
    "top_ranking": [
      {
        "title": "Content title",
        "url": "https://...",
        "why_ranking": "Why this piece is winning (1 sentence)",
        "takeaway": "What you should steal or do differently (1 sentence)"
      }
    ],
    "content_gaps": [
      {
        "gap": "The missing topic or angle",
        "why_it_matters": "Why the audience needs this (1 sentence)",
        "content_idea": "Specific piece to create (1 sentence)"
      }
    ],
    "keyword_opportunities": [
      {
        "keyword": "exact keyword phrase",
        "intent": "what searcher wants",
        "difficulty": "low",
        "angle": "specific angle for this business (1 sentence)"
      }
    ],
    "quick_wins": [
      {
        "action": "Specific action to take",
        "impact": "Expected result (1 sentence)",
        "effort": "low"
      }
    ]
  }
}

Aim for 4–6 items per section. Be specific — real URLs, real keyword phrases, concrete actions.`,
      messages: [
        {
          role: "user",
          content: `Query: "${query}"\n\nTop ranking content:\n${topRankingContext}\n\nGaps and questions:\n${gapsContext}${scrapedSection}`,
        },
      ],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    const data = extractJsonFromClaude(raw) as SeoResult | null;

    if (!data?.tabs) {
      return NextResponse.json({ error: "Failed to generate SEO analysis" }, { status: 500 });
    }

    return NextResponse.json({ success: true, result: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
