"use client";

import { useState } from "react";

const CLUSTER_CONFIG = {
  informational: {
    label: "Informational",
    color: "text-primary",
    bg: "bg-teal-tint",
    desc: "Educational, how-to, and definitional queries",
  },
  commercial: {
    label: "Commercial",
    color: "text-gold",
    bg: "bg-gold-tint",
    desc: "Comparison, best-of, tool, and purchase-intent queries",
  },
  navigational: {
    label: "Navigational",
    color: "text-olive",
    bg: "bg-olive-tint",
    desc: "Brand and destination queries specific to this niche",
  },
} as const;

type ClusterKey = keyof typeof CLUSTER_CONFIG;

interface KeywordEntry {
  keyword: string;
  intent: string;
  content_angle: string;
  headline: string;
}

interface ResearchResult {
  topic_summary: string;
  clusters: {
    informational: KeywordEntry[];
    commercial: KeywordEntry[];
    navigational: KeywordEntry[];
  };
}

export default function KeywordResearchPage() {
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeCluster, setActiveCluster] = useState<ClusterKey>("informational");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleResearch() {
    if (!topic.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSaved(false);

    try {
      const res = await fetch("/api/content/keyword-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, audience }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "Research failed");
      setResult(data.result);
      setActiveCluster("informational");
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
      await fetch("/api/content/keyword-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, audience, results: result, save: true }),
      });
      setSaved(true);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  function handleCopyAll() {
    if (!result) return;
    const lines: string[] = [`# Keyword Research: ${topic}`, "", result.topic_summary, ""];
    for (const key of Object.keys(CLUSTER_CONFIG) as ClusterKey[]) {
      const cluster = result.clusters[key];
      if (!cluster?.length) continue;
      lines.push(`## ${CLUSTER_CONFIG[key].label}`, "");
      for (const kw of cluster) {
        lines.push(`**${kw.keyword}**`);
        lines.push(`Intent: ${kw.intent}`);
        lines.push(`Angle: ${kw.content_angle}`);
        lines.push(`Headline: ${kw.headline}`);
        lines.push("");
      }
    }
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleExportJson() {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `keywords-${topic.replace(/\s+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const activeKeywords = result?.clusters[activeCluster] ?? [];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-serif text-dark mb-1">Keyword Research</h1>
        <p className="text-sm text-muted">
          Enter a topic or niche. Get keyword clusters with intent, content angles, and headline ideas.
        </p>
      </div>

      {/* Input area */}
      <div className="bg-white border border-border p-5 mb-4">
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-[10px] font-semibold tracking-widest uppercase text-muted block mb-1.5">
              Topic or Niche
            </label>
            <input
              type="text"
              className="w-full text-sm text-dark placeholder:text-muted bg-transparent outline-none border border-border px-3 py-2 focus:border-primary/50 transition-colors"
              placeholder="e.g. content marketing for freelancers, AI tools for small business…"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleResearch()}
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold tracking-widest uppercase text-muted block mb-1.5">
              Target Audience{" "}
              <span className="normal-case font-normal tracking-normal">(optional)</span>
            </label>
            <input
              type="text"
              className="w-full text-sm text-dark placeholder:text-muted bg-transparent outline-none border border-border px-3 py-2 focus:border-primary/50 transition-colors"
              placeholder="e.g. freelance designers, early-stage SaaS founders…"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleResearch()}
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleResearch}
              disabled={loading || !topic.trim()}
              className="bg-primary text-white text-sm px-5 py-2 hover:bg-primary-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "Researching…" : "Research keywords"}
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
          <p className="text-sm text-muted">Searching and synthesizing keyword data…</p>
          <p className="text-xs text-muted mt-1.5">This usually takes 15–25 seconds.</p>
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-4">

          {/* Landscape summary */}
          <div className="bg-white border border-border p-5">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-2">
              Landscape Overview
            </p>
            <p className="text-sm text-dark leading-relaxed">{result.topic_summary}</p>
          </div>

          {/* Cluster tabs + keywords */}
          <div className="bg-white border border-border">
            <div className="flex border-b border-border">
              {(Object.keys(CLUSTER_CONFIG) as ClusterKey[]).map((key) => {
                const cfg = CLUSTER_CONFIG[key];
                const count = result.clusters[key]?.length ?? 0;
                const isActive = activeCluster === key;
                return (
                  <button
                    key={key}
                    onClick={() => setActiveCluster(key)}
                    className={`flex-1 px-4 py-3 text-sm transition-colors border-b-2 ${
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
              <p className="text-xs text-muted mb-4">
                {CLUSTER_CONFIG[activeCluster].desc}
              </p>
              <div className="flex flex-col gap-3">
                {activeKeywords.map((kw, i) => (
                  <div
                    key={i}
                    className="border border-border p-4 hover:border-primary/20 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4 mb-2.5">
                      <code className="text-sm font-mono text-dark bg-light px-2 py-1 leading-none">
                        {kw.keyword}
                      </code>
                      <span className="text-xs text-muted shrink-0 mt-0.5 text-right max-w-[40%]">
                        {kw.intent}
                      </span>
                    </div>
                    <p className="text-xs text-muted leading-snug mb-3">
                      <span className="font-medium text-dark/70">Angle: </span>
                      {kw.content_angle}
                    </p>
                    <div
                      className={`${CLUSTER_CONFIG[activeCluster].bg} px-3 py-2.5`}
                    >
                      <p
                        className={`text-[10px] font-semibold tracking-widest uppercase ${CLUSTER_CONFIG[activeCluster].color} mb-1`}
                      >
                        Headline
                      </p>
                      <p className="text-sm font-medium text-dark leading-snug">
                        {kw.headline}
                      </p>
                    </div>
                  </div>
                ))}
                {activeKeywords.length === 0 && (
                  <p className="text-sm text-muted py-4 text-center">
                    No keywords in this cluster.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pb-4">
            <div className="flex gap-2">
              <button
                onClick={handleCopyAll}
                className="text-sm border border-border px-4 py-2 text-muted hover:text-dark hover:border-dark/20 transition-colors"
              >
                {copied ? "Copied ✓" : "Copy all"}
              </button>
              <button
                onClick={handleExportJson}
                className="text-sm border border-border px-4 py-2 text-muted hover:text-dark hover:border-dark/20 transition-colors"
              >
                Export JSON
              </button>
            </div>
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
