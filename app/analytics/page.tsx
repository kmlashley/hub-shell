"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface MetricSummary {
  platform: string;
  metric_type: string;
  current_value: number;
  prev_value: number | null;
}

interface GrowthSnap {
  platform: string;
  count: number;
  recorded_at: string;
}

interface ContentMetric {
  id: string;
  content_id: string;
  platform: string;
  metric_type: string;
  value: number;
  recorded_at: string;
}

interface OverviewData {
  metrics: MetricSummary[];
  latestGrowth: GrowthSnap[];
  prevGrowth: GrowthSnap[];
  bestContent: ContentMetric[];
}

// ─── Platform config ───────────────────────────────────────────────────────────

const PLATFORM_CARDS = [
  {
    key: "newsletter",
    label: "Newsletter",
    growthKey: "Email",
    metricTypes: ["open_rate", "click_rate", "unsubscribes"],
    href: "/analytics/newsletter",
  },
  {
    key: "youtube",
    label: "YouTube",
    growthKey: "YouTube",
    metricTypes: ["views", "watch_time", "ctr"],
    href: null,
  },
  {
    key: "website",
    label: "Website",
    growthKey: null,
    metricTypes: ["sessions", "pageviews", "bounce_rate"],
    href: null,
  },
  {
    key: "social",
    label: "Social",
    growthKey: null,
    socialPlatforms: ["LinkedIn", "Instagram", "Twitter/X"],
    metricTypes: ["impressions", "engagement_rate", "clicks"],
    href: null,
  },
];

