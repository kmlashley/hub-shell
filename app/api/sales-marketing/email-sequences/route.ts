import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("email_sequences")
    .select("*, sequence_emails(id)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const sequences = (data ?? []).map((s) => ({
    ...s,
    email_count: Array.isArray(s.sequence_emails) ? s.sequence_emails.length : 0,
    sequence_emails: undefined,
  }));

  return NextResponse.json({ sequences });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("email_sequences")
    .insert({
      name: body.name.trim(),
      trigger: body.trigger?.trim() || null,
      status: body.status ?? "active",
      notes: body.notes?.trim() || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sequence: data }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.id || !body?.name) {
    return NextResponse.json({ error: "id and name are required" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("email_sequences")
    .update({
      name: body.name.trim(),
      trigger: body.trigger?.trim() || null,
      status: body.status ?? "active",
      notes: body.notes?.trim() || null,
    })
    .eq("id", body.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sequence: data });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const supabase = createServerClient();
  const { error } = await supabase.from("email_sequences").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
