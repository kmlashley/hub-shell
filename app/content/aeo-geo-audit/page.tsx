"use client";

import { useState, KeyboardEvent } from "react";

const ENGINE_CONFIG = {
  chatgpt: { label: "ChatGPT", abbr: "GPT" },
  perplexity: { label: "Perplexity", abbr: "PRX" },
  claude: { label: "Claude", abbr: "CLU" },
  google_sge: { label: "Google SGE", abbr: "SGE" },
} as const;

type EngineKey = keyof typeof ENGINE_CONFIG;

const PRIORITY_CONFIG = {
  high: { label: "High", color: "text-accent", bg: "bg-rust-tint" },
  medium: { label: "Medium", color: "text-gold", bg: "bg-gold-tint" },
  low: { label: "Low", color: "text-olive", bg: "bg-olive-tint" },
} as const;

const TYPE_CONFIG = {
  content: { label: "Content", color: "text-primary", bg: "bg-teal-tint" },
  technical: { label: "Technical", color: "text-purple", bg: "bg-purple-tint" },
  distribution: { label: "Distribution", color: "text-gold", bg: "bg-gold-tint" },
} as const;

interface EngineResult {
  score: number;
  description: string;
  evidence: string;
}

interface Gap {
  topic: string;
  competitor_appearing: string;
  why_you_dont_appear: string;
}

interface Fix {
  action: string;
  priority: "high" | "medium" | "low";
  type: "content" | "technical" | "distribution";
}

interface AeoResult {
  overall_score: number;
  analysis_summary: string;
  engines: Record<EngineKey, EngineResult>;
  gaps: Gap[];
  fixes: Fix[];
}

function scoreColor(score: number): string {
  if (score >= 7) return "text-primary";
  if (score >= 4) return "text-gold";
  return "text-accent";
}

function scoreBg(score: number): string {
  if (score >= 7) return "bg-teal-tint";
  if (score >= 4) return "bg-gold-tint";
  return "bg-rust-tint";
}

function scoreLabel(score: number): string {
  if (score >= 7) return "Visible";
  if (score >= 4) return "Partial";
  return "Not Found";
}

