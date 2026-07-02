"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface RevenueEntry {
  id: string;
  stream: string;
  amount: number;
  description: string | null;
  date: string;
  created_at: string;
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

const ALL_STREAMS = ["client_work", "products", "memberships", "affiliate", "other"];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtFull(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(ym: string) {
  const [y, m] = ym.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function exportCSV(entries: RevenueEntry[]) {
  const header = ["Date", "Stream", "Amount", "Description"];
  const rows = entries.map((e) => [
    e.date,
    STREAM_LABELS[e.stream] ?? e.stream,
    e.amount.toFixed(2),
    e.description ?? "",
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `revenue-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Page ──────────────────────────────────────────────────────────────────────

type SortField = "date" | "amount" | "stream";
type SortDir = "asc" | "desc";

export default function RevenueDetailPage() {
  const [entries, setEntries] = useState<RevenueEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [streamFilter, setStreamFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Sort
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // View
  const [view, setView] = useState<"table" | "breakdown">("table");

  useEffect(() => {
    fetch("/api/financial/revenue")
      .then((r) => r.json())
      .then((d) => { setEntries(d.entries ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // ── Filter ──────────────────────────────────────────────────────────────────

  const filtered = entries.filter((e) => {
    if (streamFilter !== "all" && e.stream !== streamFilter) return false;
    if (dateFrom && e.date < dateFrom) return false;
    if (dateTo && e.date > dateTo) return false;
    return true;
  });

  // ── Sort ────────────────────────────────────────────────────────────────────

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortField === "date") cmp = a.date.localeCompare(b.date);
    else if (sortField === "amount") cmp = a.amount - b.amount;
    else if (sortField === "stream") cmp = a.stream.localeCompare(b.stream);
    return sortDir === "asc" ? cmp : -cmp;
  });

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("desc"); }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <span className="text-border ml-1">↕</span>;
    return <span className="text-primary ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  // ── Monthly breakdown by stream ──────────────────────────────────────────────

  const months = [...new Set(filtered.map((e) => e.date.slice(0, 7)))].sort().reverse();
  const streams = [...new Set(filtered.map((e) => e.stream))];

  const breakdown = months.map((m) => {
    const monthEntries = filtered.filter((e) => e.date.startsWith(m));
    const byStream: Record<string, number> = {};
    for (const e of monthEntries) {
      byStream[e.stream] = (byStream[e.stream] ?? 0) + e.amount;
    }
    return { month: m, total: monthEntries.reduce((s, e) => s + e.amount, 0), byStream };
  });

  const grandTotal = filtered.reduce((s, e) => s + e.amount, 0);

  function clearFilters() {
    setStreamFilter("all");
    setDateFrom("");
    setDateTo("");
  }

  const hasFilters = streamFilter !== "all" || dateFrom || dateTo;

  return (
    <div className="max-w-5xl mx-auto">

      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="text-xs text-muted mb-2">
            <Link href="/" className="hover:text-dark transition-colors">Dashboard</Link>
            {" › "}
            <Link href="/sales-marketing" className="hover:text-dark transition-colors">Sales & Marketing</Link>
            {" › "}
            <span className="text-dark">Revenue</span>
          </p>
          <h1 className="text-2xl font-serif text-dark mb-1">Revenue Detail</h1>
          <p className="text-sm text-muted">Filter, sort, and export your full revenue history.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/financial"
            className="px-4 py-2 border border-border text-sm text-muted hover:text-dark hover:border-dark/30 transition-colors"
          >
            Log revenue →
          </Link>
          <button
            onClick={() => exportCSV(sorted)}
            disabled={sorted.length === 0}
            className="bg-primary text-white text-sm font-medium px-4 py-2 hover:bg-primary-hover transition-colors disabled:opacity-40"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-border p-4 mb-6 flex items-end gap-4 flex-wrap">
        <div>
          <label className="block text-xs font-medium text-dark mb-1">Stream</label>
          <select
            value={streamFilter}
            onChange={(e) => setStreamFilter(e.target.value)}
            className="border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
          >
            <option value="all">All streams</option>
            {ALL_STREAMS.map((s) => (
              <option key={s} value={s}>{STREAM_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-dark mb-1">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-dark mb-1">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
          />
        </div>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-xs text-muted hover:text-dark transition-colors self-end pb-2"
          >
            Clear filters
          </button>
        )}

        <div className="ml-auto flex items-end gap-1 pb-0.5">
          {(["table", "breakdown"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 text-xs font-medium border transition-colors capitalize ${
                view === v
                  ? "bg-primary text-white border-primary"
                  : "bg-white border-border text-dark hover:border-primary/30"
              }`}
            >
              {v === "table" ? "Table" : "By month"}
            </button>
          ))}
        </div>
      </div>

      {/* Summary strip */}
      <div className="flex items-center gap-6 px-5 py-3 bg-white border border-border mb-4">
        <div>
          <p className="text-xs text-muted">Showing</p>
          <p className="text-sm font-bold text-dark">{sorted.length} entries</p>
        </div>
        <div className="w-px h-8 bg-border" />
        <div>
          <p className="text-xs text-muted">Total</p>
          <p className="text-sm font-bold text-primary">{fmt(grandTotal)}</p>
        </div>
        {hasFilters && (
          <>
            <div className="w-px h-8 bg-border" />
            <p className="text-xs text-muted italic">Filtered view</p>
          </>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-white border border-border animate-pulse" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="border border-dashed border-border p-16 text-center">
          <p className="text-sm text-muted">
            {hasFilters ? "No entries match your filters." : "No revenue entries yet."}
          </p>
          {hasFilters && (
            <button onClick={clearFilters} className="text-xs text-primary hover:underline mt-2 block mx-auto">
              Clear filters
            </button>
          )}
          {!hasFilters && (
            <Link href="/financial" className="text-xs text-primary hover:underline mt-2 block">
              Log your first entry in Financial →
            </Link>
          )}
        </div>
      ) : view === "table" ? (

        // ── Table view ─────────────────────────────────────────────────────────
        <div className="bg-white border border-border">
          <div className="grid grid-cols-[120px_140px_1fr_100px] gap-4 px-5 py-2.5 bg-light border-b border-border">
            <button
              onClick={() => toggleSort("date")}
              className="text-xs font-semibold uppercase tracking-wider text-muted text-left hover:text-dark transition-colors flex items-center"
            >
              Date <SortIcon field="date" />
            </button>
            <button
              onClick={() => toggleSort("stream")}
              className="text-xs font-semibold uppercase tracking-wider text-muted text-left hover:text-dark transition-colors flex items-center"
            >
              Stream <SortIcon field="stream" />
            </button>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Description</span>
            <button
              onClick={() => toggleSort("amount")}
              className="text-xs font-semibold uppercase tracking-wider text-muted text-right hover:text-dark transition-colors flex items-center justify-end"
            >
              Amount <SortIcon field="amount" />
            </button>
          </div>

          <div className="divide-y divide-border">
            {sorted.map((entry) => (
              <div
                key={entry.id}
                className="grid grid-cols-[120px_140px_1fr_100px] gap-4 px-5 py-3.5 items-center hover:bg-light transition-colors"
              >
                <span className="text-xs text-muted">{entry.date}</span>
                <span className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 w-fit ${STREAM_BADGE[entry.stream] ?? "bg-border text-muted"}`}>
                  {STREAM_LABELS[entry.stream] ?? entry.stream}
                </span>
                <span className="text-sm text-dark truncate">
                  {entry.description ?? <span className="text-muted italic">—</span>}
                </span>
                <span className="text-sm font-medium text-dark text-right">{fmt(entry.amount)}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-[120px_140px_1fr_100px] gap-4 px-5 py-3 bg-light border-t border-border">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted col-span-3">Total</span>
            <span className="text-sm font-bold text-dark text-right">{fmt(grandTotal)}</span>
          </div>
        </div>

      ) : (

        // ── Monthly breakdown view ──────────────────────────────────────────────
        <div className="flex flex-col gap-4">
          {breakdown.map(({ month, total, byStream }) => (
            <div key={month} className="bg-white border border-border">
              <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-light">
                <h3 className="text-sm font-semibold text-dark">{monthLabel(month)}</h3>
                <span className="text-sm font-bold text-primary">{fmt(total)}</span>
              </div>
              <div className="divide-y divide-border">
                {streams
                  .filter((s) => byStream[s])
                  .sort((a, b) => (byStream[b] ?? 0) - (byStream[a] ?? 0))
                  .map((stream) => {
                    const amount = byStream[stream] ?? 0;
                    const pct = total > 0 ? (amount / total) * 100 : 0;
                    return (
                      <div key={stream} className="px-5 py-3.5">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 ${STREAM_BADGE[stream] ?? "bg-border text-muted"}`}>
                            {STREAM_LABELS[stream] ?? stream}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted">{pct.toFixed(0)}%</span>
                            <span className="text-sm font-medium text-dark">{fmt(amount)}</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-border">
                          <div
                            className="h-1.5 bg-primary transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}

          {/* Grand total across all months */}
          {breakdown.length > 1 && (
            <div className="bg-white border border-border px-5 py-3.5 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                Total ({breakdown.length} months)
              </span>
              <span className="text-sm font-bold text-primary">{fmt(grandTotal)}</span>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
