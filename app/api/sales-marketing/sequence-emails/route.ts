import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sequenceId = searchParams.get("sequence_id");
  if (!sequenceId) return NextResponse.json({ error: "sequence_id is required" }, { status: 400 });

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("sequence_emails")
    .select("*")
    .eq("sequence_id", sequenceId)
    .order("position", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ emails: data ?? [] });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.sequence_id || !body?.subject) {
    return NextResponse.json({ error: "sequence_id and subject are required" }, { status: 400 });
  }

  const supabase = createServerClient();

  // Auto-set position to next in sequence
  const { count } = await supabase
    .from("sequence_emails")
    .select("id", { count: "exact", head: true })
    .eq("sequence_id", body.sequence_id);

  const { data, error } = await supabase
    .from("sequence_emails")
    .insert({
      sequence_id: body.sequence_id,
      position: body.position ?? (count ?? 0) + 1,
      subject: body.subject.trim(),
      status: body.status ?? "active",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ email: data }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.id || !body?.subject) {
    return NextResponse.json({ error: "id and subject are required" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("sequence_emails")
    .update({
      subject: body.subject.trim(),
      status: body.status ?? "active",
      position: body.position,
    })
    .eq("id", body.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ email: data });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const supabase = createServerClient();
  const { error } = await supabase.from("sequence_emails").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
