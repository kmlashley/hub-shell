import { createServerClient } from "@/lib/supabase-server";

export type AgentStatus = "fresh" | "stale" | "idle" | "planned";

export interface AgentState {
  status: AgentStatus;
  lastRun: string | null;
  outputCount: number;
  latestTitle: string | null;
}

const FRESH_WINDOW_MS = 72 * 60 * 60 * 1000;

export async function getAgentStates(
  names: string[]
): Promise<Record<string, AgentState>> {
  const idle = (): AgentState => ({ status: "idle", lastRun: null, outputCount: 0, latestTitle: null });

  const supabase = createServerClient();

  const { data: agents, error } = await supabase
    .from("pantheon_agents")
    .select("id, name, status")
    .in("name", names);

  if (error || !agents || agents.length === 0) {
    return Object.fromEntries(names.map((n) => [n, idle()]));
  }

  const agentIds = agents.map((a: { id: string }) => a.id);

  const { data: outputs } = await supabase
    .from("agent_outputs")
    .select("agent_id, created_at, title")
    .in("agent_id", agentIds)
    .order("created_at", { ascending: false });

  const byAgent: Record<string, Array<{ agent_id: string; created_at: string; title: string | null }>> = {};
  for (const o of outputs ?? []) {
    if (!byAgent[o.agent_id]) byAgent[o.agent_id] = [];
    byAgent[o.agent_id].push(o);
  }

  const result: Record<string, AgentState> = {};

  for (const name of names) {
    const agent = agents.find((a: { name: string; id: string; status: string }) => a.name === name);
    if (!agent) { result[name] = idle(); continue; }

    if (agent.status === "planned") {
      result[name] = { status: "planned", lastRun: null, outputCount: 0, latestTitle: null };
      continue;
    }

    const agentOutputs = byAgent[agent.id] ?? [];
    if (agentOutputs.length === 0) { result[name] = idle(); continue; }

    const latest = agentOutputs[0];
    const isFresh = Date.now() - new Date(latest.created_at).getTime() < FRESH_WINDOW_MS;

    result[name] = {
      status: isFresh ? "fresh" : "stale",
      lastRun: latest.created_at,
      outputCount: agentOutputs.length,
      latestTitle: latest.title ?? null,
    };
  }

  return result;
}