const METRIC_LABELS: Record<string, string> = {
  open_rate: "Open rate",
  click_rate: "Click rate",
  unsubscribes: "Unsubscribes",
  views: "Views",
  watch_time: "Watch time (min)",
  ctr: "Click-through rate",
  sessions: "Sessions",
  pageviews: "Pageviews",
  bounce_rate: "Bounce rate",
  impressions: "Impressions",
  engagement_rate: "Engagement rate",
  clicks: "Clicks",
  subscribers: "Subscribers",
  followers: "Followers",
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmtVal(val: number, type: string): string {
  if (["open_rate", "click_rate", "bounce_rate", "engagement_rate", "ctr"].includes(type)) {
    return val < 1 ? `${(val * 100).toFixed(1)}%` : `${val.toFixed(1)}%`;
  }
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(1)}k`;
  return String(Math.round(val));
}

function trend(current: number, prev: number | null) {
  if (prev === null || prev === 0) return null;
  const pct = ((current - prev) / prev) * 100;
  return pct;
}

function TrendBadge({ pct, invert = false }: { pct: number | null; invert?: boolean }) {
  if (pct === null) return null;
  const positive = invert ? pct < 0 : pct > 0;
  const neutral = Math.abs(pct) < 0.5;
  if (neutral) return <span className="text-[10px] text-muted">→</span>;
  return (
    <span className={`text-[10px] font-medium ${positive ? "text-primary" : "text-accent"}`}>
      {pct > 0 ? "↑" : "↓"} {Math.abs(pct).toFixed(0)}%
    </span>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics/overview")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <p className="text-xs text-muted mb-2">
          <Link href="/" className="hover:text-dark transition-colors">Dashboard</Link>
          {" › "}
          <span className="text-dark">Analytics</span>
        </p>
        <h1 className="text-2xl font-serif text-dark mb-1">Analytics</h1>
        <p className="text-sm text-muted">What's actually moving — across all platforms.</p>
      </div>

      {loading ? (
        <div className="flex flex-col gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-white border border-border animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-6">

          {/* Platform cards */}
          <div className="grid grid-cols-2 gap-4">
            {PLATFORM_CARDS.map((card) => (
              <PlatformCard
                key={card.key}
                card={card}
                data={data}
              />
            ))}
          </div>

          {/* Best content this month */}
          <BestContentSection bestContent={data?.bestContent ?? []} />

          {/* Recommendations */}
          <RecommendationsSection data={data} />

          {/* How to add data */}
          {(data?.metrics.length ?? 0) === 0 && (
            <div className="bg-white border border-border p-5">
              <h3 className="font-medium text-dark mb-2">How to populate this dashboard</h3>
              <p className="text-sm text-muted mb-4">
                Analytics reads from the <code className="text-xs bg-border px-1.5 py-0.5">content_metrics</code> table.
                Add entries via your content pages or directly in Supabase.
              </p>
              <div className="bg-light border border-border p-4 font-mono text-xs text-dark leading-relaxed">
                <p className="text-muted mb-1">-- Example: log your newsletter open rate</p>
                <p>insert into content_metrics</p>
                <p className="pl-4">(content_id, platform, metric_type, value)</p>
                <p>values</p>
                <p className="pl-4">{`('issue-42', 'newsletter', 'open_rate', 38.5);`}</p>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

// ─── Platform card ─────────────────────────────────────────────────────────────

function PlatformCard({
  card,
  data,
}: {
  card: (typeof PLATFORM_CARDS)[0];
  data: OverviewData | null;
}) {
  const metrics = (data?.metrics ?? []).filter((m) =>
    card.key === "social"
      ? ["linkedin", "instagram", "twitter", "social"].includes(m.platform)
      : m.platform === card.key
  );

  // Growth from snapshots
  let audienceCount: number | null = null;
  let audiencePrev: number | null = null;

  if (card.growthKey) {
    const snap = data?.latestGrowth.find((g) => g.platform === card.growthKey);
    const prev = data?.prevGrowth.find((g) => g.platform === card.growthKey);
    if (snap) audienceCount = snap.count;
    if (prev) audiencePrev = prev.count;
  } else if (card.key === "social" && card.socialPlatforms) {
    // Sum followers across social platforms from growth snapshots
    const total = (data?.latestGrowth ?? [])
      .filter((g) => card.socialPlatforms!.some((p) => g.platform.toLowerCase().includes(p.toLowerCase().split("/")[0])))
      .reduce((s, g) => s + g.count, 0);
    if (total > 0) audienceCount = total;
  }

  // Pick top 3 metrics for this platform
  const displayMetrics = card.metricTypes
    .map((type) => metrics.find((m) => m.metric_type === type))
    .filter(Boolean) as MetricSummary[];

  const hasAnyData = audienceCount !== null || displayMetrics.length > 0;

  return (
    <div className="bg-white border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-dark">{card.label}</h3>
        {card.href && (
          <Link href={card.href} className="text-xs text-primary hover:underline">
            Deep dive →
          </Link>
        )}
      </div>

      {!hasAnyData ? (
        <p className="text-xs text-muted">No data yet. Log metrics to see insights here.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Audience size from growth_snapshots */}
          {audienceCount !== null && (
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-xs text-muted">{card.key === "social" ? "Total followers" : "Subscribers"}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-dark">
                  {audienceCount >= 1000 ? `${(audienceCount / 1000).toFixed(1)}k` : audienceCount.toLocaleString()}
                </span>
                <TrendBadge pct={trend(audienceCount, audiencePrev)} />
              </div>
            </div>
          )}

          {/* Metric rows */}
          {displayMetrics.map((m) => (
            <div key={m.metric_type} className="flex items-center justify-between">
              <span className="text-xs text-muted">{METRIC_LABELS[m.metric_type] ?? m.metric_type}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-dark">{fmtVal(m.current_value, m.metric_type)}</span>
                <TrendBadge
                  pct={trend(m.current_value, m.prev_value)}
                  invert={m.metric_type === "bounce_rate" || m.metric_type === "unsubscribes"}
                />
              </div>
            </div>
          ))}

          {/* Placeholder rows for missing metrics */}
          {card.metricTypes
            .filter((type) => !displayMetrics.find((m) => m.metric_type === type))
            .slice(0, 3 - displayMetrics.length)
            .map((type) => (
              <div key={type} className="flex items-center justify-between opacity-40">
                <span className="text-xs text-muted">{METRIC_LABELS[type] ?? type}</span>
                <span className="text-xs text-muted">—</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// ─── Best content ──────────────────────────────────────────────────────────────

function BestContentSection({ bestContent }: { bestContent: ContentMetric[] }) {
  if (bestContent.length === 0) return null;

  const PLATFORM_BADGE: Record<string, string> = {
    newsletter: "bg-teal-tint text-primary",
    youtube: "bg-rust-tint text-accent",
    website: "bg-purple-tint text-purple",
    linkedin: "bg-purple-tint text-purple",
    social: "bg-border text-muted",
  };

  return (
    <div className="bg-white border border-border">
      <div className="px-5 py-3.5 border-b border-border">
        <h3 className="text-sm font-medium text-dark">Best Performing Content — This Month</h3>
      </div>
      <div className="divide-y divide-border">
        {bestContent.map((item, i) => (
          <div key={item.id} className="flex items-center gap-4 px-5 py-3">
            <span className="text-xs font-bold text-muted w-4 shrink-0">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-dark truncate font-medium">{item.content_id}</p>
              <p className="text-xs text-muted">
                {new Date(item.recorded_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </p>
            </div>
            <span className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 shrink-0 ${PLATFORM_BADGE[item.platform] ?? "bg-border text-muted"}`}>
              {item.platform}
            </span>
            <div className="text-right shrink-0">
              <p className="text-sm font-medium text-dark">{fmtVal(item.value, item.metric_type)}</p>
              <p className="text-[10px] text-muted">{METRIC_LABELS[item.metric_type] ?? item.metric_type}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Recommendations ───────────────────────────────────────────────────────────

