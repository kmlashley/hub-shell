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

interface Positioning {
  headline: string;
  description: string;
  audience: string;
  tone: string;
}

interface ContentTheme {
  theme: string;
  frequency: "high" | "medium" | "low";
  example: string;
}

interface CoverageGap {
  gap: string;
  audience_need: string;
  opportunity: string;
}

interface Advantage {
  differentiator: string;
  why_it_matters: string;
}

interface RecommendedMove {
  move: string;
  type: "content" | "offer" | "positioning";
  rationale: string;
}

export interface CompetitiveResult {
  competitor_summary: string;
  positioning: Positioning;
  content_themes: ContentTheme[];
  coverage_gaps: CoverageGap[];
  your_advantage: Advantage[];
  recommended_moves: RecommendedMove[];
}

export async function POST(request: NextRequest) {
  const {
    competitor_name,
    competitor_url,
    results,
    save,
  }: {
    competitor_name: string;
    competitor_url?: string;
    results?: CompetitiveResult;
    save?: boolean;
  } = await request.json();

  if (!competitor_name?.trim()) {
    return NextResponse.json({ error: "competitor_name is required" }, { status: 400 });
  }

  // Save-only mode
  if (save && results) {
    try {
      const supabase = createServerClient();
      await supabase.from("competitive_research_runs").insert({
        competitor_name,
        competitor_url: competitor_url?.trim() ?? null,
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
    // Scrape their site if URL provided (non-fatal)
    let scrapedContent = "";
    if (competitor_url?.trim()) {
      try {
        const raw = await scrapeWithFirecrawl(competitor_url.trim());
        scrapedContent = raw.slice(0, 4000);
      } catch {
        // continue without scraped content
      }
    }

    // Parallel searches for competitor intel
    const [mentionsData, contentData, audienceData] = await Promise.all([
      searchWithTavily(`${competitor_name} review reputation what they teach`, {
        searchDepth: "advanced",
        maxResults: 6,
        includeAnswer: true,
      }),
      searchWithTavily(`${competitor_name} content strategy topics blog newsletter`, {
        maxResults: 5,
        includeAnswer: true,
      }),
      searchWithTavily(`${competitor_name} audience who follows criticism gaps`, {
        maxResults: 4,
        includeAnswer: true,
      }),
    ]);

    const searchContext = [
      mentionsData.answer && `Reputation and mentions:\n${mentionsData.answer}`,
      mentionsData.results
        .slice(0, 4)
        .map((r) => `- ${r.title}: ${r.content.slice(0, 200)}`)
        .join("\n"),
      contentData.answer && `Content and topics:\n${contentData.answer}`,
      audienceData.answer && `Audience and gaps:\n${audienceData.answer}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const scrapedSection = scrapedContent
      ? `\n\nWebsite content (scraped):\n${scrapedContent}`
      : "";

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3500,
      system: `You are a competitive intelligence analyst. Produce a thorough competitive brief on the competitor provided, then identify where the business context below has a differentiated advantage.

${BUSINESS_CONTEXT}

Be specific and honest. If the competitor is stronger in an area, say so — but always find the genuine differentiation opportunities. The goal is an actionable brief, not empty reassurance.

Move types must be one of: "content", "offer", "positioning"
Content theme frequency must be one of: "high", "medium", "low"

Return ONLY valid JSON, no other text:
{
  "competitor_summary": "2–3 sentence overview of who this competitor is and what they're known for",
  "positioning": {
    "headline": "Their core value proposition in 1 sentence (as they would describe themselves)",
    "description": "How they position their work and brand (2–3 sentences)",
    "audience": "Who they primarily serve",
    "tone": "Their content voice and style (1 sentence)"
  },
  "content_themes": [
    {
      "theme": "Topic they cover",
      "frequency": "high",
      "example": "Specific example of content on this theme"
    }
  ],
  "coverage_gaps": [
    {
      "gap": "Topic or angle they don't cover or cover poorly",
      "audience_need": "Why their audience actually needs this",
      "opportunity": "Specific content or angle you could own here"
    }
  ],
  "your_advantage": [
    {
      "differentiator": "Where you are genuinely differentiated from this competitor",
      "why_it_matters": "Why this matters to the audience (1 sentence)"
    }
  ],
  "recommended_moves": [
    {
      "move": "Specific action to take based on this competitive analysis",
      "type": "content",
      "rationale": "Why this move makes strategic sense (1 sentence)"
    }
  ]
}

Aim for: 4–6 content themes, 3–4 coverage gaps, 3–4 advantages, 4–5 recommended moves.`,
      messages: [
        {
          role: "user",
          content: `Competitor: "${competitor_name}"${competitor_url ? `\nURL: ${competitor_url}` : ""}\n\nSearch data:\n${searchContext}${scrapedSection}`,
        },
      ],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    const data = extractJsonFromClaude(raw) as CompetitiveResult | null;

    if (!data?.positioning) {
      return NextResponse.json({ error: "Failed to generate competitive brief" }, { status: 500 });
    }

    return NextResponse.json({ success: true, result: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
