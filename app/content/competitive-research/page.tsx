"use client";

import { useState } from "react";

const FREQUENCY_CONFIG = {
  high: { label: "High", color: "text-primary", bg: "bg-teal-tint" },
  medium: { label: "Medium", color: "text-gold", bg: "bg-gold-tint" },
  low: { label: "Low", color: "text-muted", bg: "bg-light" },
} as const;

const MOVE_TYPE_CONFIG = {
  content: { label: "Content", color: "text-primary", bg: "bg-teal-tint" },
  offer: { label: "Offer", color: "text-accent", bg: "bg-rust-tint" },
  positioning: { label: "Positioning", color: "text-purple", bg: "bg-purple-tint" },
} as const;

interface Positioning {
  headline: string;
  description: string;
  audience: string;
  tone: string;
}

interface ContentTheme {
  theme: string;
  frequency: "high" | "medium" | "low";
  example: string;
}

interface CoverageGap {
  gap: string;
  audience_need: string;
  opportunity: string;
}

interface Advantage {
  differentiator: string;
  why_it_matters: string;
}

interface RecommendedMove {
  move: string;
  type: "content" | "offer" | "positioning";
  rationale: string;
}

interface CompetitiveResult {
  competitor_summary: string;
  positioning: Positioning;
  content_themes: ContentTheme[];
  coverage_gaps: CoverageGap[];
  your_advantage: Advantage[];
  recommended_moves: RecommendedMove[];
}

function SectionHeader({ label }: { label: string }) {
  return (
    <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-4">
      {label}
    </p>
  );
}

export default function CompetitiveResearchPage() {
  const [competitorName, setCompetitorName] = useState("");
  const [competitorUrl, setCompetitorUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompetitiveResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleResearch() {
    if (!competitorName.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSaved(false);

    try {
      const res = await fetch("/api/content/competitive-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competitor_name: competitorName,
          competitor_url: competitorUrl,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "Research failed");
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
      await fetch("/api/content/competitive-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competitor_name: competitorName,
          competitor_url: competitorUrl,
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
        <h1 className="text-2xl font-serif text-dark mb-1">Competitive Research</h1>
        <p className="text-sm text-muted">
          Enter a competitor&apos;s name and optional URL. Get a full competitive brief — their positioning, content strategy, gaps, and where you have advantage.
        </p>
      </div>

      {/* Input */}
      <div className="bg-white border border-border p-5 mb-4">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-semibold tracking-widest uppercase text-muted block mb-1.5">
                Competitor Name
              </label>
              <input
                type="text"
                className="w-full text-sm text-dark placeholder:text-muted bg-transparent outline-none border border-border px-3 py-2 focus:border-primary/50 transition-colors"
                placeholder="e.g. Justin Welsh, Morning Brew"
                value={competitorName}
                onChange={(e) => setCompetitorName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleResearch()}
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold tracking-widest uppercase text-muted block mb-1.5">
                URL{" "}
                <span className="normal-case font-normal tracking-normal">(optional)</span>
              </label>
              <input
                type="text"
                className="w-full text-sm text-dark placeholder:text-muted bg-transparent outline-none border border-border px-3 py-2 focus:border-primary/50 transition-colors"
                placeholder="https://theirsite.com or substack URL"
                value={competitorUrl}
                onChange={(e) => setCompetitorUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleResearch()}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleResearch}
              disabled={loading || !competitorName.trim()}
              className="bg-primary text-white text-sm px-5 py-2 hover:bg-primary-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "Researching…" : "Build competitive brief"}
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
          <p className="text-sm text-muted">Researching {competitorName}…</p>
          <p className="text-xs text-muted mt-1.5">
            Scraping, searching, and synthesizing. Takes 20–40 seconds.
          </p>
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-4">

          {/* Summary */}
          <div className="bg-white border border-border p-5">
            <SectionHeader label="Competitor Overview" />
            <p className="text-sm text-dark leading-relaxed">{result.competitor_summary}</p>
          </div>

          {/* Positioning */}
          <div className="bg-white border border-border p-5">
            <SectionHeader label="Their Positioning" />
            <p className="text-base font-medium text-dark mb-3 leading-snug">
              &ldquo;{result.positioning.headline}&rdquo;
            </p>
            <p className="text-sm text-dark leading-relaxed mb-4">{result.positioning.description}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-light px-3 py-2.5">
                <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-1">
                  Audience
                </p>
                <p className="text-xs text-dark leading-snug">{result.positioning.audience}</p>
              </div>
              <div className="bg-light px-3 py-2.5">
                <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-1">
                  Tone & Voice
                </p>
                <p className="text-xs text-dark leading-snug">{result.positioning.tone}</p>
              </div>
            </div>
          </div>

          {/* Content themes */}
          <div className="bg-white border border-border p-5">
            <SectionHeader label="Content Themes" />
            <div className="flex flex-col gap-2">
              {result.content_themes.map((theme, i) => {
                const fCfg = FREQUENCY_CONFIG[theme.frequency] ?? FREQUENCY_CONFIG.medium;
                return (
                  <div key={i} className="border border-border px-4 py-3 flex items-start gap-3">
                    <span
                      className={`text-[10px] font-semibold tracking-widest uppercase px-2 py-0.5 shrink-0 mt-0.5 ${fCfg.bg} ${fCfg.color}`}
                    >
                      {fCfg.label}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-dark mb-0.5">{theme.theme}</p>
                      <p className="text-xs text-muted leading-snug">{theme.example}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Coverage gaps */}
          <div className="bg-white border border-border p-5">
            <SectionHeader label="Gaps in Their Coverage" />
            <div className="flex flex-col gap-3">
              {result.coverage_gaps.map((gap, i) => (
                <div key={i} className="border border-border p-4">
                  <p className="text-sm font-medium text-dark mb-2">{gap.gap}</p>
                  <p className="text-xs text-muted leading-snug mb-3">
                    <span className="font-medium text-dark/70">Why the audience needs it: </span>
                    {gap.audience_need}
                  </p>
                  <div className="bg-rust-tint px-3 py-2.5">
                    <p className="text-[10px] font-semibold tracking-widest uppercase text-accent mb-1">
                      Your opportunity
                    </p>
                    <p className="text-sm text-dark leading-snug">{gap.opportunity}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Your advantage */}
          <div className="bg-white border border-border p-5">
            <SectionHeader label="Your Advantage" />
            <div className="flex flex-col gap-2">
              {result.your_advantage.map((adv, i) => (
                <div key={i} className="border border-border px-4 py-3 flex gap-3">
                  <span className="text-xs font-bold text-primary shrink-0 w-5 h-5 bg-teal-tint flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-dark mb-0.5">{adv.differentiator}</p>
                    <p className="text-xs text-muted leading-snug">{adv.why_it_matters}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommended moves */}
          <div className="bg-white border border-border p-5">
            <SectionHeader label="Recommended Moves" />
            <div className="flex flex-col gap-2">
              {result.recommended_moves.map((move, i) => {
                const tCfg = MOVE_TYPE_CONFIG[move.type] ?? MOVE_TYPE_CONFIG.content;
                return (
                  <div key={i} className="border border-border px-4 py-3 flex items-start gap-3">
                    <span
                      className={`text-[10px] font-semibold tracking-widest uppercase px-2 py-0.5 shrink-0 mt-0.5 ${tCfg.bg} ${tCfg.color}`}
                    >
                      {tCfg.label}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-dark mb-0.5">{move.move}</p>
                      <p className="text-xs text-muted leading-snug">{move.rationale}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end pb-4">
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
