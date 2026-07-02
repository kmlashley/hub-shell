"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Snapshot {
  id: string;
  platform: string;
  count: number;
  source: string | null;
  recorded_at: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const PLATFORM_OPTIONS = ["Email", "Substack", "YouTube", "LinkedIn", "Instagram", "Twitter/X", "Podcast", "Other"];
const SOURCE_OPTIONS = ["Organic", "Referral", "Paid", "SEO", "Social", "Content", "Partnership", "Other"];

const PLATFORM_BADGE: Record<string, string> = {
  email: "bg-teal-tint text-primary",
  substack: "bg-gold-tint text-gold",
  youtube: "bg-rust-tint text-accent",
  linkedin: "bg-purple-tint text-purple",
  instagram: "bg-rust-tint text-accent",
  "twitter/x": "bg-border text-muted",
  podcast: "bg-olive-tint text-olive",
  other: "bg-border text-muted",
};

const QUICK_LINKS = [
  { name: "Kit", url: "https://app.kit.com" },
  { name: "Substack Dashboard", url: "https://substack.com/dashboard" },
  { name: "YouTube Studio", url: "https://studio.youtube.com" },
  { name: "LinkedIn Analytics", url: "https://www.linkedin.com/analytics/" },
  { name: "Instagram Insights", url: "https://www.instagram.com/insights/" },
];

