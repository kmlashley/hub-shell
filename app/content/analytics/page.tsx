"use client";

import { useState, useEffect, useCallback } from "react";

interface ParsedMetric {
  platform: string;
  content_title: string;
  metric_type: string;
  value: number;
  unit: string;
}

interface PlatformSummary {
  platform: string;
  highlights: string;
  metrics: ParsedMetric[];
}

interface AnalyticsResult {
  platform_summaries: PlatformSummary[];
  top_performers: ParsedMetric[];
  what_is_working: string;
  recommendations: string[];
  parsed_metrics: ParsedMetric[];
}

interface StoredMetric {
  id: string;
  platform: string;
  metric_type: string;
  value: number;
  recorded_at: string;
  published_content: { title: string; url: string } | null;
}

const PLATFORM_COLORS: Record<string, { color: string; bg: string }> = {
  Newsletter: { color: "text-primary", bg: "bg-teal-tint" },
  YouTube:    { color: "text-accent",  bg: "bg-rust-tint" },
  Blog:       { color: "text-purple",  bg: "bg-purple-tint" },
  LinkedIn:   { color: "text-navy",    bg: "bg-light" },
  "Twitter / X": { color: "text-muted", bg: "bg-light" },
  Instagram:  { color: "text-purple",  bg: "bg-purple-tint" },
  Podcast:    { color: "text-gold",    bg: "bg-gold-tint" },
};

function platformStyle(platform: string) {
  return PLATFORM_COLORS[platform] ?? { color: "text-muted", bg: "bg-light" };
}

function SectionHeader({ label }: { label: string }) {
  return (
    <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-4">
      {label}
    </p>
  );
}

