"use client";

import { useState } from "react";

const TAB_CONFIG = {
  top_ranking: {
    label: "Top Ranking Content",
    color: "text-primary",
    bg: "bg-teal-tint",
    desc: "What's winning in the SERPs and why",
  },
  content_gaps: {
    label: "Content Gaps",
    color: "text-accent",
    bg: "bg-rust-tint",
    desc: "Topics and angles not being covered well",
  },
  keyword_opportunities: {
    label: "Keyword Opportunities",
    color: "text-gold",
    bg: "bg-gold-tint",
    desc: "Specific keywords to target",
  },
  quick_wins: {
    label: "Quick Wins",
    color: "text-olive",
    bg: "bg-olive-tint",
    desc: "Concrete actions ranked by effort",
  },
} as const;

type TabKey = keyof typeof TAB_CONFIG;

const DIFFICULTY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  low: { label: "Low", color: "text-primary", bg: "bg-teal-tint" },
  medium: { label: "Medium", color: "text-gold", bg: "bg-gold-tint" },
  high: { label: "High", color: "text-accent", bg: "bg-rust-tint" },
};

interface RankingItem {
  title: string;
  url: string;
  why_ranking: string;
  takeaway: string;
}

interface GapItem {
  gap: string;
  why_it_matters: string;
  content_idea: string;
}

interface KeywordItem {
  keyword: string;
  intent: string;
  difficulty: "low" | "medium" | "high";
  angle: string;
}

interface QuickWin {
  action: string;
  impact: string;
  effort: "low" | "medium" | "high";
}

interface SeoResult {
  query_summary: string;
  tabs: {
    top_ranking: RankingItem[];
    content_gaps: GapItem[];
    keyword_opportunities: KeywordItem[];
    quick_wins: QuickWin[];
  };
}

