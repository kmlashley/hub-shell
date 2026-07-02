"use client";

import { useState } from "react";

const SIGNAL_CONFIG = {
  notes: { label: "Notes", color: "text-primary", bg: "bg-teal-tint" },
  shares: { label: "Shares", color: "text-purple", bg: "bg-purple-tint" },
  comments: { label: "Comments", color: "text-gold", bg: "bg-gold-tint" },
  general: { label: "Engagement", color: "text-muted", bg: "bg-light" },
} as const;

const FREQ_CONFIG = {
  frequent: { label: "Frequent", color: "text-primary", bg: "bg-teal-tint" },
  occasional: { label: "Occasional", color: "text-gold", bg: "bg-gold-tint" },
  rare: { label: "Rare", color: "text-muted", bg: "bg-light" },
} as const;

interface PostType {
  type: string;
  description: string;
  example_titles: string[];
  why_it_works: string;
}

interface EngagementPattern {
  pattern: string;
  signal: "notes" | "shares" | "comments" | "general";
  example: string;
}

interface ContentGap {
  gap: string;
  audience_need: string;
  your_opportunity: string;
}

interface NotesPattern {
  pattern: string;
  frequency: "frequent" | "occasional" | "rare";
}

interface SubstackResult {
  publication_name: string;
  topic: string;
  tone: string;
  cadence: string;
  publication_summary: string;
  top_post_types: PostType[];
  engagement_patterns: EngagementPattern[];
  content_gaps: ContentGap[];
  notes_patterns: NotesPattern[];
}

function SectionHeader({ label }: { label: string }) {
  return (
    <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-4">
      {label}
    </p>
  );
}

export default function SubstackResearchPage() {
  const [publicationUrl, setPublicationUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SubstackResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleResearch() {
    if (!publicationUrl.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSaved(false);

    try {
      const res = await fetch("/api/content/substack-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publication_url: publicationUrl }),
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
      await fetch("/api/content/substack-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publication_url: publicationUrl,
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
        <h1 className="text-2xl font-serif text-dark mb-1">Substack Research</h1>
        <p className="text-sm text-muted">
          Enter any Substack URL. Get a full breakdown of their content patterns, engagement signals, and gaps you can exploit.
        </p>
      </div>

      {/* Input */}
      <div className="bg-white border border-border p-5 mb-4">
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-[10px] font-semibold tracking-widest uppercase text-muted block mb-1.5">
              Substack URL
            </label>
            <input
              type="text"
              className="w-full text-sm text-dark placeholder:text-muted bg-transparent outline-none border border-border px-3 py-2 focus:border-primary/50 transition-colors"
              placeholder="https://example.substack.com"
              value={publicationUrl}
              onChange={(e) => setPublicationUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleResearch()}
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleResearch}
              disabled={loading || !publicationUrl.trim()}
              className="bg-primary text-white text-sm px-5 py-2 hover:bg-primary-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "Researching…" : "Research publication"}
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
          <p className="text-sm text-muted">Scraping and analyzing publication…</p>
          <p className="text-xs text-muted mt-1.5">
            Pulling main page, archive, and notes. Takes 20–40 seconds.
          </p>
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-4">

          {/* Publication summary */}
          <div className="bg-white border border-border p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-serif text-dark mb-0.5">{result.publication_name}</h2>
                <p className="text-xs text-muted">{result.cadence}</p>
              </div>
            </div>
            <p className="text-sm text-dark leading-relaxed mb-4">{result.publication_summary}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-light px-3 py-2.5">
                <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-1">Topic</p>
                <p className="text-xs text-dark leading-snug">{result.topic}</p>
              </div>
              <div className="bg-light px-3 py-2.5">
                <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-1">Tone & Voice</p>
                <p className="text-xs text-dark leading-snug">{result.tone}</p>
              </div>
            </div>
          </div>

          {/* Top post types */}
          <div className="bg-white border border-border p-5">
            <SectionHeader label="Top Performing Post Types" />
            <div className="flex flex-col gap-3">
              {result.top_post_types.map((pt, i) => (
                <div key={i} className="border border-border p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-primary w-5 h-5 bg-teal-tint flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <p className="text-sm font-medium text-dark">{pt.type}</p>
                  </div>
                  <p className="text-xs text-muted leading-snug mb-3">{pt.description}</p>
                  {pt.example_titles.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-1.5">
                        Example titles
                      </p>
                      <ul className="flex flex-col gap-1">
                        {pt.example_titles.map((title, j) => (
                          <li key={j} className="text-xs text-dark/70 before:content-['—'] before:mr-1.5 before:text-muted">
                            {title}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="bg-teal-tint px-3 py-2">
                    <p className="text-[10px] font-semibold tracking-widest uppercase text-primary mb-0.5">
                      Why it works
                    </p>
                    <p className="text-xs text-dark leading-snug">{pt.why_it_works}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Engagement patterns */}
          <div className="bg-white border border-border p-5">
            <SectionHeader label="Engagement Patterns" />
            <div className="flex flex-col gap-2">
              {result.engagement_patterns.map((ep, i) => {
                const cfg = SIGNAL_CONFIG[ep.signal] ?? SIGNAL_CONFIG.general;
                return (
                  <div key={i} className="border border-border px-4 py-3 flex items-start gap-3">
                    <span
                      className={`text-[10px] font-semibold tracking-widest uppercase px-2 py-0.5 shrink-0 mt-0.5 ${cfg.bg} ${cfg.color}`}
                    >
                      {cfg.label}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-dark mb-0.5">{ep.pattern}</p>
                      <p className="text-xs text-muted leading-snug">{ep.example}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Content gaps */}
          <div className="bg-white border border-border p-5">
            <SectionHeader label="Content Gaps" />
            <div className="flex flex-col gap-3">
              {result.content_gaps.map((gap, i) => (
                <div key={i} className="border border-border p-4">
                  <p className="text-sm font-medium text-dark mb-2">{gap.gap}</p>
                  <p className="text-xs text-muted leading-snug mb-3">
                    <span className="font-medium text-dark/70">Why their audience needs it: </span>
                    {gap.audience_need}
                  </p>
                  <div className="bg-rust-tint px-3 py-2.5">
                    <p className="text-[10px] font-semibold tracking-widest uppercase text-accent mb-1">
                      Your opportunity
                    </p>
                    <p className="text-sm text-dark leading-snug">{gap.your_opportunity}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes patterns */}
          {result.notes_patterns.length > 0 && (
            <div className="bg-white border border-border p-5">
              <SectionHeader label="Notes Strategy" />
              <div className="flex flex-col gap-2">
                {result.notes_patterns.map((np, i) => {
                  const cfg = FREQ_CONFIG[np.frequency] ?? FREQ_CONFIG.occasional;
                  return (
                    <div key={i} className="border border-border px-4 py-3 flex items-start gap-3">
                      <span
                        className={`text-[10px] font-semibold tracking-widest uppercase px-2 py-0.5 shrink-0 mt-0.5 ${cfg.bg} ${cfg.color}`}
                      >
                        {cfg.label}
                      </span>
                      <p className="text-sm text-dark leading-snug">{np.pattern}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end pb-4">
            <button
              onClick={handleSave}
              disabled={saving || saved}
              className="text-sm border border-border px-4 py-2 text-muted hover:text-dark hover:border-dark/20 transition-colors disabled:opacity-40"
            >
              {saved ? "Saved to history ✓" : saving ? "Saving…" : "Save as competitor profile"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
