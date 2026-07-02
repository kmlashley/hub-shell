import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase-server";
import { scrapeWithFirecrawl, extractJsonFromClaude } from "@/lib/research/api-clients";

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface PublishedPage {
  title: string;
  url: string;
  excerpt?: string | null;
}

export interface LinkSuggestion {
  phrase: string;
  url: string;
  page_title: string;
  reason: string;
  context: string;
}

export interface InternalLinkerResult {
  suggestions: LinkSuggestion[];
  draft_with_links: string;
  pages_used: number;
  source: "library" | "scraped";
}

export async function POST(request: NextRequest) {
  const {
    draft,
    website_url,
  }: {
    draft: string;
    website_url?: string;
  } = await request.json();

  if (!draft?.trim()) {
    return NextResponse.json({ error: "draft is required" }, { status: 400 });
  }

  try {
    const supabase = createServerClient();
    let pages: PublishedPage[] = [];
    let source: "library" | "scraped" = "library";

    // Try to load from published_content table first
    const { data: dbPages } = await supabase
      .from("published_content")
      .select("title, url, excerpt")
      .order("published_at", { ascending: false })
      .limit(100);

    if (dbPages && dbPages.length > 0) {
      pages = dbPages;
    } else if (website_url?.trim()) {
      // Fall back to scraping the website
      source = "scraped";
      try {
        const scraped = await scrapeWithFirecrawl(website_url.trim());
        // Extract URLs and titles from scraped content
        const urlMatches = scraped.matchAll(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g);
        const seen = new Set<string>();
        for (const match of urlMatches) {
          const title = match[1].trim();
          const url = match[2].trim();
          if (!seen.has(url) && title.length > 3) {
            seen.add(url);
            pages.push({ title, url });
          }
        }
        // Limit to 50 pages
        pages = pages.slice(0, 50);
      } catch {
        // Continue with empty pages list — Claude will still suggest structure
      }
    }

    const pageList =
      pages.length > 0
        ? pages
            .map((p) => `- "${p.title}" → ${p.url}${p.excerpt ? ` (${p.excerpt.slice(0, 100)})` : ""}`)
            .join("\n")
        : "(No published content library found — suggest structural linking opportunities only)";

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      system: `You are an internal linking specialist. Your job is to analyze a piece of content and identify the best opportunities to add internal links that improve SEO and reader experience.

Rules:
- Only suggest links to pages that exist in the provided library
- Each phrase should appear verbatim in the draft
- Prioritize links that are genuinely relevant, not just keyword matches
- Don't over-link — 3–6 suggestions is ideal, max 8
- The "context" field should be the sentence or phrase the link appears in (verbatim from the draft)
- The "draft_with_links" should be the full original draft with markdown links inserted at the suggested locations. Replace each phrase with [phrase](url).
- If no good matches exist, return fewer suggestions rather than forcing irrelevant ones

Return ONLY valid JSON, no other text:
{
  "suggestions": [
    {
      "phrase": "exact phrase from the draft to turn into a link",
      "url": "https://...",
      "page_title": "Title of the page being linked to",
      "reason": "Why this link adds value for the reader (1 sentence)",
      "context": "The sentence from the draft where this phrase appears"
    }
  ],
  "draft_with_links": "The full draft with markdown links inserted"
}`,
      messages: [
        {
          role: "user",
          content: `Draft to analyze:
---
${draft.trim()}
---

Published content library:
${pageList}`,
        },
      ],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    const data = extractJsonFromClaude(raw) as {
      suggestions: LinkSuggestion[];
      draft_with_links: string;
    } | null;

    if (!data?.suggestions) {
      return NextResponse.json({ error: "Failed to generate link suggestions" }, { status: 500 });
    }

    const result: InternalLinkerResult = {
      suggestions: data.suggestions,
      draft_with_links: data.draft_with_links ?? draft,
      pages_used: pages.length,
      source,
    };

    return NextResponse.json({ success: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
