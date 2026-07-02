import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sourceId = searchParams.get("source_id");
  const unreadOnly = searchParams.get("unread") === "true";

  try {
    const supabase = createServerClient();
    let query = supabase
      .from("feed_items")
      .select("*, feed_sources(publication_name, publication_url)")
      .order("published_at", { ascending: false })
      .limit(100);

    if (sourceId) query = query.eq("source_id", sourceId);
    if (unreadOnly) query = query.is("read_at", null);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ success: true, items: data ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
