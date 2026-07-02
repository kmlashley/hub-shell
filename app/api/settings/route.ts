import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

// GET — read all settings from hub_settings table
export async function GET() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("hub_settings")
    .select("key, value");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const settings = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
  return NextResponse.json({ settings });
}

// POST — upsert key-value pairs into hub_settings
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const rows = Object.entries(body as Record<string, unknown>)
    .filter(([, v]) => typeof v === "string")
    .map(([key, value]) => ({
      key,
      value: value as string,
      updated_at: new Date().toISOString(),
    }));

  if (rows.length === 0) {
    return NextResponse.json({ ok: true });
  }

  const supabase = createServerClient();
  const { error } = await supabase
    .from("hub_settings")
    .upsert(rows, { onConflict: "key" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
