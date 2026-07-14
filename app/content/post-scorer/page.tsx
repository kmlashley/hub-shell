"use client";

import { useState } from "react";

type Lane = "educator" | "business" | "agency";

const LANE_OPTIONS: { value: Lane | ""; label: string }[] = [
  { value: "", label: "Auto-detect" },
  { value: "educator", label: "Educator" },
  { value: "business", label: "Business (Sam)" },
  { value: "agency", label: "Agency (Dana)" },
];

interface HardGate {
  name: string;
  status: "PASS" | "FAIL";
  evidence: string;
}

interface SoftCheck {
  name: string;
  status: "✓" | "~" | "✗";
  evidence: string;
}

interface TopFix {
  issue: string;
  suggestion: string;
}

interface ScoreResult {
  lane: Lane;
  laneInferred: boolean;
  laneNote: string | null;
  verdict: string;
  gateFailureCount: number;
  hardGates: HardGate[];
  softChecks: SoftCheck[];
  topFixes: TopFix[];
}

const LANE_LABELS: Record<Lane, string> = {
  educator: "Educator",
  business: "Business (Sam)",
  agency: "Agency (Dana)",
};

const SOFT_CHECK_COLOR: Record<string, string> = {
  "✓": "text-primary",
  "~": "text-gold",
  "✗": "text-pin-red",
};

export default function PostScorerPage() {
  const [content, setContent] = useState("");
  const [lane, setLane] = useState<Lane | "">("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleScore() {
    if (!content.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSaved(false);

    try {
      const res = await fetch("/api/content/post-scorer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, lane: lane || undefined }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "Scoring failed");
      setResult(data.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!content.trim() || !result) return;
    setSaving(true);
    try {
      await fetch("/api/content/post-scorer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, lane: lane || undefined, save: true }),
      });
      setSaved(true);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  const isReady = result?.verdict === "READY TO PUBLISH";

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-serif text-dark mb-1">Post Scorer</h1>
        <p className="text-sm text-muted">
          Paste a draft, pick a lane (or let it infer one), and get a hard-gate / soft-check read against your Voice DNA — not a generic rubric.
        </p>
      </div>

      {/* Input area */}
      <div className="bg-white border border-border p-5 mb-4">
        <textarea
          className="w-full text-sm text-dark placeholder:text-muted bg-transparent resize-none outline-none leading-relaxed min-h-[240px]"
          placeholder="Paste your content here — a blog post, email, LinkedIn post, newsletter issue, or any other piece of writing…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <div className="flex items-center justify-between pt-3 border-t border-border mt-3">
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted">{content.length.toLocaleString()} characters</span>
            <select
              value={lane}
              onChange={(e) => setLane(e.target.value as Lane | "")}
              className="text-xs border border-border px-2 py-1 text-dark bg-white outline-none"
            >
              {LANE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleScore}
            disabled={loading || !content.trim()}
            className="bg-primary text-white text-sm px-5 py-2 hover:bg-primary-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Scoring…" : "Score this post"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rust-tint border border-accent/30 text-accent text-sm px-4 py-3 mb-4">
          {error}
        </div>
      )}

      {loading && (
        <div className="bg-white border border-border p-8 text-center mb-4">
          <p className="text-sm text-muted">Analyzing your content…</p>
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-4">

          {/* Lane + verdict */}
          <div className="bg-white border border-border p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold tracking-widest uppercase text-muted">
                Lane: {LANE_LABELS[result.lane]}
                {result.laneInferred && <span className="text-gold normal-case font-normal"> (inferred)</span>}
              </span>
            </div>
            {result.laneNote && (
              <p className="text-xs text-muted italic mb-3">{result.laneNote}</p>
            )}
            <p className={`text-2xl font-bold ${isReady ? "text-primary" : "text-pin-red"}`}>
              {result.verdict}
            </p>
          </div>

          {/* Hard gates */}
          <div className="bg-white border border-border p-5">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-4">
              Hard Gates
            </p>
            <div className="flex flex-col gap-3">
              {result.hardGates.map((gate, i) => (
                <div key={i} className="border-b border-border last:border-0 pb-3 last:pb-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-dark">{gate.name}</span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 ${
                        gate.status === "PASS" ? "bg-teal-tint text-primary" : "bg-red-50 text-pin-red"
                      }`}
                    >
                      {gate.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted leading-snug">{gate.evidence}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Soft checks */}
          <div className="bg-white border border-border p-5">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-4">
              Soft Checks
            </p>
            <div className="flex flex-col gap-3">
              {result.softChecks.map((check, i) => (
                <div key={i} className="border-b border-border last:border-0 pb-3 last:pb-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-dark">{check.name}</span>
                    <span className={`text-sm font-bold ${SOFT_CHECK_COLOR[check.status] ?? "text-muted"}`}>
                      {check.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted leading-snug">{check.evidence}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Top fixes */}
          {result.topFixes.length > 0 && (
            <div className="bg-white border border-border p-5">
              <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-4">
                Top Three Fixes
              </p>
              <ol className="flex flex-col gap-4">
                {result.topFixes.slice(0, 3).map((fix, i) => (
                  <li key={i} className="flex gap-3 items-start">
                    <span className="text-xs font-bold text-primary shrink-0 w-5 h-5 bg-teal-tint flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm text-dark font-medium leading-snug">{fix.issue}</p>
                      <p className="text-sm text-muted leading-snug mt-1">{fix.suggestion}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Save to history */}
          <div className="flex justify-end pb-4">
            <button
              onClick={handleSave}
              disabled={saving || saved}
              className="text-sm border border-border px-4 py-2 text-muted hover:text-dark hover:border-border-2 transition-colors disabled:opacity-40"
            >
              {saved ? "Saved to history ✓" : saving ? "Saving…" : "Save score to history"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
