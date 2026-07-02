import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const funnelId = searchParams.get("funnel_id");
  if (!funnelId) return NextResponse.json({ error: "funnel_id is required" }, { status: 400 });

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("funnel_stages")
    .select("*")
    .eq("funnel_id", funnelId)
    .order("position", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ stages: data ?? [] });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.funnel_id || !body?.name) {
    return NextResponse.json({ error: "funnel_id and name are required" }, { status: 400 });
  }

  const supabase = createServerClient();

  const { count } = await supabase
    .from("funnel_stages")
    .select("id", { count: "exact", head: true })
    .eq("funnel_id", body.funnel_id);

  const { data, error } = await supabase
    .from("funnel_stages")
    .insert({
      funnel_id: body.funnel_id,
      name: body.name.trim(),
      position: body.position ?? (count ?? 0) + 1,
      source: body.source?.trim() || null,
      action: body.action?.trim() || null,
      notes: body.notes?.trim() || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ stage: data }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.id || !body?.name) {
    return NextResponse.json({ error: "id and name are required" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("funnel_stages")
    .update({
      name: body.name.trim(),
      position: body.position,
      source: body.source?.trim() || null,
      action: body.action?.trim() || null,
      notes: body.notes?.trim() || null,
    })
    .eq("id", body.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ stage: data });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const supabase = createServerClient();
  const { error } = await supabase.from("funnel_stages").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
