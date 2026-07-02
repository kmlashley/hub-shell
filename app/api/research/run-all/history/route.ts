import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("agent_workflow_runs")
    .select("id, workflow_name, triggered_by, status, started_at, duration_ms, notes")
    .order("started_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ runs: data ?? [] });
}
