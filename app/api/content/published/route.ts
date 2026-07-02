import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { scrapeWithFirecrawl } from "@/lib/research/api-clients";

export async function GET() {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("published_content")
      .select("*")
      .order("published_at", { ascending: false, nullsFirst: false });

    if (error) throw error;
    return NextResponse.json({ success: true, items: data ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Scrape mode — derive title/excerpt from URL
  if (body.scrape && body.url) {
    try {
      const markdown = await scrapeWithFirecrawl(body.url);
      const firstHeading = markdown.match(/^#\s+(.+)/m)?.[1]?.trim() ?? "";
      const firstPara = markdown
        .replace(/^#.*$/m, "")
        .replace(/\n+/, "\n")
        .trim()
        .slice(0, 300);

      return NextResponse.json({
        success: true,
        scraped: {
          title: firstHeading || new URL(body.url).pathname.split("/").filter(Boolean).pop() || "",
          excerpt: firstPara,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
  }

  // Create mode
  const { title, platform, url, published_at, performance_notes, source_type, excerpt } = body;

  if (!title?.trim() || !url?.trim()) {
    return NextResponse.json({ error: "title and url are required" }, { status: 400 });
  }

  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("published_content")
      .insert({
        title: title.trim(),
        platform: platform?.trim() ?? null,
        url: url.trim(),
        excerpt: excerpt?.trim() ?? null,
        published_at: published_at ?? null,
        performance_notes: performance_notes?.trim() ?? null,
        source_type: source_type?.trim() ?? null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, item: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