export default function AeoGeoAuditPage() {
  const [brandName, setBrandName] = useState("");
  const [niche, setNiche] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AeoResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  function addKeyword() {
    const val = keywordInput.trim();
    if (val && !keywords.includes(val) && keywords.length < 5) {
      setKeywords((prev) => [...prev, val]);
      setKeywordInput("");
    }
  }

  function removeKeyword(kw: string) {
    setKeywords((prev) => prev.filter((k) => k !== kw));
  }

  function handleKeywordKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addKeyword();
    }
    if (e.key === "Backspace" && !keywordInput && keywords.length > 0) {
      setKeywords((prev) => prev.slice(0, -1));
    }
  }

  async function handleAudit() {
    if (!brandName.trim() || !niche.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSaved(false);

    try {
      const res = await fetch("/api/content/aeo-geo-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand_name: brandName, niche, keywords }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "Audit failed");
      setResult(data.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!result) return;
    setSaving(true);
    try {
      await fetch("/api/content/aeo-geo-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_name: brandName,
          niche,
          keywords,
          results: result,
          save: true,
        }),
      });
      setSaved(true);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-serif text-dark mb-1">AI Visibility Audit</h1>
        <p className="text-sm text-muted">
          Check whether AI search engines can find you — and how they describe you when asked about your niche.
        </p>
      </div>

      {/* Input form */}
      <div className="bg-white border border-border p-5 mb-4">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-semibold tracking-widest uppercase text-muted block mb-1.5">
                Your Name or Brand
              </label>
              <input
                type="text"
                className="w-full text-sm text-dark placeholder:text-muted bg-transparent outline-none border border-border px-3 py-2 focus:border-primary/50 transition-colors"
                placeholder="e.g. Jane Smith, Clarity Co."
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold tracking-widest uppercase text-muted block mb-1.5">
                Your Niche
              </label>
              <input
                type="text"
                className="w-full text-sm text-dark placeholder:text-muted bg-transparent outline-none border border-border px-3 py-2 focus:border-primary/50 transition-colors"
                placeholder="e.g. content marketing for freelancers"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-semibold tracking-widest uppercase text-muted block mb-1.5">
              Keywords to Rank For{" "}
              <span className="normal-case font-normal tracking-normal">
                (up to 5 — press Enter or comma to add)
              </span>
            </label>
            <div className="border border-border px-3 py-2 flex flex-wrap gap-2 min-h-[42px] focus-within:border-primary/50 transition-colors">
              {keywords.map((kw) => (
                <span
                  key={kw}
                  className="bg-teal-tint text-primary text-xs px-2 py-0.5 flex items-center gap-1.5"
                >
                  {kw}
                  <button
                    onClick={() => removeKeyword(kw)}
                    className="text-primary/60 hover:text-primary leading-none"
                  >
                    ×
                  </button>
                </span>
              ))}
              {keywords.length < 5 && (
                <input
                  type="text"
                  className="text-sm text-dark placeholder:text-muted bg-transparent outline-none flex-1 min-w-[120px]"
                  placeholder={keywords.length === 0 ? "e.g. email marketing, lead generation…" : "Add another…"}
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={handleKeywordKeyDown}
                  onBlur={addKeyword}
                />
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleAudit}
              disabled={loading || !brandName.trim() || !niche.trim()}
              className="bg-primary text-white text-sm px-5 py-2 hover:bg-primary-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "Running audit…" : "Run audit"}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rust-tint border border-accent/30 text-accent text-sm px-4 py-3 mb-4">
          {error}
        </div>
      )}

      {loading && (
        <div className="bg-white border border-border p-8 text-center mb-4">
          <p className="text-sm text-muted">Querying AI search signals…</p>
          <p className="text-xs text-muted mt-1.5">
            Running 5+ searches and synthesizing. Takes 30–50 seconds.
          </p>
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-4">

          {/* Overall score + summary */}
          <div className="bg-white border border-border p-6 flex items-center gap-6">
            <div
              className={`w-20 h-20 flex flex-col items-center justify-center shrink-0 ${scoreBg(result.overall_score)}`}
            >
              <span className={`text-4xl font-bold leading-none ${scoreColor(result.overall_score)}`}>
                {result.overall_score}
              </span>
              <span className={`text-[10px] font-semibold tracking-widest uppercase mt-1 ${scoreColor(result.overall_score)}`}>
                / 10
              </span>
            </div>
            <div>
              <p className={`text-sm font-semibold mb-1 ${scoreColor(result.overall_score)}`}>
                {scoreLabel(result.overall_score)} — AI Visibility Score
              </p>
              <p className="text-sm text-dark leading-relaxed">{result.analysis_summary}</p>
            </div>
          </div>

          {/* Engine cards */}
          <div>
            <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-3">
              Per-Engine Breakdown
            </p>
            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(ENGINE_CONFIG) as EngineKey[]).map((key) => {
                const engine = result.engines[key];
                const cfg = ENGINE_CONFIG[key];
                if (!engine) return null;
                return (
                  <div key={key} className="bg-white border border-border p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold font-mono text-muted bg-light px-1.5 py-0.5">
                          {cfg.abbr}
                        </span>
                        <p className="text-sm font-medium text-dark">{cfg.label}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-lg font-bold ${scoreColor(engine.score)}`}
                        >
                          {engine.score}
                        </span>
                        <span className="text-xs text-muted">/10</span>
                      </div>
                    </div>
                    <div className="w-full h-1 bg-border mb-3">
                      <div
                        className={`h-full transition-all ${engine.score >= 7 ? "bg-primary" : engine.score >= 4 ? "bg-gold" : "bg-accent"}`}
                        style={{ width: `${(engine.score / 10) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-dark leading-snug mb-2">{engine.description}</p>
                    <p className="text-xs text-muted leading-snug border-t border-border pt-2">
                      {engine.evidence}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Gaps */}
          {result.gaps.length > 0 && (
            <div className="bg-white border border-border p-5">
              <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-4">
                Visibility Gaps
              </p>
              <div className="flex flex-col gap-3">
                {result.gaps.map((gap, i) => (
                  <div key={i} className="border border-border p-4">
                    <p className="text-sm font-medium text-dark mb-1.5">{gap.topic}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-1">
                          Appearing instead
                        </p>
                        <p className="text-xs text-accent">{gap.competitor_appearing}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-1">
                          Root cause
                        </p>
                        <p className="text-xs text-dark">{gap.why_you_dont_appear}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fix list */}
          {result.fixes.length > 0 && (
            <div className="bg-white border border-border p-5">
              <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-4">
                Fix List
              </p>
              <div className="flex flex-col gap-2">
                {result.fixes.map((fix, i) => {
                  const pCfg = PRIORITY_CONFIG[fix.priority] ?? PRIORITY_CONFIG.medium;
                  const tCfg = TYPE_CONFIG[fix.type] ?? TYPE_CONFIG.content;
                  return (
                    <div
                      key={i}
                      className="flex items-start gap-3 border border-border px-4 py-3"
                    >
                      <span
                        className={`text-xs font-bold shrink-0 w-5 h-5 flex items-center justify-center mt-0.5 ${pCfg.bg} ${pCfg.color}`}
                      >
                        {i + 1}
                      </span>
                      <p className="text-sm text-dark flex-1 leading-snug">{fix.action}</p>
                      <div className="flex gap-1.5 shrink-0">
                        <span
                          className={`text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 ${tCfg.bg} ${tCfg.color}`}
                        >
                          {tCfg.label}
                        </span>
                        <span
                          className={`text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 ${pCfg.bg} ${pCfg.color}`}
                        >
                          {pCfg.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pb-4">
            <p className="text-xs text-muted">
              Run this audit again in 30 days to track improvement.
            </p>
            <button
              onClick={handleSave}
              disabled={saving || saved}
              className="text-sm border border-border px-4 py-2 text-muted hover:text-dark hover:border-dark/20 transition-colors disabled:opacity-40"
            >
              {saved ? "Saved to history ✓" : saving ? "Saving…" : "Save to history"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
