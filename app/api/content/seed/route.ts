import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  const {
    title,
    content,
    status,
    primary_keyword,
    tags,
  }: {
    title: string;
    content: string;
    status?: "draft" | "published";
    primary_keyword?: string;
    tags?: string[];
  } = await request.json();

  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: "title and content are required" }, { status: 400 });
  }

  const supabase = createServerClient();
  const resolvedStatus = status === "published" ? "published" : "draft";

  const { data: post, error } = await supabase
    .from("blog_posts")
    .insert({
      title,
      content,
      status: resolvedStatus,
      primary_keyword: primary_keyword || null,
      tags: tags && tags.length > 0 ? tags : null,
      published_at: resolvedStatus === "published" ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, post });
}
