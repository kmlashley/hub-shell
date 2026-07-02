"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// ─── Types ─────────────────────────────────────────────────────────────────────

type ScriptStatus = "Idea" | "Drafting" | "Ready" | "Recorded";

interface Script {
  id: string;
  title: string;
  status: ScriptStatus;
  hook: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ScriptStatus, { color: string; bg: string }> = {
  Idea:     { color: "text-muted",   bg: "bg-light" },
  Drafting: { color: "text-gold",    bg: "bg-gold-tint" },
  Ready:    { color: "text-primary", bg: "bg-teal-tint" },
  Recorded: { color: "text-purple",  bg: "bg-purple-tint" },
};

const SUB_PAGES = [
  {
    href: "/youtube/scripting",
    title: "Scripting",
    description: "Write and manage YouTube scripts with hook, body, and CTA sections.",
  },
  {
    href: "/content/youtube-scripts",
    title: "Script Library",
    description: "Full script editor with status pipeline and hook generator.",
  },
  {
    href: "/content/youtube-research",
    title: "YouTube Research",
    description: "Research channels and topics — find gaps and angles before you film.",
  },
];

const QUICK_LINKS = [
  { name: "YouTube Studio", url: "https://studio.youtube.com" },
  { name: "Analytics", url: "https://studio.youtube.com/channel/analytics" },
  { name: "Comments", url: "https://studio.youtube.com/channel/comments" },
  { name: "Upload Video", url: "https://studio.youtube.com/channel/videos/upload" },
];

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function YouTubeHubPage() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/content/youtube-scripts")
      .then((r) => r.json())
      .then((d) => setScripts(d.scripts ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const ideas    = scripts.filter((s) => s.status === "Idea");
  const drafting = scripts.filter((s) => s.status === "Drafting");
  const ready    = scripts.filter((s) => s.status === "Ready");
  const recorded = scripts.filter((s) => s.status === "Recorded");

  const backlog = [...ideas, ...drafting].slice(0, 8);

  return (
    <div className="max-w-5xl mx-auto">

      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="text-xs text-muted mb-2">
            <Link href="/" className="hover:text-dark transition-colors">Dashboard</Link>
            {" › "}
            <span className="text-dark">YouTube</span>
          </p>
          <h1 className="text-2xl font-serif text-dark mb-1">YouTube Hub</h1>
          <p className="text-sm text-muted">Channel overview, ideas backlog, and scripting.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/youtube/scripting"
            className="bg-primary text-white text-xs font-medium px-3 py-1.5 hover:bg-primary-hover transition-colors"
          >
            + New Script
          </Link>
          <a
            href="https://studio.youtube.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium px-3 py-1.5 border border-border text-dark hover:border-primary/40 hover:text-primary transition-colors"
          >
            YouTube Studio ↗
          </a>
        </div>
      </div>

      {/* Channel stats — placeholder (no public API without OAuth) */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Subscribers",       note: "Check YouTube Studio" },
          { label: "Views This Month",  note: "Check YouTube Studio" },
          { label: "Avg. Watch Time",   note: "Check YouTube Studio" },
        ].map(({ label, note }) => (
          <div key={label} className="bg-white border border-border p-5">
            <p className="text-3xl font-bold text-muted mb-1">—</p>
            <p className="text-xs text-dark font-medium leading-snug">{label}</p>
            <p className="text-[11px] text-muted mt-0.5">{note}</p>
          </div>
        ))}
      </div>

      {/* API note */}
      <div className="bg-gold-tint border border-gold/20 px-4 py-3 mb-6 flex items-center justify-between">
        <p className="text-xs text-dark">
          <span className="font-medium">YouTube Data API</span> — live stats require OAuth authentication.
          For now, check YouTube Studio directly.
        </p>
        <a
          href="https://studio.youtube.com/channel/analytics"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-gold hover:text-dark transition-colors shrink-0 ml-4"
        >
          Open Analytics ↗
        </a>
      </div>

      <div className="grid grid-cols-3 gap-6">

        {/* Ideas backlog */}
        <div className="col-span-2">
          <div className="bg-white border border-border">
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-sm font-medium text-dark">Ideas Backlog</h2>
                <p className="text-xs text-muted mt-0.5">
                  {ideas.length} idea{ideas.length !== 1 ? "s" : ""} · {drafting.length} in progress
                </p>
              </div>
              <Link
                href="/youtube/scripting"
                className="text-xs text-primary hover:text-primary-hover transition-colors"
              >
                View all →
              </Link>
            </div>

            {loading ? (
              <div className="divide-y divide-border">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="px-5 py-4 animate-pulse">
                    <div className="h-3 bg-border w-1/4 mb-2" />
                    <div className="h-4 bg-border w-2/3" />
                  </div>
                ))}
              </div>
            ) : backlog.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <p className="text-sm text-muted mb-2">No ideas in the backlog yet.</p>
                <Link
                  href="/youtube/scripting"
                  className="text-xs text-primary hover:text-primary-hover transition-colors"
                >
                  Add your first video idea →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {backlog.map((script) => {
                  const cfg = STATUS_CONFIG[script.status];
                  return (
                    <Link
                      key={script.id}
                      href="/youtube/scripting"
                      className="flex items-center gap-3 px-5 py-3.5 hover:bg-light transition-colors group block"
                    >
                      <span className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 shrink-0 ${cfg.bg} ${cfg.color}`}>
                        {script.status}
                      </span>
                      <p className="text-sm text-dark flex-1 truncate group-hover:text-primary transition-colors">
                        {script.title}
                      </p>
                      <span className="text-xs text-muted shrink-0">
                        {new Date(script.updated_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pipeline summary */}
          {!loading && scripts.length > 0 && (
            <div className="grid grid-cols-4 gap-2 mt-3">
              {(["Idea", "Drafting", "Ready", "Recorded"] as ScriptStatus[]).map((s) => {
                const count = scripts.filter((sc) => sc.status === s).length;
                const cfg = STATUS_CONFIG[s];
                return (
                  <div key={s} className="bg-white border border-border px-4 py-3 text-center">
                    <p className={`text-xl font-bold ${cfg.color} mb-0.5`}>{count}</p>
                    <p className="text-[11px] text-muted">{s}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-3">

          {/* Sub-page nav */}
          {SUB_PAGES.map((page) => (
            <Link
              key={page.href}
              href={page.href}
              className="bg-white border border-border p-5 hover:border-primary/40 transition-colors group block"
            >
              <p className="font-medium text-dark group-hover:text-primary transition-colors mb-1">
                {page.title}
              </p>
              <p className="text-xs text-muted leading-relaxed">{page.description}</p>
              <p className="text-xs text-primary mt-3">Open →</p>
            </Link>
          ))}

          {/* Quick links */}
          <div className="bg-white border border-border p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-3">
              Quick Links
            </p>
            <div className="flex flex-col gap-1.5">
              {QUICK_LINKS.map((link) => (
                <a
                  key={link.name}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-dark/70 hover:text-primary transition-colors py-0.5"
                >
                  {link.name} ↗
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
