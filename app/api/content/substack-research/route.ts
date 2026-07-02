import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase-server";
import {
  searchWithTavily,
  scrapeWithFirecrawl,
  extractJsonFromClaude,
} from "@/lib/research/api-clients";

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface PostType {
  type: string;
  description: string;
  example_titles: string[];
  why_it_works: string;
}

interface EngagementPattern {
  pattern: string;
  signal: "notes" | "shares" | "comments" | "general";
  example: string;
}

interface ContentGap {
  gap: string;
  audience_need: string;
  your_opportunity: string;
}

interface NotesPattern {
  pattern: string;
  frequency: "frequent" | "occasional" | "rare";
}

export interface SubstackResult {
  publication_name: string;
  topic: string;
  tone: string;
  cadence: string;
  publication_summary: string;
  top_post_types: PostType[];
  engagement_patterns: EngagementPattern[];
  content_gaps: ContentGap[];
  notes_patterns: NotesPattern[];
}

export async function POST(request: NextRequest) {
  const {
    publication_url,
    results,
    save,
  }: {
    publication_url: string;
    results?: SubstackResult;
    save?: boolean;
  } = await request.json();

  if (!publication_url?.trim()) {
    return NextResponse.json({ error: "publication_url is required" }, { status: 400 });
  }

  const cleanUrl = publication_url.trim().replace(/\/$/, "");

  if (save && results) {
    try {
      const supabase = createServerClient();
      await supabase.from("substack_research_runs").insert({
        publication_url: cleanUrl,
        publication_name: results.publication_name,
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
    // Scrape the main page and archive in parallel (non-fatal)
    const [mainContent, archiveContent, notesContent] = await Promise.allSettled([
      scrapeWithFirecrawl(cleanUrl),
      scrapeWithFirecrawl(`${cleanUrl}/archive`),
      scrapeWithFirecrawl(`${cleanUrl}/notes`),
    ]);

    const scraped = [
      mainContent.status === "fulfilled" ? mainContent.value.slice(0, 3000) : "",
      archiveContent.status === "fulfilled" ? archiveContent.value.slice(0, 3000) : "",
      notesContent.status === "fulfilled" ? notesContent.value.slice(0, 2000) : "",
    ].filter(Boolean).join("\n\n---\n\n");

    // Search for this publication's reputation and content themes
    const publicationHandle = cleanUrl.replace(/https?:\/\//, "").replace(/\.substack\.com.*/, "");
    const [reputationData, audienceData] = await Promise.all([
      searchWithTavily(`${publicationHandle} Substack newsletter content topics`, {
        searchDepth: "advanced",
        maxResults: 6,
        includeAnswer: true,
      }),
      searchWithTavily(`${publicationHandle} Substack audience readers what they discuss`, {
        maxResults: 4,
        includeAnswer: true,
      }),
    ]);

    const searchContext = [
      reputationData.answer && `Publication overview:\n${reputationData.answer}`,
      reputationData.results
        .slice(0, 4)
        .map((r) => `- ${r.title}: ${r.content.slice(0, 200)}`)
        .join("\n"),
      audienceData.answer && `Audience signals:\n${audienceData.answer}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3500,
      system: `You are a content intelligence analyst specializing in Substack publications. Analyze the publication and produce a structured research brief that identifies content patterns, engagement signals, and competitive gaps.

Notes on signals:
- "notes" signal = content that generates Substack Notes activity (short, punchy, reactable)
- "shares" signal = content that spreads (strong perspective, useful frameworks, hot takes)
- "comments" signal = content that sparks discussion (questions, controversial positions, community topics)

Return ONLY valid JSON, no other text:
{
  "publication_name": "Name of the Substack",
  "topic": "Primary topic/niche in 1 sentence",
  "tone": "Voice and writing style in 1 sentence",
  "cadence": "How often they publish (e.g. 'Weekly long-form + daily notes')",
  "publication_summary": "2–3 sentence overview of what this publication is, who it serves, and why people subscribe",
  "top_post_types": [
    {
      "type": "Post type name (e.g. 'Deep Dive Analysis', 'Tool Roundup', 'Personal Essay')",
      "description": "What these posts do and why they resonate",
      "example_titles": ["Example title 1", "Example title 2"],
      "why_it_works": "The psychological or strategic reason this format performs well"
    }
  ],
  "engagement_patterns": [
    {
      "pattern": "What type of content drives engagement",
      "signal": "notes",
      "example": "Specific example or observation"
    }
  ],
  "content_gaps": [
    {
      "gap": "Topic or angle they don't cover or cover poorly",
      "audience_need": "Why their readers actually need this",
      "your_opportunity": "Specific angle you could own that they're leaving uncovered"
    }
  ],
  "notes_patterns": [
    {
      "pattern": "What kinds of Notes they post (topics, format, length, style)",
      "frequency": "frequent"
    }
  ]
}

Aim for: 3–5 post types, 4–6 engagement patterns, 3–4 content gaps, 2–4 notes patterns.
If the notes page was not accessible, infer from the main content what their Notes strategy likely is.`,
      messages: [
        {
          role: "user",
          content: `Publication URL: ${cleanUrl}\n\nScraped content:\n${scraped || "(not available)"}\n\nSearch data:\n${searchContext || "(not available)"}`,
        },
      ],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    const data = extractJsonFromClaude(raw) as SubstackResult | null;

    if (!data?.publication_summary) {
      return NextResponse.json({ error: "Failed to analyze publication" }, { status: 500 });
    }

    return NextResponse.json({ success: true, result: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
