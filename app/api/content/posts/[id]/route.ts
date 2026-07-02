import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, post: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  try {
    const supabase = createServerClient();
    const update: Record<string, unknown> = {
      ...body,
      updated_at: new Date().toISOString(),
    };

    // Stamp published_at the first time a post moves to "published".
    if (body.status === "published") {
      const { data: existing } = await supabase
        .from("blog_posts")
        .select("published_at")
        .eq("id", id)
        .single();
      if (!existing?.published_at) {
        update.published_at = new Date().toISOString();
      }
    }

    const { data, error } = await supabase
      .from("blog_posts")
      .update(update)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, post: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const supabase = createServerClient();
    const { error } = await supabase.from("blog_posts").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