const SUB_PAGES = [
  {
    href: "/growth/email",
    title: "Email Platform",
    description: "Deep dive into your email list — subscriber counts, broadcasts, and sequence performance.",
  },
  {
    href: "/distribution",
    title: "Distribution",
    description: "Compose and schedule posts across multiple social platforms from one place.",
  },
  {
    href: "/analytics",
    title: "Analytics",
    description: "Unified analytics across all platforms — the numbers that actually matter.",
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmtNum(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function weekKey(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return monday.toISOString().split("T")[0];
}

function last12Weeks(): string[] {
  const weeks: string[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    weeks.push(weekKey(d.toISOString()));
  }
  return weeks;
}

function shortWeek(wk: string) {
  return new Date(wk + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function GrowthPage() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [platform, setPlatform] = useState(PLATFORM_OPTIONS[0]);
  const [count, setCount] = useState("");
  const [source, setSource] = useState(SOURCE_OPTIONS[0]);
  const [recordedAt, setRecordedAt] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const r = await fetch("/api/growth/snapshots");
    if (r.ok) setSnapshots((await r.json()).snapshots ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function addSnapshot(ev: React.FormEvent) {
    ev.preventDefault();
    if (!count || saving) return;
    setSaving(true);
    await fetch("/api/growth/snapshots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform,
        count: parseInt(count),
        source,
        recorded_at: new Date(recordedAt + "T12:00:00").toISOString(),
      }),
    });
    setCount("");
    setShowForm(false);
    setSaving(false);
    load();
  }

  async function deleteSnapshot(id: string) {
    if (!window.confirm("Delete this snapshot?")) return;
    await fetch(`/api/growth/snapshots?id=${id}`, { method: "DELETE" });
    load();
  }

  // Latest + previous count per platform
  const platforms = [...new Set(snapshots.map((s) => s.platform))];
  const latestPerPlatform: Record<string, Snapshot> = {};
  const previousPerPlatform: Record<string, Snapshot> = {};
  for (const p of platforms) {
    const ps = snapshots
      .filter((s) => s.platform === p)
      .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());
    if (ps[0]) latestPerPlatform[p] = ps[0];
    if (ps[1]) previousPerPlatform[p] = ps[1];
  }

  const totalAudience = Object.values(latestPerPlatform).reduce((s, snap) => s + snap.count, 0);

  // 90-day trend — weekly total (latest count per platform per week, summed)
  const weeks = last12Weeks();
  const weeklyTotals = weeks.map((wk) => {
    const wkEnd = new Date(wk + "T23:59:59");
    wkEnd.setDate(wkEnd.getDate() + 6);
    let total = 0;
    for (const p of platforms) {
      const ps = snapshots
        .filter((s) => s.platform === p && new Date(s.recorded_at) <= wkEnd)
        .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());
      if (ps[0]) total += ps[0].count;
    }
    return { week: wk, total };
  });
  const maxTotal = Math.max(...weeklyTotals.map((w) => w.total), 1);

  // Source attribution
  const sourceCounts: Record<string, number> = {};
  for (const s of snapshots) {
    const src = s.source ?? "Unattributed";
    sourceCounts[src] = (sourceCounts[src] ?? 0) + 1;
  }
  const totalSourceCount = Object.values(sourceCounts).reduce((a, b) => a + b, 0);
  const sortedSources = Object.entries(sourceCounts).sort(([, a], [, b]) => b - a);

  return (
    <div className="max-w-5xl mx-auto">

      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="text-xs text-muted mb-2">
            <Link href="/" className="hover:text-dark transition-colors">Dashboard</Link>
            {" › "}
            <span className="text-dark">Growth</span>
          </p>
          <h1 className="text-2xl font-serif text-dark mb-1">Growth Hub</h1>
          <p className="text-sm text-muted">Audience growth across all platforms.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-primary text-white text-xs font-medium px-3 py-1.5 hover:bg-primary-hover transition-colors"
        >
          + Log Snapshot
        </button>
      </div>

      {/* Log snapshot form */}
      {showForm && (
        <form onSubmit={addSnapshot} className="bg-white border border-border p-4 mb-6 grid grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-dark mb-1">Platform</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
            >
              {PLATFORM_OPTIONS.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-dark mb-1">Count</label>
            <input
              type="number"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              required
              min="0"
              placeholder="e.g. 1250"
              autoFocus
              className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-dark mb-1">Primary Source</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
            >
              {SOURCE_OPTIONS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-dark mb-1">Date</label>
            <input
              type="date"
              value={recordedAt}
              onChange={(e) => setRecordedAt(e.target.value)}
              required
              className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="col-span-4 flex gap-2">
            <button
              type="submit"
              disabled={saving || !count}
              className="bg-primary text-white text-sm font-medium px-4 py-1.5 hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {saving ? "Saving…" : "Log Snapshot"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-1.5 border border-border text-sm text-muted hover:text-dark transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex flex-col gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-white border border-border animate-pulse" />
          ))}
        </div>
      ) : platforms.length === 0 ? (
        <>
          <div className="border border-dashed border-border p-16 text-center mb-6">
            <p className="text-sm text-muted mb-1">No growth data yet.</p>
            <p className="text-xs text-muted">Log your first snapshot to start tracking audience growth across platforms.</p>
          </div>

          {/* Sub-pages still visible even when empty */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {SUB_PAGES.map((page) => (
              <Link key={page.href} href={page.href} className="bg-white border border-border p-5 hover:border-primary/40 transition-colors group block">
                <p className="font-medium text-dark group-hover:text-primary transition-colors mb-1">{page.title}</p>
                <p className="text-xs text-muted leading-relaxed">{page.description}</p>
                <p className="text-xs text-primary mt-3">Open →</p>
              </Link>
            ))}
          </div>

          <QuickLinks />
        </>
      ) : (
        <>
          {/* Total audience banner */}
          <div className="bg-teal-tint border border-primary/20 px-5 py-4 flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-0.5">Total Audience</p>
              <p className="text-3xl font-bold text-dark">{fmtNum(totalAudience)}</p>
            </div>
            <p className="text-xs text-muted">Across {platforms.length} platform{platforms.length !== 1 ? "s" : ""}</p>
          </div>

          {/* Platform cards */}
          <div
            className={`grid gap-3 mb-6 ${
              platforms.length === 1
                ? "grid-cols-1"
                : platforms.length === 2
                ? "grid-cols-2"
                : platforms.length === 3
                ? "grid-cols-3"
                : "grid-cols-4"
            }`}
          >
            {platforms.map((p) => {
              const latest = latestPerPlatform[p];
              const prev = previousPerPlatform[p];
              const delta = prev ? latest.count - prev.count : null;
              const pKey = p.toLowerCase();
              return (
                <div key={p} className="bg-white border border-border p-5">
                  <span className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 ${PLATFORM_BADGE[pKey] ?? "bg-border text-muted"}`}>
                    {p}
                  </span>
                  <p className="text-2xl font-bold text-dark mt-3 mb-0.5">{fmtNum(latest.count)}</p>
                  {delta !== null ? (
                    <p className={`text-xs ${delta >= 0 ? "text-primary" : "text-accent"}`}>
                      {delta >= 0 ? "+" : ""}{fmtNum(delta)} since last snapshot
                    </p>
                  ) : (
                    <p className="text-xs text-muted">First snapshot</p>
                  )}
                  <p className="text-[11px] text-muted mt-1">
                    {new Date(latest.recorded_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
              );
            })}
          </div>

          {/* 90-day trend chart */}
          <div className="bg-white border border-border p-5 mb-4">
            <h3 className="font-medium text-dark mb-6">90-Day Audience Trend</h3>
            <div className="flex items-end gap-1 h-32">
              {weeklyTotals.map((w) => (
                <div key={w.week} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-primary transition-all"
                    style={{
                      height: w.total > 0 ? `${(w.total / maxTotal) * 100}%` : "2px",
                      minHeight: "2px",
                      opacity: w.total > 0 ? 1 : 0.12,
                    }}
                    title={`${shortWeek(w.week)}: ${fmtNum(w.total)}`}
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
              <p className="text-[11px] text-muted">{shortWeek(weeks[0])}</p>
              <p className="text-[11px] text-muted">Today</p>
            </div>
          </div>

          {/* Source attribution */}
          {sortedSources.length > 0 && (
            <div className="bg-white border border-border p-5 mb-6">
              <h3 className="font-medium text-dark mb-4">Source Attribution</h3>
              <div className="flex flex-col gap-3">
                {sortedSources.map(([src, cnt]) => {
                  const pct = totalSourceCount > 0 ? (cnt / totalSourceCount) * 100 : 0;
                  return (
                    <div key={src}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-dark">{src}</span>
                        <span className="text-xs text-muted">
                          {cnt} snapshot{cnt !== 1 ? "s" : ""} · {pct.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-border">
                        <div className="h-1.5 bg-primary transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent snapshots */}
          <div className="bg-white border border-border mb-6">
            <div className="px-5 py-3.5 border-b border-border">
              <h3 className="text-sm font-medium text-dark">Recent Snapshots</h3>
            </div>
            <div className="divide-y divide-border">
              {snapshots.slice(0, 10).map((s) => {
                const pKey = s.platform.toLowerCase();
                return (
                  <div key={s.id} className="flex items-center gap-4 px-5 py-3 group hover:bg-light transition-colors">
                    <span className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 shrink-0 ${PLATFORM_BADGE[pKey] ?? "bg-border text-muted"}`}>
                      {s.platform}
                    </span>
                    <span className="text-sm font-medium text-dark">{fmtNum(s.count)}</span>
                    {s.source && (
                      <span className="text-xs text-muted">{s.source}</span>
                    )}
                    <span className="text-xs text-muted ml-auto shrink-0">
                      {new Date(s.recorded_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                    <button
                      onClick={() => deleteSnapshot(s.id)}
                      className="text-xs text-muted hover:text-accent transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                    >
                      Delete
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sub-pages nav */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {SUB_PAGES.map((page) => (
              <Link key={page.href} href={page.href} className="bg-white border border-border p-5 hover:border-primary/40 transition-colors group block">
                <p className="font-medium text-dark group-hover:text-primary transition-colors mb-1">{page.title}</p>
                <p className="text-xs text-muted leading-relaxed">{page.description}</p>
                <p className="text-xs text-primary mt-3">Open →</p>
              </Link>
            ))}
          </div>

          <QuickLinks />
        </>
      )}
    </div>
  );
}

// ─── Quick Links ───────────────────────────────────────────────────────────────

function QuickLinks() {
  return (
    <div className="bg-white border border-border p-5">
      <h3 className="font-medium text-dark mb-3">Platform Dashboards</h3>
      <div className="flex flex-wrap gap-2">
        {QUICK_LINKS.map((link) => (
          <a
            key={link.name}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium px-3 py-1.5 border border-border text-dark hover:border-primary/40 hover:text-primary transition-colors"
          >
            {link.name} ↗
          </a>
        ))}
      </div>
    </div>
  );
}
