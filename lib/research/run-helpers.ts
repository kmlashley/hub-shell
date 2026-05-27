import type { SupabaseClient } from "@supabase/supabase-js";

export type WorkflowTrigger = "vercel_cron" | "manual";

// ─── Workflow Run Tracking ────────────────────────────────────────────────────

export async function createResearchRun(
  supabase: SupabaseClient,
  workflowName: string,
  triggeredBy: WorkflowTrigger
): Promise<string> {
  const { data, error } = await supabase
    .from("agent_workflow_runs")
    .insert({
      workflow_name: workflowName,
      triggered_by: triggeredBy,
      status: "running",
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(`Failed to create workflow run: ${error?.message}`);
  return data.id as string;
}

export async function completeResearchRun(
  supabase: SupabaseClient,
  runId: string,
  status: "completed" | "failed",
  durationMs: number,
  notes?: string
): Promise<void> {
  await supabase
    .from("agent_workflow_runs")
    .update({
      status,
      duration_ms: durationMs,
      completed_at: new Date().toISOString(),
      notes: notes ?? null,
    })
    .eq("id", runId);
}

// ─── Research Report Storage ──────────────────────────────────────────────────

// Upserts a research report — updates if one already exists for this slug+type,
// inserts new otherwise.
export async function saveReport(
  supabase: SupabaseClient,
  type: string,
  slug: string,
  data: Record<string, unknown>
): Promise<void> {
  const { data: existing } = await supabase
    .from("research_reports")
    .select("id")
    .eq("type", type)
    .eq("slug", slug)
    .limit(1);

  let error;
  if (existing && existing.length > 0) {
    ({ error } = await supabase
      .from("research_reports")
      .update({ data })
      .eq("id", (existing[0] as { id: string }).id));
  } else {
    ({ error } = await supabase
      .from("research_reports")
      .insert({ type, slug, data }));
  }

  if (error) throw new Error(`Failed to save research report: ${error.message}`);
}

// ─── Review Queue ─────────────────────────────────────────────────────────────

// Queues a brief to the human review queue (agent_outputs table).
// The agent_id is optional — if the pantheon_agents table is empty it still works.
export async function queueForReview(
  supabase: SupabaseClient,
  options: {
    title: string;
    outputType: string;
    payload: Record<string, unknown>;
    priorityScore?: number;
    agentRole?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<string | null> {
  let agentId: string | null = null;

  if (options.agentRole) {
    const { data: agent } = await supabase
      .from("pantheon_agents")
      .select("id")
      .eq("role", options.agentRole)
      .single();
    agentId = (agent as { id: string } | null)?.id ?? null;
  }

  const { data, error } = await supabase
    .from("agent_outputs")
    .insert({
      agent_id: agentId,
      output_type: options.outputType,
      title: options.title,
      payload: options.payload,
      status: "ready",
      priority_score: options.priorityScore ?? 50,
      metadata: options.metadata ?? {},
    })
    .select("id")
    .single();

  if (error) {
    console.error("[queueForReview] Failed:", error.message);
    return null;
  }
  return (data as { id: string } | null)?.id ?? null;
}

// ─── Date Helpers ─────────────────────────────────────────────────────────────

export function todaySlug(): string {
  return new Date().toISOString().split("T")[0]; // YYYY-MM-DD
}
