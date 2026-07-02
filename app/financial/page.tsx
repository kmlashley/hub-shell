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

interface ExpenseEntry {
  id: string;
  category: string;
  amount: number;
  description: string | null;
  date: string;
  recurring: boolean;
  created_at: string;
}

type Tab = "overview" | "revenue" | "expenses" | "pl";

// ─── Constants ─────────────────────────────────────────────────────────────────

const REVENUE_STREAMS = ["client_work", "products", "memberships", "affiliate", "other"];
const EXPENSE_CATEGORIES = ["tools", "contractors", "ads", "education", "other"];

const STREAM_LABELS: Record<string, string> = {
  client_work: "Client Work",
  products: "Products",
  memberships: "Memberships",
  affiliate: "Affiliate",
  other: "Other",
};

const CATEGORY_LABELS: Record<string, string> = {
  tools: "Tools",
  contractors: "Contractors",
  ads: "Ads",
  education: "Education",
  other: "Other",
};

const STREAM_BADGE: Record<string, string> = {
  client_work: "bg-teal-tint text-primary",
  products: "bg-purple-tint text-purple",
  memberships: "bg-olive-tint text-olive",
  affiliate: "bg-gold-tint text-gold",
  other: "bg-border text-muted",
};

const CATEGORY_BADGE: Record<string, string> = {
  tools: "bg-teal-tint text-primary",
  contractors: "bg-rust-tint text-accent",
  ads: "bg-purple-tint text-purple",
  education: "bg-olive-tint text-olive",
  other: "bg-border text-muted",
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmt(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(ym: string) {
  const [y, m] = ym.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function last6Months(): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(monthKey(d));
  }
  return months;
}

function currentMonth() {
  return monthKey(new Date());
}

function prevMonth() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return monthKey(d);
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function FinancialPage() {
  const [revenue, setRevenue] = useState<RevenueEntry[]>([]);
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");

  async function load() {
    setLoading(true);
    const [revRes, expRes] = await Promise.all([
      fetch("/api/financial/revenue"),
      fetch("/api/financial/expenses"),
    ]);
    if (revRes.ok) setRevenue((await revRes.json()).entries ?? []);
    if (expRes.ok) setExpenses((await expRes.json()).entries ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const TABS: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "revenue", label: "Revenue" },
    { key: "expenses", label: "Expenses" },
    { key: "pl", label: "P&L" },
  ];

  return (
    <div className="max-w-4xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <p className="text-xs text-muted mb-2">
          <Link href="/" className="hover:text-dark transition-colors">Dashboard</Link>
          {" › "}
          <span className="text-dark">Financial</span>
        </p>
        <h1 className="text-2xl font-serif text-dark mb-1">Financial</h1>
        <p className="text-sm text-muted">Revenue and expense tracking. Know where your money comes from and goes.</p>
      </div>

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

      {loading ? (
        <div className="flex flex-col gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-white border border-border animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {tab === "overview" && <OverviewTab revenue={revenue} expenses={expenses} onSwitchTab={setTab} />}
          {tab === "revenue" && <RevenueTab entries={revenue} onRefresh={load} />}
          {tab === "expenses" && <ExpensesTab entries={expenses} onRefresh={load} />}
          {tab === "pl" && <PLTab revenue={revenue} expenses={expenses} />}
        </>
      )}
    </div>
  );
}

// ─── Overview tab ──────────────────────────────────────────────────────────────

function OverviewTab({
  revenue,
  expenses,
  onSwitchTab,
}: {
  revenue: RevenueEntry[];
  expenses: ExpenseEntry[];
  onSwitchTab: (t: Tab) => void;
}) {
  const cm = currentMonth();
  const pm = prevMonth();

  const thisMonthRev = revenue.filter((e) => e.date.startsWith(cm)).reduce((s, e) => s + e.amount, 0);
  const lastMonthRev = revenue.filter((e) => e.date.startsWith(pm)).reduce((s, e) => s + e.amount, 0);
  const thisMonthExp = expenses.filter((e) => e.date.startsWith(cm)).reduce((s, e) => s + e.amount, 0);
  const mrr = revenue.filter((e) => e.stream === "memberships" && e.date.startsWith(cm)).reduce((s, e) => s + e.amount, 0);
  const netThisMonth = thisMonthRev - thisMonthExp;

  const revDelta = lastMonthRev > 0 ? ((thisMonthRev - lastMonthRev) / lastMonthRev) * 100 : null;

  // Top streams this month
  const streamTotals: Record<string, number> = {};
  revenue.filter((e) => e.date.startsWith(cm)).forEach((e) => {
    streamTotals[e.stream] = (streamTotals[e.stream] ?? 0) + e.amount;
  });
  const topStreams = Object.entries(streamTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);

  return (
    <div className="flex flex-col gap-6">
      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard
          label="Revenue this month"
          value={fmt(thisMonthRev)}
          sub={revDelta !== null ? `${revDelta >= 0 ? "+" : ""}${revDelta.toFixed(0)}% vs last month` : "No prior data"}
          subColor={revDelta === null ? "muted" : revDelta >= 0 ? "accent-pos" : "accent-neg"}
          onClick={() => onSwitchTab("revenue")}
        />
        <StatCard
          label="Last month"
          value={fmt(lastMonthRev)}
          sub={monthLabel(pm)}
          onClick={() => onSwitchTab("revenue")}
        />
        <StatCard
          label="Expenses this month"
          value={fmt(thisMonthExp)}
          sub="All categories"
          onClick={() => onSwitchTab("expenses")}
        />
        <StatCard
          label="Net this month"
          value={fmt(netThisMonth)}
          sub={netThisMonth >= 0 ? "Profitable" : "In the red"}
          subColor={netThisMonth >= 0 ? "accent-pos" : "accent-neg"}
          onClick={() => onSwitchTab("pl")}
        />
      </div>

      {mrr > 0 && (
        <div className="bg-teal-tint border border-primary/20 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-0.5">MRR</p>
            <p className="text-2xl font-bold text-dark">{fmt(mrr)}</p>
          </div>
          <p className="text-xs text-muted">From memberships this month</p>
        </div>
      )}

      {/* Top revenue streams */}
      <div className="bg-white border border-border p-5">
        <h3 className="font-medium text-dark mb-4">Top Revenue Streams — {monthLabel(cm)}</h3>
        {topStreams.length === 0 ? (
          <p className="text-sm text-muted">No revenue logged this month.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {topStreams.map(([stream, total]) => {
              const pct = thisMonthRev > 0 ? (total / thisMonthRev) * 100 : 0;
              return (
                <div key={stream}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 ${STREAM_BADGE[stream] ?? "bg-border text-muted"}`}>
                      {STREAM_LABELS[stream] ?? stream}
                    </span>
                    <span className="text-sm font-medium text-dark">{fmt(total)}</span>
                  </div>
                  <div className="h-1.5 bg-border">
                    <div className="h-1.5 bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Revenue tab ───────────────────────────────────────────────────────────────

function RevenueTab({ entries, onRefresh }: { entries: RevenueEntry[]; onRefresh: () => void }) {
  const [month, setMonth] = useState(currentMonth());
  const [showForm, setShowForm] = useState(false);
  const [stream, setStream] = useState(REVENUE_STREAMS[0]);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);

  const filtered = entries.filter((e) => e.date.startsWith(month));
  const total = filtered.reduce((s, e) => s + e.amount, 0);

  const months = [...new Set(entries.map((e) => e.date.slice(0, 7)))].sort().reverse();
  if (!months.includes(currentMonth())) months.unshift(currentMonth());

  async function addEntry(ev: React.FormEvent) {
    ev.preventDefault();
    if (!amount || saving) return;
    setSaving(true);
    await fetch("/api/financial/revenue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stream, amount: parseFloat(amount), description, date }),
    });
    setAmount(""); setDescription(""); setShowForm(false);
    setSaving(false);
    onRefresh();
  }

  async function deleteEntry(id: string) {
    if (!window.confirm("Delete this entry?")) return;
    await fetch(`/api/financial/revenue?id=${id}`, { method: "DELETE" });
    onRefresh();
  }

  return (
    <div>
      {/* Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="border border-border bg-white px-3 py-1.5 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
          >
            {months.map((m) => (
              <option key={m} value={m}>{monthLabel(m)}</option>
            ))}
          </select>
          <span className="text-sm text-muted">{filtered.length} entries · Total: <span className="font-medium text-dark">{fmt(total)}</span></span>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-primary text-white text-xs font-medium px-3 py-1.5 hover:bg-primary-hover transition-colors"
        >
          + Log revenue
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={addEntry} className="bg-white border border-border p-4 mb-4 grid grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-dark mb-1">Stream</label>
            <select
              value={stream}
              onChange={(e) => setStream(e.target.value)}
              className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
            >
              {REVENUE_STREAMS.map((s) => (
                <option key={s} value={s}>{STREAM_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-dark mb-1">Amount ($)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              min="0"
              step="0.01"
              placeholder="0.00"
              autoFocus
              className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-dark mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-dark mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional note"
              className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="col-span-4 flex gap-2">
            <button
              type="submit"
              disabled={saving || !amount}
              className="bg-primary text-white text-sm font-medium px-4 py-1.5 hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {saving ? "Saving…" : "Add entry"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-1.5 border border-border text-sm text-muted hover:text-dark transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Entries */}
      {filtered.length === 0 ? (
        <div className="border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted">No revenue logged for {monthLabel(month)}.</p>
        </div>
      ) : (
        <div className="bg-white border border-border divide-y divide-border">
          {filtered.map((entry) => (
            <div key={entry.id} className="flex items-center gap-4 px-5 py-3.5 group hover:bg-light transition-colors">
              <span className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 shrink-0 ${STREAM_BADGE[entry.stream] ?? "bg-border text-muted"}`}>
                {STREAM_LABELS[entry.stream] ?? entry.stream}
              </span>
              <div className="flex-1 min-w-0">
                {entry.description && (
                  <p className="text-sm text-dark truncate">{entry.description}</p>
                )}
                <p className="text-xs text-muted">{entry.date}</p>
              </div>
              <span className="text-sm font-medium text-dark shrink-0">{fmt(entry.amount)}</span>
              <button
                onClick={() => deleteEntry(entry.id)}
                className="text-xs text-muted hover:text-accent transition-colors opacity-0 group-hover:opacity-100 shrink-0"
              >
                Delete
              </button>
            </div>
          ))}
          <div className="flex items-center justify-between px-5 py-3 bg-light">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Total</span>
            <span className="text-sm font-bold text-dark">{fmt(total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Expenses tab ──────────────────────────────────────────────────────────────

function ExpensesTab({ entries, onRefresh }: { entries: ExpenseEntry[]; onRefresh: () => void }) {
  const [month, setMonth] = useState(currentMonth());
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [recurring, setRecurring] = useState(false);
  const [saving, setSaving] = useState(false);

  const filtered = entries.filter((e) => e.date.startsWith(month));
  const total = filtered.reduce((s, e) => s + e.amount, 0);

  const months = [...new Set(entries.map((e) => e.date.slice(0, 7)))].sort().reverse();
  if (!months.includes(currentMonth())) months.unshift(currentMonth());

  async function addEntry(ev: React.FormEvent) {
    ev.preventDefault();
    if (!amount || saving) return;
    setSaving(true);
    await fetch("/api/financial/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, amount: parseFloat(amount), description, date, recurring }),
    });
    setAmount(""); setDescription(""); setRecurring(false); setShowForm(false);
    setSaving(false);
    onRefresh();
  }

  async function deleteEntry(id: string) {
    if (!window.confirm("Delete this entry?")) return;
    await fetch(`/api/financial/expenses?id=${id}`, { method: "DELETE" });
    onRefresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="border border-border bg-white px-3 py-1.5 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
          >
            {months.map((m) => (
              <option key={m} value={m}>{monthLabel(m)}</option>
            ))}
          </select>
          <span className="text-sm text-muted">{filtered.length} entries · Total: <span className="font-medium text-dark">{fmt(total)}</span></span>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-accent text-white text-xs font-medium px-3 py-1.5 hover:bg-accent-hover transition-colors"
        >
          + Log expense
        </button>
      </div>

      {showForm && (
        <form onSubmit={addEntry} className="bg-white border border-border p-4 mb-4 grid grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-dark mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-dark mb-1">Amount ($)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              min="0"
              step="0.01"
              placeholder="0.00"
              autoFocus
              className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-dark mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-dark mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional note"
              className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="col-span-4 flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={recurring}
                onChange={(e) => setRecurring(e.target.checked)}
                className="w-4 h-4 accent-primary"
              />
              <span className="text-sm text-dark">Recurring monthly</span>
            </label>
            <div className="flex gap-2 ml-auto">
              <button
                type="submit"
                disabled={saving || !amount}
                className="bg-accent text-white text-sm font-medium px-4 py-1.5 hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                {saving ? "Saving…" : "Add entry"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-1.5 border border-border text-sm text-muted hover:text-dark transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {filtered.length === 0 ? (
        <div className="border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted">No expenses logged for {monthLabel(month)}.</p>
        </div>
      ) : (
        <div className="bg-white border border-border divide-y divide-border">
          {filtered.map((entry) => (
            <div key={entry.id} className="flex items-center gap-4 px-5 py-3.5 group hover:bg-light transition-colors">
              <span className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 shrink-0 ${CATEGORY_BADGE[entry.category] ?? "bg-border text-muted"}`}>
                {CATEGORY_LABELS[entry.category] ?? entry.category}
              </span>
              {entry.recurring && (
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 bg-gold-tint text-gold shrink-0">
                  Recurring
                </span>
              )}
              <div className="flex-1 min-w-0">
                {entry.description && (
                  <p className="text-sm text-dark truncate">{entry.description}</p>
                )}
                <p className="text-xs text-muted">{entry.date}</p>
              </div>
              <span className="text-sm font-medium text-dark shrink-0">{fmt(entry.amount)}</span>
              <button
                onClick={() => deleteEntry(entry.id)}
                className="text-xs text-muted hover:text-accent transition-colors opacity-0 group-hover:opacity-100 shrink-0"
              >
                Delete
              </button>
            </div>
          ))}
          <div className="flex items-center justify-between px-5 py-3 bg-light">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Total</span>
            <span className="text-sm font-bold text-dark">{fmt(total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── P&L tab ───────────────────────────────────────────────────────────────────

function PLTab({ revenue, expenses }: { revenue: RevenueEntry[]; expenses: ExpenseEntry[] }) {
  const months = last6Months();

  const rows = months.map((m) => {
    const rev = revenue.filter((e) => e.date.startsWith(m)).reduce((s, e) => s + e.amount, 0);
    const exp = expenses.filter((e) => e.date.startsWith(m)).reduce((s, e) => s + e.amount, 0);
    return { month: m, revenue: rev, expenses: exp, net: rev - exp };
  });

  const maxRev = Math.max(...rows.map((r) => r.revenue), 1);

  return (
    <div className="flex flex-col gap-6">
      {/* Bar chart */}
      <div className="bg-white border border-border p-5">
        <h3 className="font-medium text-dark mb-6">Revenue vs Expenses — Last 6 Months</h3>
        <div className="flex items-end gap-3 h-40">
          {rows.map((r) => (
            <div key={r.month} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex items-end gap-1 h-32">
                <div
                  className="flex-1 bg-primary transition-all"
                  style={{ height: `${(r.revenue / maxRev) * 100}%`, minHeight: r.revenue > 0 ? "4px" : "0" }}
                  title={`Revenue: ${fmt(r.revenue)}`}
                />
                <div
                  className="flex-1 bg-accent/60 transition-all"
                  style={{ height: `${(r.expenses / maxRev) * 100}%`, minHeight: r.expenses > 0 ? "4px" : "0" }}
                  title={`Expenses: ${fmt(r.expenses)}`}
                />
              </div>
              <p className="text-[10px] text-muted text-center leading-tight">{monthLabel(r.month).split(" ")[0]}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-primary" />
            <span className="text-xs text-muted">Revenue</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-accent/60" />
            <span className="text-xs text-muted">Expenses</span>
          </div>
        </div>
      </div>

      {/* Monthly table */}
      <div className="bg-white border border-border">
        <div className="grid grid-cols-4 px-5 py-2.5 border-b border-border bg-light">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">Month</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted text-right">Revenue</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted text-right">Expenses</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted text-right">Net</span>
        </div>
        {rows.map((r) => (
          <div key={r.month} className="grid grid-cols-4 px-5 py-3.5 border-b border-border last:border-0 hover:bg-light transition-colors">
            <span className="text-sm text-dark">{monthLabel(r.month)}</span>
            <span className="text-sm text-dark text-right">{fmt(r.revenue)}</span>
            <span className="text-sm text-dark text-right">{fmt(r.expenses)}</span>
            <span className={`text-sm font-medium text-right ${r.net >= 0 ? "text-primary" : "text-accent"}`}>
              {r.net >= 0 ? "+" : ""}{fmt(r.net)}
            </span>
          </div>
        ))}
        <div className="grid grid-cols-4 px-5 py-3 bg-light border-t border-border">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">6-Month Total</span>
          <span className="text-sm font-bold text-dark text-right">{fmt(rows.reduce((s, r) => s + r.revenue, 0))}</span>
          <span className="text-sm font-bold text-dark text-right">{fmt(rows.reduce((s, r) => s + r.expenses, 0))}</span>
          <span className={`text-sm font-bold text-right ${rows.reduce((s, r) => s + r.net, 0) >= 0 ? "text-primary" : "text-accent"}`}>
            {fmt(rows.reduce((s, r) => s + r.net, 0))}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  subColor = "muted",
  onClick,
}: {
  label: string;
  value: string;
  sub: string;
  subColor?: "muted" | "accent-pos" | "accent-neg";
  onClick?: () => void;
}) {
  const subClass = subColor === "accent-pos" ? "text-primary" : subColor === "accent-neg" ? "text-accent" : "text-muted";
  return (
    <button
      onClick={onClick}
      className="bg-white border border-border p-5 text-left hover:border-primary/30 transition-colors block w-full"
    >
      <p className="text-2xl font-bold text-dark mb-1">{value}</p>
      <p className="text-xs text-muted mb-1">{label}</p>
      <p className={`text-xs ${subClass}`}>{sub}</p>
    </button>
  );
}
