"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Note {
  id: string;
  content: string;
  status: "Draft" | "Ready" | "Posted";
  tags: string[];
  category: string | null;
  posted_at: string | null;
  created_at: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<Note["status"], { color: string; bg: string }> = {
  Draft:  { color: "text-muted",   bg: "bg-light" },
  Ready:  { color: "text-primary", bg: "bg-teal-tint" },
  Posted: { color: "text-olive",   bg: "bg-olive-tint" },
};

const SUB_PAGES = [
  {
    href: "/substack/notes",
    title: "Notes Manager",
    description: "Create, draft, and track Substack Notes from idea to posted.",
  },
  {
    href: "/substack/notes-gen",
    title: "Note Generator",
    description: "Generate note drafts from a topic, observation, or pasted content.",
  },
  {
    href: "/substack/community-feed",
    title: "Community Feed",
    description: "Curated feed of Substack publications you follow.",
  },
];

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function SubstackHubPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/substack/notes")
      .then((r) => {
        if (!r.ok) throw new Error(`API returned ${r.status}`);
        return r.json();
      })
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setNotes(d.notes ?? []);
      })
      .catch((e) => setFetchError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const notesThisWeek = notes.filter((n) => new Date(n.created_at) >= sevenDaysAgo).length;
  const drafts  = notes.filter((n) => n.status === "Draft").length;
  const ready   = notes.filter((n) => n.status === "Ready").length;
  const posted  = notes.filter((n) => n.status === "Posted").length;
  const recentNotes = notes.slice(0, 6);

  return (
    <div className="max-w-5xl mx-auto">

      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="text-xs text-muted mb-2">
            <Link href="/" className="hover:text-dark transition-colors">Dashboard</Link>
            {" › "}
            <span className="text-dark">Substack</span>
          </p>
          <h1 className="text-2xl font-serif text-dark mb-1">Substack Hub</h1>
          <p className="text-sm text-muted">Overview of your Substack activity.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/substack/notes-gen"
            className="bg-primary text-white text-xs font-medium px-3 py-1.5 hover:bg-primary-hover transition-colors"
          >
            + Generate Note
          </Link>
          <a
            href="https://substack.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium px-3 py-1.5 border border-border text-dark hover:border-primary/40 hover:text-primary transition-colors"
          >
            Substack ↗
          </a>
        </div>
      </div>

      {fetchError && (
        <div className="bg-rust-tint border border-accent/30 px-4 py-3 mb-6 text-sm text-accent">
          API error: {fetchError}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <StatCard label="Notes This Week" value={loading ? "—" : String(notesThisWeek)} color="primary" />
        <StatCard label="Drafts"          value={loading ? "—" : String(drafts)}         color="gold"    />
        <StatCard label="Ready to Post"   value={loading ? "—" : String(ready)}          color="olive"   />
        <StatCard label="Posted Total"    value={loading ? "—" : String(posted)}         color="accent"  />
      </div>

      {/* Subscriber placeholder */}
      <div className="bg-white border border-border px-5 py-4 mb-6 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-0.5">
            Substack Subscribers
          </p>
          <p className="text-2xl font-bold text-dark">—</p>
          <p className="text-xs text-muted mt-0.5">No official API · check your Substack dashboard</p>
        </div>
        <a
          href="https://substack.com/dashboard"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium px-3 py-1.5 border border-border text-dark hover:border-primary/40 hover:text-primary transition-colors"
        >
          View Dashboard ↗
        </a>
      </div>

      {/* Recent notes + sub-page nav */}
      <div className="grid grid-cols-3 gap-6">

        {/* Recent notes */}
        <div className="col-span-2 bg-white border border-border">
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-medium text-dark">Recent Notes</h2>
            <Link
              href="/substack/notes"
              className="text-xs text-primary hover:text-primary-hover transition-colors"
            >
              View all →
            </Link>
          </div>

          {loading ? (
            <div className="divide-y divide-border">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="px-5 py-4 animate-pulse">
                  <div className="h-3 bg-border w-3/4 mb-2" />
                  <div className="h-3 bg-border w-1/4" />
                </div>
              ))}
            </div>
          ) : recentNotes.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-muted mb-2">No notes yet.</p>
              <Link
                href="/substack/notes"
                className="text-xs text-primary hover:text-primary-hover transition-colors"
              >
                Create your first note →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentNotes.map((note) => {
                const cfg = STATUS_CONFIG[note.status];
                return (
                  <Link
                    key={note.id}
                    href="/substack/notes"
                    className="flex items-start gap-3 px-5 py-4 hover:bg-light transition-colors group block"
                  >
                    <span
                      className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 shrink-0 mt-0.5 ${cfg.bg} ${cfg.color}`}
                    >
                      {note.status}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-dark leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                        {note.content}
                      </p>
                      {note.tags.length > 0 && (
                        <p className="text-xs text-muted mt-1">{note.tags.join(", ")}</p>
                      )}
                    </div>
                    <span className="text-xs text-muted shrink-0 ml-auto">
                      {new Date(note.created_at).toLocaleDateString("en-US", {
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

        {/* Sub-page nav */}
        <div className="flex flex-col gap-3">
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
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

type StatColor = "primary" | "gold" | "olive" | "accent";

const COLOR_TEXT: Record<StatColor, string> = {
  primary: "text-primary",
  gold:    "text-gold",
  olive:   "text-olive",
  accent:  "text-accent",
};

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: StatColor;
}) {
  return (
    <div className="bg-white border border-border p-5">
      <p className={`text-3xl font-bold ${COLOR_TEXT[color]} mb-1`}>{value}</p>
      <p className="text-xs text-muted leading-snug">{label}</p>
    </div>
  );
}
