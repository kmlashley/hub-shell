"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Tab = "overview" | "subscribers" | "sequences" | "broadcasts";

interface Subscriber {
  id: string | number;
  email: string;
  created_at: string;
  source?: string | null;
  tags?: string[];
}

interface Sequence {
  id: string | number;
  name: string;
  hold: boolean;
  created_at: string;
}

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

interface EmailData {
  platform: string;
  overview: {
    totalSubscribers: number;
    growthThisMonth: number;
    activeSequences: number;
  };
  subscribers: Subscriber[];
  broadcasts: Broadcast[];
  sequences: Sequence[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function pct(n: number | null | undefined) {
  if (n == null) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

function fmtNum(n: number | null | undefined) {
  if (n == null) return "—";
  return n.toLocaleString();
}

function relDate(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function EmailPlatformPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<EmailData | null>(null);
  const [recordedAt, setRecordedAt] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");

  async function load(force = false) {
    if (force) setRefreshing(true);
    else setLoading(true);

    const r = await fetch(`/api/growth/email${force ? "?force=1" : ""}`);
    const json = await r.json();
    setConnected(json.connected ?? false);
    setError(json.error ?? null);
    setData(json.data ?? null);
    setRecordedAt(json.recorded_at ?? null);

    if (force) setRefreshing(false);
    else setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const TABS: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "subscribers", label: "Subscribers" },
    { key: "sequences", label: "Sequences" },
    { key: "broadcasts", label: "Broadcasts" },
  ];

  return (
    <div className="max-w-4xl mx-auto">

      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="text-xs text-muted mb-2">
            <Link href="/" className="hover:text-dark transition-colors">Dashboard</Link>
            {" › "}
            <Link href="/growth" className="hover:text-dark transition-colors">Growth</Link>
            {" › "}
            <span className="text-dark">Email Platform</span>
          </p>
          <h1 className="text-2xl font-serif text-dark mb-1">Email Platform</h1>
          <p className="text-sm text-muted">
            Subscriber counts, recent broadcasts, and sequence performance.
          </p>
        </div>
        {connected && (
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="bg-primary text-white text-xs font-medium px-3 py-1.5 hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {refreshing ? "Refreshing…" : "↻ Refresh"}
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-white border border-border animate-pulse" />
          ))}
        </div>
      ) : !connected ? (
        <NotConnected error={error} />
      ) : (
        <>
          {/* Sync timestamp */}
          {recordedAt && (
            <p className="text-xs text-muted mb-4">
              Last synced {new Date(recordedAt).toLocaleString()} · Refreshes every 60 min
            </p>
          )}

          {/* Tabs */}
          <div className="flex border-b border-border mb-6">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  tab === t.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted hover:text-dark"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "overview" && <OverviewTab data={data!} onSwitchTab={setTab} />}
          {tab === "subscribers" && <SubscribersTab subscribers={data?.subscribers ?? []} />}
          {tab === "sequences" && <SequencesTab sequences={data?.sequences ?? []} />}
          {tab === "broadcasts" && <BroadcastsTab broadcasts={data?.broadcasts ?? []} />}
        </>
      )}
    </div>
  );
}

// ─── Not Connected ─────────────────────────────────────────────────────────────

function NotConnected({ error }: { error: string | null }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="border border-dashed border-border p-8">
        <p className="text-sm font-medium text-dark mb-1">Email platform not connected</p>
        <p className="text-sm text-muted mb-5">
          Add your API key to{" "}
          <code className="text-xs bg-border px-1.5 py-0.5">.env.local</code> to connect.
        </p>
        <div className="bg-light border border-border p-4 font-mono text-xs text-dark mb-5 leading-relaxed">
          <p className="text-muted mb-1"># .env.local</p>
          <p>EMAIL_PLATFORM=kit</p>
          <p>EMAIL_PLATFORM_API_KEY=your_api_key_here</p>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-dark">Supported platforms</p>
          <p className="text-xs text-muted">
            <span className="font-medium text-dark">Kit (ConvertKit)</span> — set{" "}
            <code className="bg-border px-1 py-0.5">EMAIL_PLATFORM=kit</code>. Find your API key at kit.com → Settings → Developer → API Keys.
          </p>
          <p className="text-xs text-muted">
            To add Bento, Beehiiv, or MailerLite: extend{" "}
            <code className="bg-border px-1 py-0.5">app/api/growth/email/route.ts</code> with a new fetch function.
          </p>
        </div>
      </div>
      {error && (
        <div className="border border-accent/30 bg-rust-tint px-4 py-3">
          <p className="text-xs font-medium text-accent mb-0.5">Connection error</p>
          <p className="text-xs text-muted">{error}</p>
        </div>
      )}
    </div>
  );
}

