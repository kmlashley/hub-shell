import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase-server";
import { scrapeWithFirecrawl, extractJsonFromClaude } from "@/lib/research/api-clients";

export const maxDuration = 120;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface ScrapedPost {
  title: string;
  url: string;
  excerpt: string;
  published_at: string | null;
}

async function scrapeSource(sourceId: string, publicationUrl: string, publicationName: string) {
  const supabase = createServerClient();

  // Scrape the publication's main page
  const markdown = await scrapeWithFirecrawl(publicationUrl);

  // Ask Claude to extract the post list
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    system: `You extract structured post data from scraped Substack publication pages.
Return ONLY valid JSON — no other text.
{
  "posts": [
    {
      "title": "exact post title",
      "url": "full URL to the post",
      "excerpt": "excerpt or description, 1-2 sentences max",
      "published_at": "ISO date string if found, otherwise null"
    }
  ]
}
Rules:
- Only include actual posts (not about pages, archive links, or nav items)
- If a URL is relative (starts with /), prepend the publication base URL
- Limit to the 15 most recent posts
- If no posts are found, return { "posts": [] }`,
    messages: [
      {
        role: "user",
        content: `Publication: ${publicationName} (${publicationUrl})\n\nScraped content:\n${markdown.slice(0, 12000)}`,
      },
    ],
  });

  const raw = response.content[0].type === "text" ? response.content[0].text : "";
  const data = extractJsonFromClaude(raw) as { posts?: ScrapedPost[] } | null;
  const posts = data?.posts ?? [];

  if (posts.length === 0) return { added: 0, sourceId };

  // Get existing URLs for this source to avoid duplicates
  const { data: existing } = await supabase
    .from("feed_items")
    .select("url")
    .eq("source_id", sourceId);

  const existingUrls = new Set((existing ?? []).map((e) => e.url));
  const newPosts = posts.filter((p) => p.url && !existingUrls.has(p.url));

  if (newPosts.length === 0) return { added: 0, sourceId };

  // Insert new items
  const { error } = await supabase.from("feed_items").insert(
    newPosts.map((p) => ({
      source_id: sourceId,
      title: p.title,
      url: p.url,
      excerpt: p.excerpt ?? null,
      published_at: p.published_at ?? null,
      created_at: new Date().toISOString(),
    }))
  );

  if (error) throw error;

  // Update last_scraped_at on the source
  await supabase
    .from("feed_sources")
    .update({ last_scraped_at: new Date().toISOString() })
    .eq("id", sourceId);

  return { added: newPosts.length, sourceId };
}

export async function POST(request: NextRequest) {
  try {
    const { source_id } = await request.json();
    const supabase = createServerClient();

    let sources;
    if (source_id) {
      const { data, error } = await supabase
        .from("feed_sources")
        .select("*")
        .eq("id", source_id)
        .single();
      if (error) throw error;
      sources = [data];
    } else {
      const { data, error } = await supabase
        .from("feed_sources")
        .select("*")
        .eq("active", true);
      if (error) throw error;
      sources = data ?? [];
    }

    if (sources.length === 0) {
      return NextResponse.json({ success: true, results: [], message: "No active sources to scrape" });
    }

    const results = [];
    for (const source of sources) {
      try {
        const result = await scrapeSource(source.id, source.publication_url, source.publication_name);
        results.push({ ...result, name: source.publication_name, success: true });
      } catch (e) {
        results.push({
          sourceId: source.id,
          name: source.publication_name,
          success: false,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    const totalAdded = results.reduce((sum, r) => sum + (r.added ?? 0), 0);
    return NextResponse.json({ success: true, results, totalAdded });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
