"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Stats {
  activeOffers: number;
  sequencesRunning: number;
  activeCampaigns: number;
  revenueThisMonth: number;
  recentRevenue: RevenueEntry[];
  recentCampaigns: Campaign[];
}

interface RevenueEntry {
  id: string;
  stream: string;
  amount: number;
  description: string | null;
  date: string;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  type: string;
  start_date: string | null;
  end_date: string | null;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const STREAM_LABELS: Record<string, string> = {
  client_work: "Client Work",
  products: "Products",
  memberships: "Memberships",
  affiliate: "Affiliate",
  other: "Other",
};

const STREAM_BADGE: Record<string, string> = {
  client_work: "bg-teal-tint text-primary",
  products: "bg-purple-tint text-purple",
  memberships: "bg-olive-tint text-olive",
  affiliate: "bg-gold-tint text-gold",
  other: "bg-border text-muted",
};

const CAMPAIGN_STATUS: Record<string, { label: string; className: string }> = {
  planning: { label: "Planning", className: "bg-gold-tint text-gold" },
  active: { label: "Active", className: "bg-teal-tint text-primary" },
  complete: { label: "Complete", className: "bg-border text-muted" },
};

const SUB_PAGES = [
  {
    href: "/sales-marketing/offers",
    title: "Offers",
    description: "Track your offer portfolio — what you sell, at what price, and current status.",
  },
  {
    href: "/sales-marketing/email-sequences",
    title: "Email Sequences",
    description: "Map your sequences, email by email — triggers, subject lines, and drop-off notes.",
  },
  {
    href: "/sales-marketing/campaigns",
    title: "Campaigns",
    description: "Track launches, promos, and paid campaigns with goals and results.",
  },
  {
    href: "/sales-marketing/funnels",
    title: "Funnels",
    description: "Visualize your customer journey from first touch to purchase.",
  },
  {
    href: "/sales-marketing/revenue",
    title: "Revenue Detail",
    description: "Filterable revenue table with stream breakdown and CSV export.",
  },
];

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function monthLabel() {
  return new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function SalesMarketingPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/sales-marketing/stats")
      .then((r) => r.json())
      .then((d) => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <p className="text-xs text-muted mb-2">
          <Link href="/" className="hover:text-dark transition-colors">Dashboard</Link>
          {" › "}
          <span className="text-dark">Sales & Marketing</span>
        </p>
        <h1 className="text-2xl font-serif text-dark mb-1">Sales & Marketing</h1>
        <p className="text-sm text-muted">Your commercial activity at a glance — offers, sequences, campaigns, and revenue.</p>
      </div>

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-4 gap-3 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-white border border-border animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-3 mb-8">
          <StatCard
            label="Active Offers"
            value={String(stats?.activeOffers ?? 0)}
            href="/sales-marketing/offers"
          />
          <StatCard
            label="Sequences Running"
            value={String(stats?.sequencesRunning ?? 0)}
            href="/sales-marketing/email-sequences"
          />
          <StatCard
            label="Active Campaigns"
            value={String(stats?.activeCampaigns ?? 0)}
            href="/sales-marketing/campaigns"
          />
          <StatCard
            label={`Revenue — ${monthLabel()}`}
            value={fmt(stats?.revenueThisMonth ?? 0)}
            href="/sales-marketing/revenue"
          />
        </div>
      )}

      {/* Navigation cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
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

      {/* Recent activity */}
      {!loading && (
        <div className="grid grid-cols-2 gap-4">

          {/* Recent revenue */}
          <div className="bg-white border border-border">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
              <h3 className="text-sm font-medium text-dark">Recent Revenue</h3>
              <Link href="/sales-marketing/revenue" className="text-xs text-primary hover:underline">
                View all →
              </Link>
            </div>
            {(stats?.recentRevenue ?? []).length === 0 ? (
              <p className="text-sm text-muted px-5 py-6">No revenue entries yet.</p>
            ) : (
              <div className="divide-y divide-border">
                {(stats?.recentRevenue ?? []).map((entry) => (
                  <div key={entry.id} className="flex items-center gap-3 px-5 py-3">
                    <span className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 shrink-0 ${STREAM_BADGE[entry.stream] ?? "bg-border text-muted"}`}>
                      {STREAM_LABELS[entry.stream] ?? entry.stream}
                    </span>
                    <div className="flex-1 min-w-0">
                      {entry.description && (
                        <p className="text-xs text-dark truncate">{entry.description}</p>
                      )}
                      <p className="text-[11px] text-muted">{entry.date}</p>
                    </div>
                    <span className="text-sm font-medium text-dark shrink-0">{fmt(entry.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent campaigns */}
          <div className="bg-white border border-border">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
              <h3 className="text-sm font-medium text-dark">Recent Campaigns</h3>
              <Link href="/sales-marketing/campaigns" className="text-xs text-primary hover:underline">
                View all →
              </Link>
            </div>
            {(stats?.recentCampaigns ?? []).length === 0 ? (
              <p className="text-sm text-muted px-5 py-6">No campaigns yet.</p>
            ) : (
              <div className="divide-y divide-border">
                {(stats?.recentCampaigns ?? []).map((campaign) => {
                  const s = CAMPAIGN_STATUS[campaign.status] ?? { label: campaign.status, className: "bg-border text-muted" };
                  return (
                    <div key={campaign.id} className="flex items-center gap-3 px-5 py-3">
                      <span className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 shrink-0 ${s.className}`}>
                        {s.label}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-dark truncate font-medium">{campaign.name}</p>
                        <p className="text-[11px] text-muted capitalize">{campaign.type}</p>
                      </div>
                      {campaign.start_date && (
                        <span className="text-[11px] text-muted shrink-0">{campaign.start_date}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}

// ─── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <Link
      href={href}
      className="bg-white border border-border p-5 block hover:border-primary/30 transition-colors group"
    >
      <p className="text-2xl font-bold text-dark mb-1 group-hover:text-primary transition-colors">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </Link>
  );
}