function DifficultyBadge({ level }: { level: string }) {
  const cfg = DIFFICULTY_CONFIG[level] ?? DIFFICULTY_CONFIG.medium;
  return (
    <span className={`text-[10px] font-semibold tracking-widest uppercase px-2 py-0.5 ${cfg.bg} ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

export default function SeoResearchPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SeoResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("top_ranking");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleResearch() {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSaved(false);

    try {
      const res = await fetch("/api/content/seo-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "Analysis failed");
      setResult(data.result);
      setActiveTab("top_ranking");
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
      await fetch("/api/content/seo-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, results: result, save: true }),
      });
      setSaved(true);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  const tabCounts = result
    ? {
        top_ranking: result.tabs.top_ranking?.length ?? 0,
        content_gaps: result.tabs.content_gaps?.length ?? 0,
        keyword_opportunities: result.tabs.keyword_opportunities?.length ?? 0,
        quick_wins: result.tabs.quick_wins?.length ?? 0,
      }
    : null;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-serif text-dark mb-1">SEO Research</h1>
        <p className="text-sm text-muted">
          Enter a topic or URL. Get a full SEO analysis — what&apos;s ranking, what&apos;s missing, and where the gaps are.
        </p>
      </div>

      {/* Input */}
      <div className="bg-white border border-border p-5 mb-4">
        <label className="text-[10px] font-semibold tracking-widest uppercase text-muted block mb-1.5">
          Topic or URL
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            className="flex-1 text-sm text-dark placeholder:text-muted bg-transparent outline-none border border-border px-3 py-2 focus:border-primary/50 transition-colors"
            placeholder="e.g. content marketing for coaches  —  or  —  https://yourdomain.com/blog-post"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleResearch()}
          />
          <button
            onClick={handleResearch}
            disabled={loading || !query.trim()}
            className="bg-primary text-white text-sm px-5 py-2 hover:bg-primary-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            {loading ? "Analyzing…" : "Run analysis"}
          </button>
        </div>
        <p className="text-xs text-muted mt-2">
          Enter a URL to analyze your own content. Enter a topic to research the competitive landscape.
        </p>
      </div>

      {error && (
        <div className="bg-rust-tint border border-accent/30 text-accent text-sm px-4 py-3 mb-4">
          {error}
        </div>
      )}

      {loading && (
        <div className="bg-white border border-border p-8 text-center mb-4">
          <p className="text-sm text-muted">Analyzing the SERP landscape…</p>
          <p className="text-xs text-muted mt-1.5">Searching, scraping, and synthesizing. Takes 20–35 seconds.</p>
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-4">

          {/* Summary */}
          <div className="bg-white border border-border p-5">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-2">
              SEO Landscape
            </p>
            <p className="text-sm text-dark leading-relaxed">{result.query_summary}</p>
          </div>

          {/* Tabs */}
          <div className="bg-white border border-border">
            <div className="flex border-b border-border overflow-x-auto">
              {(Object.keys(TAB_CONFIG) as TabKey[]).map((key) => {
                const cfg = TAB_CONFIG[key];
                const count = tabCounts?.[key] ?? 0;
                const isActive = activeTab === key;
                return (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`px-4 py-3 text-sm whitespace-nowrap transition-colors border-b-2 shrink-0 ${
                      isActive
                        ? "border-primary text-dark font-medium"
                        : "border-transparent text-muted hover:text-dark"
                    }`}
                  >
                    {cfg.label}
                    <span
                      className={`ml-2 text-xs px-1.5 py-0.5 font-mono ${
                        isActive ? `${cfg.bg} ${cfg.color}` : "bg-light text-muted"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="p-4">
              <p className="text-xs text-muted mb-4">{TAB_CONFIG[activeTab].desc}</p>

              {/* Top Ranking Content */}
              {activeTab === "top_ranking" && (
                <div className="flex flex-col gap-3">
                  {result.tabs.top_ranking.map((item, i) => (
                    <div key={i} className="border border-border p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <p className="text-sm font-medium text-dark leading-snug">{item.title}</p>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline shrink-0 mt-0.5"
                        >
                          View →
                        </a>
                      </div>
                      <p className="text-xs text-muted font-mono mb-2.5 truncate">{item.url}</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-teal-tint px-3 py-2">
                          <p className="text-[10px] font-semibold tracking-widest uppercase text-primary mb-1">
                            Why it ranks
                          </p>
                          <p className="text-xs text-dark leading-snug">{item.why_ranking}</p>
                        </div>
                        <div className="bg-light px-3 py-2">
                          <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-1">
                            Your takeaway
                          </p>
                          <p className="text-xs text-dark leading-snug">{item.takeaway}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Content Gaps */}
              {activeTab === "content_gaps" && (
                <div className="flex flex-col gap-3">
                  {result.tabs.content_gaps.map((item, i) => (
                    <div key={i} className="border border-border p-4">
                      <p className="text-sm font-medium text-dark mb-1.5">{item.gap}</p>
                      <p className="text-xs text-muted leading-snug mb-3">
                        <span className="font-medium text-dark/70">Why it matters: </span>
                        {item.why_it_matters}
                      </p>
                      <div className="bg-rust-tint px-3 py-2.5">
                        <p className="text-[10px] font-semibold tracking-widest uppercase text-accent mb-1">
                          Content idea
                        </p>
                        <p className="text-sm text-dark leading-snug">{item.content_idea}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Keyword Opportunities */}
              {activeTab === "keyword_opportunities" && (
                <div className="flex flex-col gap-3">
                  {result.tabs.keyword_opportunities.map((item, i) => (
                    <div key={i} className="border border-border p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <code className="text-sm font-mono text-dark bg-light px-2 py-1">
                          {item.keyword}
                        </code>
                        <DifficultyBadge level={item.difficulty} />
                      </div>
                      <p className="text-xs text-muted mb-2.5">
                        <span className="font-medium text-dark/70">Intent: </span>
                        {item.intent}
                      </p>
                      <div className="bg-gold-tint px-3 py-2.5">
                        <p className="text-[10px] font-semibold tracking-widest uppercase text-gold mb-1">
                          Your angle
                        </p>
                        <p className="text-sm text-dark leading-snug">{item.angle}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick Wins */}
              {activeTab === "quick_wins" && (
                <div className="flex flex-col gap-3">
                  {result.tabs.quick_wins.map((item, i) => (
                    <div key={i} className="border border-border p-4 flex gap-4 items-start">
                      <span className="text-xs font-bold text-olive shrink-0 w-6 h-6 bg-olive-tint flex items-center justify-center mt-0.5">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-1.5">
                          <p className="text-sm font-medium text-dark leading-snug">{item.action}</p>
                          <DifficultyBadge level={item.effort} />
                        </div>
                        <p className="text-xs text-muted leading-snug">
                          <span className="font-medium text-dark/70">Impact: </span>
                          {item.impact}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
