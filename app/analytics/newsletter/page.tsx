"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Broadcast {
  id: string | number;
  subject: string;
  sent_at: string | null;
  status: string;
  recipients?: number | null;
  open_rate?: number | null;
  click_rate?: number | null;
  unsubscribes?: number | null;
}

interface Subscriber {
  id: string | number;
  email: string;
  created_at: string;
  tags?: string[];
}

interface EmailData {
  platform: string;
  overview: {
    totalSubscribers: number;
    growthThisMonth: number;
    activeSequences: number;
  };
  subscribers: Subscriber[];
  broadcasts: Broadcast[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function pct(n: number | null | undefined) {
  if (n == null) return "—";
  return `${(n < 1 ? n * 100 : n).toFixed(1)}%`;
}

function fmtNum(n: number | null | undefined) {
  if (n == null) return "—";
  return n.toLocaleString();
}

function monthKey(dateStr: string) {
  return dateStr.slice(0, 7);
}

function monthLabel(ym: string) {
  const [y, m] = ym.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function relDate(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function NewsletterAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [data, setData] = useState<EmailData | null>(null);

  useEffect(() => {
    fetch("/api/growth/email")
      .then((r) => r.json())
      .then((json) => {
        setConnected(json.connected ?? false);
        setData(json.data ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <p className="text-xs text-muted mb-2">
          <Link href="/" className="hover:text-dark transition-colors">Dashboard</Link>
          {" › "}
          <Link href="/analytics" className="hover:text-dark transition-colors">Analytics</Link>
          {" › "}
          <span className="text-dark">Newsletter</span>
        </p>
        <h1 className="text-2xl font-serif text-dark mb-1">Newsletter Analytics</h1>
        <p className="text-sm text-muted">
          Open rates, click rates, subscriber growth, and best-performing sends.
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-white border border-border animate-pulse" />
          ))}
        </div>
      ) : !connected || !data ? (
        <NotConnected />
      ) : (
        <NewsletterDashboard data={data} />
      )}
    </div>
  );
}

// ─── Not Connected ─────────────────────────────────────────────────────────────

function NotConnected() {
  return (
    <div className="border border-dashed border-border p-10 text-center">
      <p className="text-sm font-medium text-dark mb-1">Email platform not connected</p>
      <p className="text-sm text-muted mb-4">
        Connect your email platform on the{" "}
        <Link href="/growth/email" className="text-primary hover:underline">
          Email Platform
        </Link>{" "}
        page to see newsletter analytics here.
      </p>
    </div>
  );
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────

function NewsletterDashboard({ data }: { data: EmailData }) {
  const broadcasts = data.broadcasts ?? [];
  const subscribers = data.subscribers ?? [];

  // Stats from broadcasts
  const sentBroadcasts = broadcasts.filter((b) => b.status === "sent" && b.open_rate != null);
  const avgOpenRate = sentBroadcasts.length > 0
    ? sentBroadcasts.reduce((s, b) => s + (b.open_rate! < 1 ? b.open_rate! * 100 : b.open_rate!), 0) / sentBroadcasts.length
    : null;
  const avgClickRate = sentBroadcasts.filter((b) => b.click_rate != null).length > 0
    ? sentBroadcasts.reduce((s, b) => s + (b.click_rate != null ? (b.click_rate < 1 ? b.click_rate * 100 : b.click_rate) : 0), 0) / sentBroadcasts.filter(b => b.click_rate != null).length
    : null;
  const totalUnsubscribes = sentBroadcasts.reduce((s, b) => s + (b.unsubscribes ?? 0), 0);

  // Subscriber growth by month
  const monthGroups: Record<string, number> = {};
  for (const s of subscribers) {
    if (!s.created_at) continue;
    const mk = monthKey(s.created_at);
    monthGroups[mk] = (monthGroups[mk] ?? 0) + 1;
  }
  const months = Object.keys(monthGroups).sort();
  const maxInMonth = Math.max(...Object.values(monthGroups), 1);

  // Best subject lines by open rate
  const bestSubjects = [...sentBroadcasts]
    .sort((a, b) => {
      const ar = a.open_rate != null ? (a.open_rate < 1 ? a.open_rate * 100 : a.open_rate) : 0;
      const br = b.open_rate != null ? (b.open_rate < 1 ? b.open_rate * 100 : b.open_rate) : 0;
      return br - ar;
    })
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-6">

      {/* Overview stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white border border-border p-5">
          <p className="text-2xl font-bold text-dark mb-1">{fmtNum(data.overview.totalSubscribers)}</p>
          <p className="text-xs text-muted">Total subscribers</p>
        </div>
        <div className="bg-white border border-border p-5">
          <p className="text-2xl font-bold text-dark mb-1">+{fmtNum(data.overview.growthThisMonth)}</p>
          <p className="text-xs text-muted">New this month</p>
        </div>
        <div className="bg-white border border-border p-5">
          <p className="text-2xl font-bold text-dark mb-1">
            {avgOpenRate != null ? `${avgOpenRate.toFixed(1)}%` : "—"}
          </p>
          <p className="text-xs text-muted">Avg open rate</p>
        </div>
        <div className="bg-white border border-border p-5">
          <p className="text-2xl font-bold text-dark mb-1">
            {avgClickRate != null ? `${avgClickRate.toFixed(1)}%` : "—"}
          </p>
          <p className="text-xs text-muted">Avg click rate</p>
        </div>
      </div>

      {/* Recent broadcasts */}
      {broadcasts.length > 0 && (
        <div className="bg-white border border-border">
          <div className="px-5 py-3.5 border-b border-border">
            <h3 className="text-sm font-medium text-dark">Recent Broadcasts</h3>
          </div>
          <div className="grid grid-cols-5 px-5 py-2.5 border-b border-border bg-light">
            <span className="col-span-2 text-xs font-semibold uppercase tracking-wider text-muted">Subject</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted text-right">Sent to</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted text-right">Open rate</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted text-right">Click rate</span>
          </div>
          <div className="divide-y divide-border">
            {broadcasts.map((b) => {
              const openR = b.open_rate != null ? (b.open_rate < 1 ? b.open_rate * 100 : b.open_rate) : null;
              const clickR = b.click_rate != null ? (b.click_rate < 1 ? b.click_rate * 100 : b.click_rate) : null;
              return (
                <div key={b.id} className="grid grid-cols-5 px-5 py-3.5 hover:bg-light transition-colors">
                  <div className="col-span-2 min-w-0 pr-4">
                    <p className="text-sm text-dark truncate">{b.subject}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-muted">{relDate(b.sent_at)}</p>
                      {b.status === "draft" && (
                        <span className="text-[10px] bg-gold-tint text-gold px-1.5 py-0.5 font-semibold uppercase tracking-wider">Draft</span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted text-right self-center">{fmtNum(b.recipients)}</p>
                  <p className={`text-sm font-medium text-right self-center ${openR != null ? (openR >= 30 ? "text-primary" : openR < 20 ? "text-accent" : "text-dark") : "text-muted"}`}>
                    {openR != null ? `${openR.toFixed(1)}%` : "—"}
                  </p>
                  <p className={`text-sm font-medium text-right self-center ${clickR != null ? "text-dark" : "text-muted"}`}>
                    {clickR != null ? `${clickR.toFixed(1)}%` : "—"}
                  </p>
                </div>
              );
            })}
          </div>
          {totalUnsubscribes > 0 && (
            <div className="px-5 py-3 bg-light border-t border-border">
              <p className="text-xs text-muted">{totalUnsubscribes} total unsubscribes across these broadcasts</p>
            </div>
          )}
        </div>
      )}

      {/* Subscriber growth chart */}
      {months.length > 0 && (
        <div className="bg-white border border-border p-5">
          <h3 className="font-medium text-dark mb-6">New Subscribers by Month</h3>
          <div className="flex items-end gap-2 h-28">
            {months.map((m) => {
              const count = monthGroups[m];
              const heightPct = (count / maxInMonth) * 100;
              return (
                <div key={m} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-muted">{count}</span>
                  <div
                    className="w-full bg-primary transition-all"
                    style={{ height: `${heightPct}%`, minHeight: "4px" }}
                    title={`${monthLabel(m)}: ${count} new`}
                  />
                  <span className="text-[10px] text-muted text-center leading-tight">{monthLabel(m)}</span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted mt-3 pt-3 border-t border-border">
            Based on {subscribers.length} subscribers in the current page of data
          </p>
        </div>
      )}

      {/* Best subject lines */}
      {bestSubjects.length > 0 && (
        <div className="bg-white border border-border">
          <div className="px-5 py-3.5 border-b border-border">
            <h3 className="text-sm font-medium text-dark">Best-Performing Subject Lines</h3>
          </div>
          <div className="divide-y divide-border">
            {bestSubjects.map((b, i) => {
              const openR = b.open_rate != null ? (b.open_rate < 1 ? b.open_rate * 100 : b.open_rate) : null;
              return (
                <div key={b.id} className="flex items-center gap-4 px-5 py-3.5">
                  <span className="text-xs font-bold text-muted w-4 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-dark">{b.subject}</p>
                    <p className="text-xs text-muted">{relDate(b.sent_at)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-primary">{openR != null ? `${openR.toFixed(1)}%` : "—"}</p>
                    <p className="text-[10px] text-muted">Open rate</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No broadcast data */}
      {broadcasts.length === 0 && (
        <div className="border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted">No broadcast data available from your email platform.</p>
        </div>
      )}

    </div>
  );
}
