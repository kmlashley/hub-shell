"use client";

import { useEffect, useState } from "react";
import { fmtRelative } from "@/lib/fmt-date";

interface WorkflowRun {
  id: string;
  workflow_name: string;
  triggered_by: string;
  status: string;
  started_at: string;
  duration_ms: number | null;
  notes: string | null;
}

export default function AgentsPage() {
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [message, setMessage] = useState("");

  async function loadRuns() {
    const res = await fetch("/api/research/run-all/history").catch(() => null);
    if (res?.ok) {
      const data = await res.json();
      setRuns(data.runs ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { loadRuns(); }, []);

  async function triggerSweep() {
    if (triggering) return;
    setTriggering(true);
    setMessage("Starting research sweep... this takes 3-5 minutes.");

    const res = await fetch("/api/research/run-all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (res.ok) {
      const data = await res.json();
      const succeeded = (data.agents as Array<{ success: boolean }>)?.filter((a) => a.success).length ?? 0;
      setMessage(`Sweep complete. ${succeeded} agents succeeded. ${data.synthesis?.briefsQueued ?? 0} briefs queued.`);
    } else {
      setMessage("Sweep failed. Check the console for details.");
    }

    setTriggering(false);
    loadRuns();
  }

  const STATUS_DOT: Record<string, string> = {
    running: "bg-gold animate-pulse",
    completed: "bg-accent",
    failed: "bg-red-400",
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-serif text-dark mb-1">Agents</h1>
          <p className="text-sm text-muted">Manage and trigger your AI research pipeline.</p>
        </div>
        <button
          onClick={triggerSweep}
          disabled={triggering}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {triggering ? "Running..." : "Run Research Sweep"}
        </button>
      </div>

      {message && (
        <div className="mb-6 bg-light border border-border rounded-xl p-4 text-sm text-dark">
          {message}
        </div>
      )}

      {/* Pipeline overview */}
      <div className="bg-white border border-border rounded-xl p-6 mb-6">
        <h2 className="font-medium text-dark mb-4">Five-Layer Pipeline</h2>
        <div className="space-y-3">
          {[
            { layer: "L1", name: "Research", agents: "Keyword · Competitive · Content Trends · Audience", route: "/api/research/*" },
            { layer: "L2", name: "Synthesis", agents: "Reads all L1 reports → writes content briefs", route: "/api/synthesis" },
            { layer: "L3", name: "Human Review", agents: "You approve, reject, or redirect briefs", route: "/review" },
            { layer: "L4", name: "Content Creation", agents: "Content Draft · Post Scorer · Voice Rewrite", route: "/api/content/*" },
            { layer: "L5", name: "Distribution", agents: "Social post hook (extend for your platforms)", route: "/api/distribution/*" },
          ].map((item) => (
            <div key={item.layer} className="flex items-start gap-4">
              <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded shrink-0 mt-0.5">{item.layer}</span>
              <div>
                <p className="text-sm font-medium text-dark">{item.name}</p>
                <p className="text-xs text-muted">{item.agents}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent runs */}
      <h2 className="font-medium text-dark mb-4">Recent Workflow Runs</h2>
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-white border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : runs.length === 0 ? (
        <div className="bg-white border border-border rounded-xl p-8 text-center">
          <p className="text-sm text-muted">No runs yet. Trigger a research sweep to get started.</p>
        </div>
      ) : (
        <div className="bg-white border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-light">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted">Workflow</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted">Triggered By</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted">Duration</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {runs.map((run) => (
                <tr key={run.id} className="hover:bg-light transition-colors">
                  <td className="px-4 py-3 font-medium text-dark">{run.workflow_name}</td>
                  <td className="px-4 py-3 text-muted text-xs capitalize">{run.triggered_by}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[run.status] ?? "bg-muted"}`} />
                      <span className="text-xs capitalize text-muted">{run.status}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted text-xs">
                    {run.duration_ms ? `${Math.round(run.duration_ms / 1000)}s` : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted text-xs">{fmtRelative(run.started_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