function RecommendationsSection({ data }: { data: OverviewData | null }) {
  const recs: { type: "positive" | "attention"; message: string }[] = [];

  if (!data) return null;

  // Growth-based recommendations
  for (const snap of data.latestGrowth) {
    const prev = data.prevGrowth.find((g) => g.platform === snap.platform);
    if (!prev) continue;
    const pct = ((snap.count - prev.count) / prev.count) * 100;
    if (pct > 5) {
      recs.push({ type: "positive", message: `${snap.platform} audience grew ${pct.toFixed(0)}% — double down on what's driving it.` });
    } else if (pct < -2) {
      recs.push({ type: "attention", message: `${snap.platform} audience declined ${Math.abs(pct).toFixed(0)}% — review recent posts for what changed.` });
    }
  }

  // Metric-based recommendations
  for (const m of data.metrics) {
    const pct = m.prev_value ? ((m.current_value - m.prev_value) / m.prev_value) * 100 : null;
    if (pct === null) continue;

    if (m.metric_type === "open_rate" && m.current_value < 0.25 && pct < 0) {
      recs.push({ type: "attention", message: "Newsletter open rate is below 25% and declining — test a different subject line angle." });
    }
    if (m.metric_type === "open_rate" && pct > 10) {
      recs.push({ type: "positive", message: `Newsletter open rate up ${pct.toFixed(0)}% this week — note what's working in your subject lines.` });
    }
    if (m.metric_type === "bounce_rate" && m.current_value > 70) {
      recs.push({ type: "attention", message: "Website bounce rate is above 70% — check your landing page content alignment." });
    }
  }

  if (recs.length === 0) return null;

  return (
    <div className="bg-white border border-border">
      <div className="px-5 py-3.5 border-b border-border">
        <h3 className="text-sm font-medium text-dark">Recommendations</h3>
      </div>
      <div className="divide-y divide-border">
        {recs.slice(0, 5).map((rec, i) => (
          <div key={i} className="flex items-start gap-3 px-5 py-3.5">
            <span className={`text-sm shrink-0 mt-px ${rec.type === "positive" ? "text-primary" : "text-gold"}`}>
              {rec.type === "positive" ? "↑" : "⚠"}
            </span>
            <p className="text-sm text-dark">{rec.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
