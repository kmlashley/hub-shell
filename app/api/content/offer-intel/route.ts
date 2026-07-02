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

type PriceTier = "low" | "mid" | "high" | "premium";

interface OfferItem {
  name: string;
  creator: string;
  price_point: string;
  price_tier: PriceTier;
  format: string;
  positioning: string;
  what_it_includes: string;
}

interface PositioningPattern {
  pattern: string;
  who_uses_it: string;
  example: string;
}

interface PricingGap {
  price_range: string;
  what_is_missing: string;
  why_the_gap_exists: string;
}

interface DifferentiationOpportunity {
  angle: string;
  positioning: string;
  why_you_could_own_it: string;
}

export interface OfferIntelResult {
  landscape_summary: string;
  offers: OfferItem[];
  positioning_patterns: PositioningPattern[];
  pricing_gaps: PricingGap[];
  differentiation_opportunities: DifferentiationOpportunity[];
}

export async function POST(request: NextRequest) {
  const {
    niche,
    audience,
    competitors,
    results,
    save,
  }: {
    niche: string;
    audience?: string;
    competitors?: string[];
    results?: OfferIntelResult;
    save?: boolean;
  } = await request.json();

  if (!niche?.trim()) {
    return NextResponse.json({ error: "niche is required" }, { status: 400 });
  }

  if (save && results) {
    try {
      const supabase = createServerClient();
      await supabase.from("offer_intel_runs").insert({
        niche: niche.trim(),
        audience: audience?.trim() ?? null,
        competitors_json: competitors ?? [],
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
    // Build competitor search queries
    const competitorList = (competitors ?? []).filter(Boolean);
    const audienceContext = audience ? ` for ${audience}` : "";

    // Parallel searches: landscape, pricing, specific competitors
    const searches: Promise<unknown>[] = [
      searchWithTavily(`best offers courses programs "${niche}"${audienceContext} price`, {
        searchDepth: "advanced",
        maxResults: 8,
        includeAnswer: true,
      }),
      searchWithTavily(`"${niche}" online course membership coaching price range what's included`, {
        maxResults: 6,
        includeAnswer: true,
      }),
      searchWithTavily(`"${niche}" market gap underserved audience what's missing offer`, {
        maxResults: 5,
        includeAnswer: true,
      }),
    ];

    // Scrape any specific competitor pages provided
    const scrapePromises = competitorList.slice(0, 3).map((c) => {
      const url = c.startsWith("http") ? c : `https://${c}`;
      return scrapeWithFirecrawl(url).catch(() => "");
    });

    const [landscapeData, pricingData, gapData, ...scrapedPages] = await Promise.all([
      ...searches,
      ...scrapePromises,
    ]) as [
      Awaited<ReturnType<typeof searchWithTavily>>,
      Awaited<ReturnType<typeof searchWithTavily>>,
      Awaited<ReturnType<typeof searchWithTavily>>,
      ...string[]
    ];

    const searchContext = [
      landscapeData.answer && `Offer landscape:\n${landscapeData.answer}`,
      landscapeData.results
        .slice(0, 4)
        .map((r) => `- ${r.title}: ${r.content.slice(0, 200)}`)
        .join("\n"),
      pricingData.answer && `Pricing patterns:\n${pricingData.answer}`,
      gapData.answer && `Market gaps:\n${gapData.answer}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const scrapedSection = scrapedPages
      .filter(Boolean)
      .map((content, i) => `Competitor ${i + 1} page:\n${(content as string).slice(0, 2000)}`)
      .join("\n\n---\n\n");

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      system: `You are an offer strategy analyst. Map the competitive offer landscape for this niche, identify pricing and positioning gaps, and surface specific differentiation opportunities.

${BUSINESS_CONTEXT}

Price tiers:
- "low": under $100 (templates, mini-courses, guides)
- "mid": $100–$999 (courses, workshops, small groups)
- "high": $1,000–$4,999 (programs, mastermind access, coaching packages)
- "premium": $5,000+ (done-for-you, high-touch coaching, retainers)

Return ONLY valid JSON, no other text:
{
  "landscape_summary": "2–3 sentence overview of the competitive offer landscape in this niche — who dominates, what they sell, and what the market currently looks like",
  "offers": [
    {
      "name": "Offer name or type",
      "creator": "Creator or company name (or 'Multiple creators' for common offer types)",
      "price_point": "Specific price or range (e.g. '$497', '$97–$197')",
      "price_tier": "mid",
      "format": "Course / Membership / Coaching / Template / Community / Done-for-You / etc.",
      "positioning": "How they describe their offer in 1 sentence",
      "what_it_includes": "Core deliverables in 1 sentence"
    }
  ],
  "positioning_patterns": [
    {
      "pattern": "A recurring way competitors position their offers (e.g. 'Speed positioning — promise results in X days/weeks')",
      "who_uses_it": "Who tends to use this pattern",
      "example": "Specific example of this pattern in action"
    }
  ],
  "pricing_gaps": [
    {
      "price_range": "The price range that is underserved (e.g. '$200–$500')",
      "what_is_missing": "What type of offer doesn't exist at this price point",
      "why_the_gap_exists": "Why no one has filled this gap yet"
    }
  ],
  "differentiation_opportunities": [
    {
      "angle": "A specific positioning angle no one owns in this space",
      "positioning": "How you would describe an offer built around this angle (1–2 sentences)",
      "why_you_could_own_it": "Why this angle is defensible and suited to the business context above"
    }
  ]
}

Aim for: 5–8 offers, 3–4 positioning patterns, 2–3 pricing gaps, 3–4 differentiation opportunities.`,
      messages: [
        {
          role: "user",
          content: `Niche: "${niche}"
${audience ? `Target audience: "${audience}"` : ""}
${competitorList.length > 0 ? `Specific competitors to include: ${competitorList.join(", ")}` : ""}

Search data:
${searchContext}

${scrapedSection ? `Competitor pages:\n${scrapedSection}` : ""}`,
        },
      ],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    const data = extractJsonFromClaude(raw) as OfferIntelResult | null;

    if (!data?.landscape_summary) {
      return NextResponse.json({ error: "Failed to map offer landscape" }, { status: 500 });
    }

    return NextResponse.json({ success: true, result: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