function formatMetricType(t: string) {
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

type Tab = "analyze" | "history";

export default function ContentAnalyticsPage() {
  const [tab, setTab] = useState<Tab>("analyze");
  const [rawData, setRawData] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyticsResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [history, setHistory] = useState<StoredMetric[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/content/analytics");
      const data = await res.json();
      if (data.success) setHistory(data.metrics);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "history") loadHistory();
  }, [tab, loadHistory]);

  async function handleAnalyze() {
    if (!rawData.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSaved(false);

    try {
      const res = await fetch("/api/content/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_data: rawData }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "Analysis failed");
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
      await fetch("/api/content/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ save: true, metrics: result.parsed_metrics }),
      });
      setSaved(true);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  // Group history by platform
  const historyByPlatform = history.reduce<Record<string, StoredMetric[]>>((acc, m) => {
    const key = m.platform ?? "Other";
    acc[key] = [...(acc[key] ?? []), m];
    return acc;
  }, {});

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-serif text-dark mb-1">Content Analytics</h1>
        <p className="text-sm text-muted">
          Paste your performance data from any platform. Get a synthesis of what&apos;s working and what to do more of.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border border-border mb-6 w-fit">
        {(["analyze", "history"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 text-sm transition-colors ${
              tab === t ? "bg-primary text-white" : "text-muted hover:text-dark hover:bg-light"
            }`}
          >
            {t === "analyze" ? "Analyze" : "History"}
          </button>
        ))}
      </div>

      {tab === "analyze" && (
        <>
          {/* Input */}
          <div className="bg-white border border-border p-5 mb-4">
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-[10px] font-semibold tracking-widest uppercase text-muted block mb-1.5">
                  Paste Your Performance Data
                </label>
                <textarea
                  className="w-full text-sm text-dark placeholder:text-muted bg-transparent outline-none border border-border px-3 py-2.5 focus:border-primary/50 transition-colors resize-none"
                  rows={8}
                  placeholder={`Paste numbers from any platform — mix and match, no specific format needed. Examples:\n\nNewsletter — Issue #31 "AI Tools I Use Weekly"\nOpen rate: 51% | Clicks: 284 | Unsubscribes: 3\n\nYouTube — "How I Use Claude for Content"\nViews: 4,200 | Likes: 187 | Comments: 43 | Subs gained: 31\n\nLinkedIn — Post about AI productivity\nImpressions: 8,400 | Reactions: 212 | Reposts: 18`}
                  value={rawData}
                  onChange={(e) => setRawData(e.target.value)}
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleAnalyze}
                  disabled={loading || !rawData.trim()}
                  className="bg-primary text-white text-sm px-5 py-2 hover:bg-primary-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? "Analyzing…" : "Synthesize performance"}
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
              <p className="text-sm text-muted">Parsing and synthesizing your data…</p>
              <p className="text-xs text-muted mt-1.5">Takes 10–15 seconds.</p>
            </div>
          )}

          {result && (
            <div className="flex flex-col gap-4">

              {/* What's working */}
              <div className="bg-teal-tint border border-primary/20 p-5">
                <SectionHeader label="What's Working" />
                <p className="text-sm text-dark leading-relaxed">{result.what_is_working}</p>
              </div>

              {/* Top performers */}
              {result.top_performers.length > 0 && (
                <div className="bg-white border border-border p-5">
                  <SectionHeader label="Top Performers" />
                  <div className="flex flex-col gap-2">
                    {result.top_performers.map((tp, i) => {
                      const style = platformStyle(tp.platform);
                      return (
                        <div key={i} className="border border-border px-4 py-3 flex items-center gap-3">
                          <span className={`text-[10px] font-semibold tracking-widest uppercase px-2 py-0.5 shrink-0 ${style.bg} ${style.color}`}>
                            {tp.platform}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-dark truncate">{tp.content_title}</p>
                            <p className="text-xs text-muted">{formatMetricType(tp.metric_type)}</p>
                          </div>
                          <span className="text-sm font-medium text-dark shrink-0">
                            {tp.value}{tp.unit === "%" ? "%" : tp.unit === "k" ? "k" : ""}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Platform summaries */}
              {result.platform_summaries.length > 0 && (
                <div className="bg-white border border-border p-5">
                  <SectionHeader label="By Platform" />
                  <div className="flex flex-col gap-4">
                    {result.platform_summaries.map((ps, i) => {
                      const style = platformStyle(ps.platform);
                      return (
                        <div key={i}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-[10px] font-semibold tracking-widest uppercase px-2 py-0.5 ${style.bg} ${style.color}`}>
                              {ps.platform}
                            </span>
                            <p className="text-xs text-muted">{ps.highlights}</p>
                          </div>
                          {ps.metrics.length > 0 && (
                            <div className="grid grid-cols-3 gap-2 ml-0">
                              {ps.metrics.map((m, j) => (
                                <div key={j} className="bg-light px-3 py-2.5">
                                  <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-0.5">
                                    {formatMetricType(m.metric_type)}
                                  </p>
                                  <p className="text-base font-medium text-dark">
                                    {m.value}{m.unit === "%" ? "%" : ""}
                                  </p>
                                  {m.content_title && (
                                    <p className="text-[11px] text-muted mt-0.5 leading-snug truncate">{m.content_title}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {result.recommendations.length > 0 && (
                <div className="bg-white border border-border p-5">
                  <SectionHeader label="What to Do More Of" />
                  <ul className="flex flex-col gap-2">
                    {result.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="text-xs font-bold text-primary w-5 h-5 bg-teal-tint flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <p className="text-sm text-dark leading-snug">{rec}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Save */}
              <div className="flex justify-end pb-4">
                <button
                  onClick={handleSave}
                  disabled={saving || saved}
                  className="text-sm border border-border px-4 py-2 text-muted hover:text-dark hover:border-dark/20 transition-colors disabled:opacity-40"
                >
                  {saved ? "Logged to history ✓" : saving ? "Saving…" : "Log metrics to history"}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {tab === "history" && (
        <div>
          {loadingHistory ? (
            <div className="bg-white border border-border p-8 text-center">
              <p className="text-sm text-muted">Loading…</p>
            </div>
          ) : history.length === 0 ? (
            <div className="bg-white border border-border p-10 text-center">
              <p className="text-sm text-muted mb-1">No metrics logged yet.</p>
              <p className="text-xs text-muted">
                Analyze your performance data and click &ldquo;Log metrics to history&rdquo; to build a record over time.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {Object.entries(historyByPlatform).map(([platform, platformMetrics]) => {
                const style = platformStyle(platform);
                return (
                  <div key={platform} className="bg-white border border-border p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <span className={`text-[10px] font-semibold tracking-widest uppercase px-2 py-0.5 ${style.bg} ${style.color}`}>
                        {platform}
                      </span>
                      <span className="text-xs text-muted">{platformMetrics.length} entries</span>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left text-[10px] font-semibold tracking-widest uppercase text-muted pb-2">Metric</th>
                          <th className="text-left text-[10px] font-semibold tracking-widest uppercase text-muted pb-2">Value</th>
                          <th className="text-left text-[10px] font-semibold tracking-widest uppercase text-muted pb-2">Content</th>
                          <th className="text-left text-[10px] font-semibold tracking-widest uppercase text-muted pb-2">Logged</th>
                        </tr>
                      </thead>
                      <tbody>
                        {platformMetrics.map((m) => (
                          <tr key={m.id} className="border-b border-border last:border-0">
                            <td className="py-2.5 pr-4">
                              <span className="text-xs text-dark">{formatMetricType(m.metric_type)}</span>
                            </td>
                            <td className="py-2.5 pr-4">
                              <span className="text-sm font-medium text-dark">{m.value}</span>
                            </td>
                            <td className="py-2.5 pr-4">
                              {m.published_content ? (
                                <a
                                  href={m.published_content.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-primary hover:underline"
                                >
                                  {m.published_content.title}
                                </a>
                              ) : (
                                <span className="text-xs text-muted">—</span>
                              )}
                            </td>
                            <td className="py-2.5">
                              <span className="text-xs text-muted">
                                {new Date(m.recorded_at).toLocaleDateString("en-US", {
                                  month: "short", day: "numeric",
                                })}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
