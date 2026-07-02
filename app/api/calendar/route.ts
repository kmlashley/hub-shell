import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year");
  const month = searchParams.get("month");

  const supabase = createServerClient();
  let query = supabase
    .from("calendar_items")
    .select("*")
    .order("scheduled_date", { ascending: true });

  if (year && month) {
    const from = `${year}-${month.padStart(2, "0")}-01`;
    const d = new Date(Number(year), Number(month), 0);
    const to = `${year}-${month.padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    query = query.gte("scheduled_date", from).lte("scheduled_date", to);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.title?.trim() || !body?.scheduled_date) {
    return NextResponse.json({ error: "title and scheduled_date are required" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("calendar_items")
    .insert({
      title: body.title.trim(),
      platform: body.platform ?? "other",
      status: body.status ?? "idea",
      scheduled_date: body.scheduled_date,
      url: body.url?.trim() || null,
      notes: body.notes?.trim() || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("calendar_items")
    .update({
      title: body.title?.trim(),
      platform: body.platform,
      status: body.status,
      scheduled_date: body.scheduled_date,
      url: body.url?.trim() || null,
      notes: body.notes?.trim() || null,
    })
    .eq("id", body.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const supabase = createServerClient();
  const { error } = await supabase.from("calendar_items").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
