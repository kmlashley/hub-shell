import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase-server";
import { searchWithTavily, extractJsonFromClaude } from "@/lib/research/api-clients";
import { BUSINESS_CONTEXT } from "@/lib/research/context";

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface EngineResult {
  score: number;
  description: string;
  evidence: string;
}

interface Gap {
  topic: string;
  competitor_appearing: string;
  why_you_dont_appear: string;
}

interface Fix {
  action: string;
  priority: "high" | "medium" | "low";
  type: "content" | "technical" | "distribution";
}

export interface AeoResult {
  overall_score: number;
  analysis_summary: string;
  engines: {
    chatgpt: EngineResult;
    perplexity: EngineResult;
    claude: EngineResult;
    google_sge: EngineResult;
  };
  gaps: Gap[];
  fixes: Fix[];
}

export async function POST(request: NextRequest) {
  const {
    brand_name,
    niche,
    keywords,
    results,
    save,
  }: {
    brand_name: string;
    niche: string;
    keywords: string[];
    results?: AeoResult;
    save?: boolean;
  } = await request.json();

  if (!brand_name?.trim() || !niche?.trim()) {
    return NextResponse.json({ error: "brand_name and niche are required" }, { status: 400 });
  }

  // Save-only mode
  if (save && results) {
    try {
      const supabase = createServerClient();
      await supabase.from("aeo_audit_runs").insert({
        brand_name,
        niche,
        keywords_json: keywords ?? [],
        results_json: results,
        visibility_scores_json: {
          overall: results.overall_score,
          chatgpt: results.engines.chatgpt.score,
          perplexity: results.engines.perplexity.score,
          claude: results.engines.claude.score,
          google_sge: results.engines.google_sge.score,
        },
        created_at: new Date().toISOString(),
      });
      return NextResponse.json({ success: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
  }

  try {
    const keywordList = (keywords ?? []).filter(Boolean);
    const keywordStr = keywordList.join(", ");

    // Search queries that mirror what AI engines answer
    const searches = await Promise.all([
      searchWithTavily(`best ${niche} experts to follow`, {
        searchDepth: "advanced",
        maxResults: 7,
        includeAnswer: true,
      }),
      searchWithTavily(`top ${niche} resources recommendations`, {
        maxResults: 5,
        includeAnswer: true,
      }),
      searchWithTavily(`${brand_name} ${niche}`, {
        maxResults: 5,
        includeAnswer: true,
      }),
      ...(keywordList.slice(0, 2).map((kw) =>
        searchWithTavily(`best ${kw} advice expert`, {
          maxResults: 4,
          includeAnswer: true,
        })
      )),
    ]);

    const [expertsSearch, resourcesSearch, brandSearch, ...keywordSearches] = searches;

    const brandMentionedInExperts = expertsSearch.results.some(
      (r) =>
        r.title.toLowerCase().includes(brand_name.toLowerCase()) ||
        r.content.toLowerCase().includes(brand_name.toLowerCase())
    );
    const brandMentionedInBrand = brandSearch.results.some(
      (r) =>
        r.title.toLowerCase().includes(brand_name.toLowerCase()) ||
        r.content.toLowerCase().includes(brand_name.toLowerCase())
    );

    const competitorsInExperts = expertsSearch.results
      .slice(0, 5)
      .map((r) => r.title)
      .join("; ");

    const searchContext = [
      `Query "best ${niche} experts to follow":\nAnswer: ${expertsSearch.answer ?? "No answer"}\nTop results: ${expertsSearch.results
        .slice(0, 4)
        .map((r) => `${r.title} (${r.url})`)
        .join(", ")}`,
      `Query "top ${niche} resources":\nAnswer: ${resourcesSearch.answer ?? "No answer"}`,
      `Query "${brand_name} ${niche}":\nAnswer: ${brandSearch.answer ?? "No answer"}\nResults found: ${brandMentionedInBrand ? "Yes, brand appears" : "No brand mentions found"}`,
      `Brand mentioned in expert lists: ${brandMentionedInExperts ? "Yes" : "No"}`,
      `Competitors appearing in expert searches: ${competitorsInExperts}`,
      keywordSearches.length > 0
        ? `Keyword searches:\n${keywordSearches
            .map(
              (s, i) =>
                `"${keywordList[i]}": ${s.answer ?? "No answer"} | Brand appears: ${s.results.some((r) => r.content.toLowerCase().includes(brand_name.toLowerCase())) ? "Yes" : "No"}`
            )
            .join("\n")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      system: `You are an AI visibility (AEO/GEO) analyst. Based on web search data that mirrors what AI engines train on and surface in answers, assess how visible this brand is across AI search engines.

${BUSINESS_CONTEXT}

Brand: ${brand_name}
Niche: ${niche}
Target Keywords: ${keywordStr || "not specified"}

AI engines to assess: ChatGPT, Perplexity, Claude, Google SGE

Scores are 0–10:
- 0–3: Not visible — brand not appearing in relevant searches
- 4–6: Partial visibility — brand appears in some searches but not consistently recommended
- 7–10: Strong visibility — brand regularly surfaces in relevant AI answers

For each engine, give a realistic description of what that engine would say if asked "who should I follow for ${niche}?" — based on the search data showing what content the web indexes about this brand.

Return ONLY valid JSON, no other text:
{
  "overall_score": number (0-10),
  "analysis_summary": "2-3 sentence overview of visibility status and main opportunity",
  "engines": {
    "chatgpt": {
      "score": number,
      "description": "What ChatGPT would likely say about this brand when asked about ${niche}",
      "evidence": "Why this score — what the search data shows (1 sentence)"
    },
    "perplexity": {
      "score": number,
      "description": "What Perplexity would likely say",
      "evidence": "Why this score (1 sentence)"
    },
    "claude": {
      "score": number,
      "description": "What Claude would likely say",
      "evidence": "Why this score (1 sentence)"
    },
    "google_sge": {
      "score": number,
      "description": "What Google's AI Overview would likely feature",
      "evidence": "Why this score (1 sentence)"
    }
  },
  "gaps": [
    {
      "topic": "Topic or query where brand doesn't appear",
      "competitor_appearing": "Who appears instead",
      "why_you_dont_appear": "Root cause — what content is missing (1 sentence)"
    }
  ],
  "fixes": [
    {
      "action": "Specific piece of content or action to take",
      "priority": "high",
      "type": "content"
    }
  ]
}

Aim for 3–4 gaps and 5–6 fixes. Fixes type must be one of: content, technical, distribution. Priority must be: high, medium, or low.`,
      messages: [
        {
          role: "user",
          content: `Brand: "${brand_name}"\nNiche: "${niche}"\nKeywords: "${keywordStr}"\n\nSearch data:\n${searchContext}`,
        },
      ],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    const data = extractJsonFromClaude(raw) as AeoResult | null;

    if (!data?.engines) {
      return NextResponse.json({ error: "Failed to generate visibility audit" }, { status: 500 });
    }

    return NextResponse.json({ success: true, result: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
