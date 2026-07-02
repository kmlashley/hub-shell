"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { fmtRelative, fmtDate } from "@/lib/fmt-date";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface AdvisorRef {
  id: string;
  name: string;
  avatar_color: string;
}

interface CopyItem {
  id: string;
  critique_id: string | null;
  advisor_id: string;
  subject: string;
  subject_type: string;
  full_copy: string;
  applied: boolean;
  applied_notes: string | null;
  created_at: string;
  advisors: AdvisorRef | null;
}

// ─── Config ────────────────────────────────────────────────────────────────────

const SUBJECT_TYPE_CONFIG: Record<string, { label: string; cls: string }> = {
  landing_page:      { label: "Landing Page",    cls: "bg-teal-tint text-primary" },
  email:             { label: "Email",            cls: "bg-purple-tint text-purple" },
  social_post:       { label: "Social Post",      cls: "bg-rust-tint text-accent" },
  offer_description: { label: "Offer",            cls: "bg-gold-tint text-gold" },
  other:             { label: "Other",            cls: "bg-light text-muted" },
};

type DateFilter = "all" | "7d" | "30d";
type AppliedFilter = "all" | "applied" | "unused";

function applyFilters(
  items: CopyItem[],
  advisorFilter: string,
  typeFilter: string,
  dateFilter: DateFilter,
  appliedFilter: AppliedFilter
): CopyItem[] {
  let result = items;
  if (advisorFilter !== "all")
    result = result.filter((c) => c.advisor_id === advisorFilter);
  if (typeFilter !== "all")
    result = result.filter((c) => c.subject_type === typeFilter);
  if (appliedFilter === "applied")
    result = result.filter((c) => c.applied);
  if (appliedFilter === "unused")
    result = result.filter((c) => !c.applied);
  if (dateFilter !== "all") {
    const ms = dateFilter === "7d" ? 7 * 86_400_000 : 30 * 86_400_000;
    const cutoff = Date.now() - ms;
    result = result.filter((c) => new Date(c.created_at).getTime() > cutoff);
  }
  return result;
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function CopyLogPage() {
  const [items, setItems] = useState<CopyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [advisorFilter, setAdvisorFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [appliedFilter, setAppliedFilter] = useState<AppliedFilter>("all");
  const [savingNotes, setSavingNotes] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/advisors/copy-log");
    const data = await res.json();
    setItems(data.copy ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleApplied(item: CopyItem) {
    const updated = !item.applied;
    setItems((prev) =>
      prev.map((c) => (c.id === item.id ? { ...c, applied: updated } : c))
    );
    await fetch(`/api/advisors/copy-log/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applied: updated, applied_notes: item.applied_notes }),
    });
  }

  async function saveNotes(item: CopyItem) {
    setSavingNotes(item.id);
    const notes = editingNotes[item.id] ?? item.applied_notes ?? "";
    await fetch(`/api/advisors/copy-log/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applied: item.applied, applied_notes: notes }),
    });
    setItems((prev) =>
      prev.map((c) => (c.id === item.id ? { ...c, applied_notes: notes } : c))
    );
    setSavingNotes(null);
  }

  function exportAsText(filtered: CopyItem[]) {
    const lines = filtered.map((c) => {
      const advisor = c.advisors?.name ?? "Unknown";
      const type = SUBJECT_TYPE_CONFIG[c.subject_type]?.label ?? c.subject_type;
      const applied = c.applied ? "[APPLIED]" : "[UNUSED]";
      return [
        `═══════════════════════════════════════`,
        `${applied} ${type} — ${c.subject}`,
        `Advisor: ${advisor} · ${fmtDate(c.created_at)}`,
        c.applied_notes ? `Notes: ${c.applied_notes}` : "",
        ``,
        c.full_copy,
        ``,
      ]
        .filter((l) => l !== null)
        .join("\n");
    });
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `copy-log-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const allAdvisors = Array.from(
    new Map(
      items
        .filter((c) => c.advisors)
        .map((c) => [c.advisors!.id, c.advisors!])
    ).values()
  );
  const allTypes = [...new Set(items.map((c) => c.subject_type))];
  const filtered = applyFilters(items, advisorFilter, typeFilter, dateFilter, appliedFilter);
  const hasFilters =
    advisorFilter !== "all" ||
    typeFilter !== "all" ||
    dateFilter !== "all" ||
    appliedFilter !== "all";

  const appliedCount = items.filter((c) => c.applied).length;

  return (
    <div className="max-w-5xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="text-xs text-muted mb-2">
            <Link href="/" className="hover:text-dark transition-colors">Dashboard</Link>
            {" › "}
            <Link href="/intelligence" className="hover:text-dark transition-colors">Intelligence</Link>
            {" › "}
            <Link href="/intelligence/advisors" className="hover:text-dark transition-colors">AI Advisors</Link>
            {" › "}
            <span className="text-dark">Copy Log</span>
          </p>
          <h1 className="text-3xl font-serif text-dark mb-1">Copy Log</h1>
          <p className="text-sm text-muted">
            Every piece of copy your advisors have generated. Mark it applied when you use it.
          </p>
        </div>
        {filtered.length > 0 && (
          <button
            onClick={() => exportAsText(filtered)}
            className="border border-border text-dark text-sm font-medium px-4 py-2 hover:border-primary/40 hover:text-primary transition-colors shrink-0"
          >
            Export as text
          </button>
        )}
      </div>

      {/* ── Stats strip ─────────────────────────────────────────────────────── */}
      {!loading && items.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-border p-4">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-1">Total</p>
            <p className="text-3xl font-serif text-dark">{items.length}</p>
            <p className="text-xs text-muted mt-0.5">pieces generated</p>
          </div>
          <div className="bg-white border border-border p-4">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-1">Applied</p>
            <p className="text-3xl font-serif text-dark">{appliedCount}</p>
            <p className="text-xs text-muted mt-0.5">used somewhere</p>
          </div>
          <div className="bg-white border border-border p-4">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-1">Unused</p>
            <p className="text-3xl font-serif text-dark">{items.length - appliedCount}</p>
            <p className="text-xs text-muted mt-0.5">waiting to be used</p>
          </div>
        </div>
      )}

      {/* ── Filters ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <select
          value={advisorFilter}
          onChange={(e) => setAdvisorFilter(e.target.value)}
          className="text-xs border border-border px-2.5 py-1.5 text-dark bg-white focus:outline-none focus:border-primary"
        >
          <option value="all">All advisors</option>
          {allAdvisors.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="text-xs border border-border px-2.5 py-1.5 text-dark bg-white focus:outline-none focus:border-primary"
        >
          <option value="all">All types</option>
          {allTypes.map((t) => (
            <option key={t} value={t}>{SUBJECT_TYPE_CONFIG[t]?.label ?? t}</option>
          ))}
        </select>

        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value as DateFilter)}
          className="text-xs border border-border px-2.5 py-1.5 text-dark bg-white focus:outline-none focus:border-primary"
        >
          <option value="all">All time</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
        </select>

        <select
          value={appliedFilter}
          onChange={(e) => setAppliedFilter(e.target.value as AppliedFilter)}
          className="text-xs border border-border px-2.5 py-1.5 text-dark bg-white focus:outline-none focus:border-primary"
        >
          <option value="all">All status</option>
          <option value="applied">Applied</option>
          <option value="unused">Unused</option>
        </select>

        {hasFilters && (
          <button
            onClick={() => {
              setAdvisorFilter("all");
              setTypeFilter("all");
              setDateFilter("all");
              setAppliedFilter("all");
            }}
            className="text-xs text-muted hover:text-dark"
          >
            Clear filters
          </button>
        )}

        {!loading && (
          <span className="text-xs text-muted ml-auto">
            {filtered.length} piece{filtered.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* ── List ─────────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-white border border-border animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-border p-12 text-center">
          <p className="text-sm font-medium text-dark mb-1">
            {hasFilters ? "No copy matches these filters." : "No copy generated yet."}
          </p>
          {!hasFilters && (
            <>
              <p className="text-xs text-muted mb-4">
                Run a critique and click &ldquo;Generate copy&rdquo; to build your archive.
              </p>
              <Link
                href="/intelligence/advisors/run"
                className="inline-block bg-primary text-white text-sm font-medium px-4 py-2 hover:bg-primary-hover transition-colors"
              >
                Run critique →
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((item) => {
            const isExpanded = expandedId === item.id;
            const typeConf = SUBJECT_TYPE_CONFIG[item.subject_type] ?? SUBJECT_TYPE_CONFIG.other;
            const advisor = item.advisors;
            const noteValue = editingNotes[item.id] ?? item.applied_notes ?? "";

            return (
              <div
                key={item.id}
                className={`bg-white border transition-colors ${
                  item.applied ? "border-olive/30" : "border-border"
                }`}
              >
                {/* Row */}
                <div className="flex items-center gap-3 px-4 py-3.5">
                  {/* Applied checkbox */}
                  <button
                    onClick={() => toggleApplied(item)}
                    title={item.applied ? "Mark as unused" : "Mark as applied"}
                    className={`w-5 h-5 shrink-0 border-2 flex items-center justify-center transition-colors ${
                      item.applied
                        ? "bg-olive border-olive"
                        : "border-border hover:border-olive/50"
                    }`}
                  >
                    {item.applied && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path
                          d="M1 4l3 3 5-6"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>

                  {/* Content */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="flex-1 text-left flex items-center gap-3 min-w-0"
                  >
                    <span className={`text-[10px] font-semibold px-2 py-0.5 shrink-0 ${typeConf.cls}`}>
                      {typeConf.label}
                    </span>
                    <p className={`text-sm font-medium leading-snug line-clamp-1 flex-1 min-w-0 ${
                      item.applied ? "text-muted line-through" : "text-dark"
                    }`}>
                      {item.subject}
                    </p>
                    <span className="text-xs text-muted shrink-0 hidden sm:block">
                      {item.full_copy.slice(0, 60).replace(/\n/g, " ")}…
                    </span>
                  </button>

                  {/* Advisor + date */}
                  <div className="flex items-center gap-2 shrink-0">
                    {advisor && (
                      <div
                        className="w-5 h-5 flex items-center justify-center text-white text-[10px] font-semibold"
                        style={{ backgroundColor: advisor.avatar_color }}
                      >
                        {advisor.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-xs text-muted">{fmtRelative(item.created_at)}</span>
                    <span className="text-xs text-accent ml-1">
                      {isExpanded ? "↑" : "↓"}
                    </span>
                  </div>
                </div>

                {/* Applied badge */}
                {item.applied && !isExpanded && item.applied_notes && (
                  <div className="px-4 pb-3 pl-12">
                    <p className="text-xs text-olive">
                      Applied — {item.applied_notes}
                    </p>
                  </div>
                )}

                {/* Expanded */}
                {isExpanded && (
                  <div className="border-t border-border bg-light px-4 py-4">
                    {/* Full copy */}
                    <div className="bg-white border border-border p-4 mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-semibold tracking-widest uppercase text-muted">
                          Full copy
                        </p>
                        <button
                          onClick={() => navigator.clipboard.writeText(item.full_copy)}
                          className="text-xs text-primary hover:underline"
                        >
                          Copy to clipboard
                        </button>
                      </div>
                      <pre className="text-sm text-dark leading-relaxed whitespace-pre-wrap font-sans">
                        {item.full_copy}
                      </pre>
                    </div>

                    {/* Applied notes */}
                    <div className="mb-4">
                      <label className="block text-[10px] font-semibold tracking-widest uppercase text-muted mb-1.5">
                        Where did you use this?
                        <span className="font-normal ml-1 normal-case">optional note</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={noteValue}
                          onChange={(e) =>
                            setEditingNotes((prev) => ({
                              ...prev,
                              [item.id]: e.target.value,
                            }))
                          }
                          placeholder="e.g. Homepage hero, June newsletter, Instagram launch post"
                          className="flex-1 border border-border px-3 py-2 text-sm text-dark placeholder:text-muted/50 focus:outline-none focus:border-primary"
                        />
                        <button
                          onClick={() => saveNotes(item)}
                          disabled={savingNotes === item.id}
                          className="border border-border text-dark text-sm px-3 py-2 hover:border-primary/40 hover:text-primary disabled:opacity-40 transition-colors shrink-0"
                        >
                          {savingNotes === item.id ? "Saving…" : "Save note"}
                        </button>
                      </div>
                    </div>

                    {/* Meta + actions */}
                    <div className="flex items-center gap-4 pt-3 border-t border-border">
                      <div className="flex items-center gap-2">
                        {advisor && (
                          <>
                            <div
                              className="w-5 h-5 flex items-center justify-center text-white text-[10px] font-semibold"
                              style={{ backgroundColor: advisor.avatar_color }}
                            >
                              {advisor.name.charAt(0).toUpperCase()}
                            </div>
                            <Link
                              href={`/intelligence/advisors/${advisor.id}`}
                              className="text-xs text-muted hover:text-dark transition-colors"
                            >
                              {advisor.name}
                            </Link>
                          </>
                        )}
                        <span className="text-xs text-muted">· {fmtDate(item.created_at)}</span>
                      </div>

                      <div className="ml-auto flex items-center gap-3">
                        {item.critique_id && (
                          <Link
                            href="/intelligence/advisors/critiques"
                            className="text-xs text-muted hover:text-dark transition-colors"
                          >
                            View source critique →
                          </Link>
                        )}
                        <button
                          onClick={() => toggleApplied(item)}
                          className={`text-xs font-medium px-3 py-1.5 border transition-colors ${
                            item.applied
                              ? "border-border text-muted hover:text-dark"
                              : "border-olive text-olive hover:bg-olive hover:text-white"
                          }`}
                        >
                          {item.applied ? "Mark as unused" : "Mark as applied"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
