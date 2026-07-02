"use client";

import { useState } from "react";

const GRADE_CONFIG = {
  A: { bg: "bg-teal-tint", text: "text-primary", label: "Excellent" },
  B: { bg: "bg-olive-tint", text: "text-olive", label: "Strong" },
  C: { bg: "bg-gold-tint", text: "text-gold", label: "Decent" },
  D: { bg: "bg-rust-tint", text: "text-accent", label: "Weak" },
  F: { bg: "bg-red-50", text: "text-pin-red", label: "Needs Work" },
} as const;

const DIMENSION_LABELS: Record<string, string> = {
  clarity: "Clarity",
  hook: "Hook",
  value: "Value",
  authenticity: "Authenticity",
  cta: "CTA",
};

const DIMENSION_ORDER = ["clarity", "hook", "value", "authenticity", "cta"];

interface Dimension {
  score: number;
  note: string;
}

interface Rewrite {
  original: string;
  suggested: string;
  reason: string;
}

interface ScoreResult {
  grade: "A" | "B" | "C" | "D" | "F";
  overall_score: number;
  dimensions: Record<string, Dimension>;
  fixes: string[];
  rewrites: Rewrite[];
}

export default function PostScorerPage() {
  const [content, setContent] = useState("");
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
        body: JSON.stringify({ content }),
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
        body: JSON.stringify({ content, save: true }),
      });
      setSaved(true);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  const gradeConfig = result ? GRADE_CONFIG[result.grade] : null;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-serif text-dark mb-1">Post Scorer</h1>
        <p className="text-sm text-muted">
          Paste any content — post, email, caption, newsletter. Get a scored analysis with specific fixes.
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
          <span className="text-xs text-muted">{content.length.toLocaleString()} characters</span>
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

      {result && gradeConfig && (
        <div className="flex flex-col gap-4">

          {/* Grade badge */}
          <div className="bg-white border border-border p-6 flex items-center gap-6">
            <div className={`w-20 h-20 flex items-center justify-center ${gradeConfig.bg} shrink-0`}>
              <span className={`text-5xl font-bold ${gradeConfig.text}`}>{result.grade}</span>
            </div>
            <div>
              <p className={`text-lg font-semibold ${gradeConfig.text}`}>{gradeConfig.label}</p>
              <p className="text-sm text-muted mt-0.5">{result.overall_score} / 25 total score</p>
              <div className="w-48 h-1.5 bg-border mt-3">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${(result.overall_score / 25) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Dimension breakdown */}
          <div className="bg-white border border-border p-5">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-4">
              Dimension Breakdown
            </p>
            <div className="flex flex-col gap-4">
              {DIMENSION_ORDER.map((key) => {
                const dim = result.dimensions[key];
                if (!dim) return null;
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-dark">{DIMENSION_LABELS[key]}</span>
                      <span className="text-sm font-mono text-muted">{dim.score} / 5</span>
                    </div>
                    <div className="w-full h-1.5 bg-border">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${(dim.score / 5) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted mt-1.5 leading-snug">{dim.note}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top fixes */}
          {result.fixes.length > 0 && (
            <div className="bg-white border border-border p-5">
              <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-4">
                Top Fixes
              </p>
              <ol className="flex flex-col gap-3">
                {result.fixes.slice(0, 3).map((fix, i) => (
                  <li key={i} className="flex gap-3 items-start">
                    <span className="text-xs font-bold text-primary shrink-0 w-5 h-5 bg-teal-tint flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-sm text-dark leading-snug">{fix}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Rewrite suggestions */}
          {result.rewrites.length > 0 && (
            <div className="bg-white border border-border p-5">
              <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-4">
                Rewrite Suggestions
              </p>
              <div className="flex flex-col gap-4">
                {result.rewrites.map((rw, i) => (
                  <div key={i} className="border border-border p-4">
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-muted font-semibold mb-1.5">
                          Original
                        </p>
                        <p className="text-sm text-dark/60 italic leading-snug">
                          &ldquo;{rw.original}&rdquo;
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-accent font-semibold mb-1.5">
                          Suggested
                        </p>
                        <p className="text-sm text-dark leading-snug">
                          &ldquo;{rw.suggested}&rdquo;
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-muted border-t border-border pt-2">
                      <span className="font-medium text-dark">Why: </span>
                      {rw.reason}
                    </p>
                  </div>
                ))}
              </div>
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
