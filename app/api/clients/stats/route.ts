import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("projects")
    .select("client_id, status")
    .not("client_id", "is", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Build a map: client_id → { total, active }
  const stats: Record<string, { total: number; active: number }> = {};
  for (const row of data ?? []) {
    const id = row.client_id as string;
    if (!stats[id]) stats[id] = { total: 0, active: 0 };
    stats[id].total++;
    if (row.status === "active") stats[id].active++;
  }

  return NextResponse.json({ stats });
}