// ─── Overview tab ──────────────────────────────────────────────────────────────

function OverviewTab({
  data,
  onSwitchTab,
}: {
  data: EmailData;
  onSwitchTab: (t: Tab) => void;
}) {
  const { overview } = data;

  return (
    <div className="flex flex-col gap-6">

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => onSwitchTab("subscribers")}
          className="bg-white border border-border p-5 text-left hover:border-primary/30 transition-colors"
        >
          <p className="text-2xl font-bold text-dark mb-1">{fmtNum(overview.totalSubscribers)}</p>
          <p className="text-xs text-muted">Total subscribers</p>
        </button>
        <button
          onClick={() => onSwitchTab("subscribers")}
          className="bg-white border border-border p-5 text-left hover:border-primary/30 transition-colors"
        >
          <p className="text-2xl font-bold text-dark mb-1">+{fmtNum(overview.growthThisMonth)}</p>
          <p className="text-xs text-muted">New this month</p>
        </button>
        <button
          onClick={() => onSwitchTab("sequences")}
          className="bg-white border border-border p-5 text-left hover:border-primary/30 transition-colors"
        >
          <p className="text-2xl font-bold text-dark mb-1">{fmtNum(overview.activeSequences)}</p>
          <p className="text-xs text-muted">Active sequences</p>
        </button>
      </div>

      {/* Recent broadcasts */}
      {data.broadcasts.length > 0 && (
        <div className="bg-white border border-border">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <h3 className="text-sm font-medium text-dark">Recent Broadcasts</h3>
            <button
              onClick={() => onSwitchTab("broadcasts")}
              className="text-xs text-primary hover:underline"
            >
              View all →
            </button>
          </div>
          <div className="divide-y divide-border">
            {data.broadcasts.slice(0, 5).map((b) => (
              <div key={b.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-dark truncate">{b.subject}</p>
                  <p className="text-xs text-muted">{relDate(b.sent_at)}</p>
                </div>
                <div className="flex items-center gap-5 shrink-0">
                  {b.open_rate != null && (
                    <div className="text-right">
                      <p className="text-sm font-medium text-dark">{pct(b.open_rate)}</p>
                      <p className="text-[10px] text-muted uppercase tracking-wider">Open</p>
                    </div>
                  )}
                  {b.click_rate != null && (
                    <div className="text-right">
                      <p className="text-sm font-medium text-dark">{pct(b.click_rate)}</p>
                      <p className="text-[10px] text-muted uppercase tracking-wider">Click</p>
                    </div>
                  )}
                  {b.recipients != null && (
                    <div className="text-right">
                      <p className="text-sm font-medium text-dark">{fmtNum(b.recipients)}</p>
                      <p className="text-[10px] text-muted uppercase tracking-wider">Sent</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent subscribers */}
      {data.subscribers.length > 0 && (
        <div className="bg-white border border-border">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <h3 className="text-sm font-medium text-dark">Recent Subscribers</h3>
            <button
              onClick={() => onSwitchTab("subscribers")}
              className="text-xs text-primary hover:underline"
            >
              View all →
            </button>
          </div>
          <div className="divide-y divide-border">
            {data.subscribers.slice(0, 5).map((s) => (
              <div key={s.id} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-dark">{s.email}</p>
                  {s.tags && s.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {s.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] bg-teal-tint text-primary px-1.5 py-0.5 font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  {s.source && <p className="text-xs text-muted">{s.source}</p>}
                  <p className="text-xs text-muted">{relDate(s.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Subscribers tab ───────────────────────────────────────────────────────────

function SubscribersTab({ subscribers }: { subscribers: Subscriber[] }) {
  if (subscribers.length === 0) {
    return (
      <div className="border border-dashed border-border p-12 text-center">
        <p className="text-sm text-muted">No subscriber data available.</p>
      </div>
    );
  }
  return (
    <div className="bg-white border border-border">
      <div className="grid grid-cols-3 px-5 py-2.5 border-b border-border bg-light">
        <span className="col-span-1 text-xs font-semibold uppercase tracking-wider text-muted">Email</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">Tags</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-muted text-right">Joined</span>
      </div>
      <div className="divide-y divide-border">
        {subscribers.map((s) => (
          <div
            key={s.id}
            className="grid grid-cols-3 px-5 py-3 items-center hover:bg-light transition-colors"
          >
            <div className="min-w-0 pr-4">
              <p className="text-sm text-dark truncate">{s.email}</p>
              {s.source && <p className="text-xs text-muted">{s.source}</p>}
            </div>
            <div className="flex flex-wrap gap-1 pr-4">
              {(s.tags ?? []).slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] bg-teal-tint text-primary px-1.5 py-0.5 font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
            <p className="text-xs text-muted text-right">{relDate(s.created_at)}</p>
          </div>
        ))}
      </div>
      <div className="px-5 py-3 bg-light border-t border-border">
        <p className="text-xs text-muted">
          Showing {subscribers.length} most recent · Click Refresh to sync latest
        </p>
      </div>
    </div>
  );
}

// ─── Sequences tab ─────────────────────────────────────────────────────────────

function SequencesTab({ sequences }: { sequences: Sequence[] }) {
  if (sequences.length === 0) {
    return (
      <div className="border border-dashed border-border p-12 text-center">
        <p className="text-sm text-muted">No sequences found in your account.</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {sequences.map((s) => (
        <div
          key={s.id}
          className="bg-white border border-border px-5 py-4 flex items-center gap-4"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-dark">{s.name}</p>
            <p className="text-xs text-muted">Created {relDate(s.created_at)}</p>
          </div>
          <span
            className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 ${
              s.hold
                ? "bg-gold-tint text-gold"
                : "bg-teal-tint text-primary"
            }`}
          >
            {s.hold ? "Paused" : "Active"}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Broadcasts tab ────────────────────────────────────────────────────────────

function BroadcastsTab({ broadcasts }: { broadcasts: Broadcast[] }) {
  if (broadcasts.length === 0) {
    return (
      <div className="border border-dashed border-border p-12 text-center">
        <p className="text-sm text-muted">No broadcasts found in your account.</p>
      </div>
    );
  }
  return (
    <div className="bg-white border border-border">
      <div className="grid grid-cols-5 px-5 py-2.5 border-b border-border bg-light">
        <span className="col-span-2 text-xs font-semibold uppercase tracking-wider text-muted">Subject</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-muted text-right">Sent to</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-muted text-right">Open rate</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-muted text-right">Click rate</span>
      </div>
      <div className="divide-y divide-border">
        {broadcasts.map((b) => (
          <div
            key={b.id}
            className="grid grid-cols-5 px-5 py-3.5 items-center hover:bg-light transition-colors"
          >
            <div className="col-span-2 min-w-0 pr-4">
              <p className="text-sm text-dark truncate">{b.subject}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-muted">{relDate(b.sent_at)}</p>
                {b.status === "draft" && (
                  <span className="text-[10px] bg-gold-tint text-gold px-1.5 py-0.5 font-semibold uppercase tracking-wider">
                    Draft
                  </span>
                )}
              </div>
            </div>
            <p className="text-sm text-muted text-right">{fmtNum(b.recipients)}</p>
            <p
              className={`text-sm font-medium text-right ${
                b.open_rate != null ? "text-dark" : "text-muted"
              }`}
            >
              {pct(b.open_rate)}
            </p>
            <p
              className={`text-sm font-medium text-right ${
                b.click_rate != null ? "text-dark" : "text-muted"
              }`}
            >
              {pct(b.click_rate)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
