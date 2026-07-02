"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fmtRelative, fmtDate } from "@/lib/fmt-date";
import type { ReviewItem, OutputType } from "@/lib/review/types";

// ─── Config ────────────────────────────────────────────────────────────────────

type TabKey = "pending" | "approved" | "completed";
type DateFilter = "all" | "7d" | "30d";

const TABS: { key: TabKey; label: string; statuses: string[] }[] = [
  { key: "pending",   label: "Pending Review", statuses: ["ready"] },
  { key: "approved",  label: "Approved",        statuses: ["approved"] },
  { key: "completed", label: "Completed",       statuses: ["rejected", "redirected", "published"] },
];

const TYPE_CONFIG: Record<string, { label: string; cls: string }> = {
  brief:       { label: "Brief",    cls: "bg-teal-tint text-primary" },
  draft:       { label: "Draft",    cls: "bg-purple-tint text-purple" },
  research:    { label: "Research", cls: "bg-olive-tint text-olive" },
  analysis:    { label: "Analysis", cls: "bg-gold-tint text-gold" },
  social_post: { label: "Social",   cls: "bg-rust-tint text-accent" },
  other:       { label: "Other",    cls: "bg-light text-muted" },
};

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  approved:   { label: "Approved",           cls: "text-primary" },
  rejected:   { label: "Discarded",          cls: "text-muted" },
  redirected: { label: "Revision Requested", cls: "text-gold" },
  published:  { label: "Published",          cls: "text-olive" },
};

const ROUTE_OPTIONS = [
  { label: "Intelligence Hub", href: "/intelligence" },
  { label: "Content Hub",      href: "/content" },
  { label: "Dashboard",        href: "/" },
];

const DEFAULT_ROUTES: Partial<Record<OutputType, string>> = {
  brief:       "/intelligence",
  research:    "/intelligence",
  analysis:    "/intelligence",
  draft:       "/content",
  social_post: "/content",
  other:       "/",
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function extractPreview(payload: Record<string, unknown>): string {
  const keys = ["opening_hook", "summary", "rationale", "content", "description", "differentiation_angle"];
  for (const key of keys) {
    if (typeof payload[key] === "string" && payload[key]) {
      return (payload[key] as string).slice(0, 150);
    }
  }
  for (const v of Object.values(payload)) {
    if (typeof v === "string" && v) return v.slice(0, 150);
  }
  return "";
}

function getAgentLabel(item: ReviewItem): string {
  const src = item.metadata?.source;
  if (typeof src === "string") return src.replace(/_/g, " ");
  if (item.agent_id) return "Agent";
  return "Unknown";
}

function applyDateFilter(items: ReviewItem[], f: DateFilter): ReviewItem[] {
  if (f === "all") return items;
  const ms = f === "7d" ? 7 * 86_400_000 : 30 * 86_400_000;
  const cutoff = Date.now() - ms;
  return items.filter((i) => new Date(i.created_at).getTime() > cutoff);
}

function toLabel(key: string) {
  return key.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function safeStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return JSON.stringify(v);
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ReviewPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("pending");
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ReviewItem | null>(null);
  const [notes, setNotes] = useState("");
  const [routeTo, setRouteTo] = useState("");
  const [acting, setActing] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  useEffect(() => { loadItems(activeTab); }, [activeTab]);

  async function loadItems(tab: TabKey) {
    setLoading(true);
    setSelected(null);
    setNotes("");
    const statuses = TABS.find((t) => t.key === tab)!.statuses.join(",");
    const res = await fetch(`/api/review/outputs?statuses=${statuses}`);
    const data = await res.json();
    setItems(data.items ?? []);
    setLoading(false);
  }

  function switchTab(tab: TabKey) {
    setActiveTab(tab);
    setTypeFilter("all");
    setDateFilter("all");
  }

  function selectItem(item: ReviewItem) {
    setSelected(item);
    setNotes("");
    setRouteTo(DEFAULT_ROUTES[item.output_type] ?? "/");
  }

  async function act(action: "approve" | "reject" | "redirect") {
    if (!selected || acting) return;
    setActing(true);
    await fetch("/api/review/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: selected.id,
        action,
        notes: notes || undefined,
        route_to: action === "approve" ? routeTo : undefined,
      }),
    });
    setSelected(null);
    setNotes("");
    await loadItems(activeTab);
    setActing(false);
  }

  async function draftPost() {
    if (!selected || drafting) return;
    setDrafting(true);
    setDraftError(null);

    const res = await fetch("/api/content/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brief_id: selected.id, brief: selected.payload }),
    });
    const data = await res.json();

    if (data.success) {
      const refresh = await fetch(`/api/review/outputs/${selected.id}`);
      const refreshData = await refresh.json();
      if (refreshData.item) setSelected(refreshData.item);
    } else {
      setDraftError(data.error ?? "Failed to draft post");
    }
    setDrafting(false);
  }

  const allTypes = [...new Set(items.map((i) => i.output_type))];
  const filtered = applyDateFilter(
    typeFilter === "all" ? items : items.filter((i) => i.output_type === typeFilter),
    dateFilter
  );

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-serif text-dark mb-1">Review Queue</h1>
        <p className="text-sm text-muted">
          Everything your AI agents produce lands here first. Approve, redirect, or discard — nothing moves forward without your sign-off.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-border">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => switchTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted hover:text-dark"
              }`}
            >
              {tab.label}
              {tab.key === "pending" && !loading && items.length > 0 && activeTab === "pending" && (
                <span className="ml-2 text-[11px] bg-primary/10 text-primary px-1.5 py-0.5">
                  {items.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filter bar */}
      {!loading && items.length > 0 && (
        <div className="flex items-center gap-3 mb-4">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs border border-border px-2.5 py-1.5 text-dark bg-white focus:outline-none focus:border-primary"
          >
            <option value="all">All Output Types</option>
            {allTypes.map((t) => (
              <option key={t} value={t}>{TYPE_CONFIG[t]?.label ?? t}</option>
            ))}
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as DateFilter)}
            className="text-xs border border-border px-2.5 py-1.5 text-dark bg-white focus:outline-none focus:border-primary"
          >
            <option value="all">All Time</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>

          {(typeFilter !== "all" || dateFilter !== "all") && (
            <button
              onClick={() => { setTypeFilter("all"); setDateFilter("all"); }}
              className="text-xs text-muted hover:text-dark"
            >
              Clear filters
            </button>
          )}

          <span className="text-xs text-muted ml-auto">
            {filtered.length} item{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Main split panel */}
      <div className="flex gap-5">
        {/* Left: item list */}
        <div className="w-[300px] shrink-0 space-y-2">
          {loading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-white border border-border animate-pulse" />
            ))
          ) : filtered.length === 0 ? (
            <div className="bg-white border border-border p-8 text-center">
              <p className="text-sm text-muted">
                {activeTab === "pending" ? "Queue is clear." : "Nothing here yet."}
              </p>
              {activeTab === "pending" && (
                <p className="text-xs text-muted mt-1">
                  Run a research sweep to generate new items.
                </p>
              )}
            </div>
          ) : (
            filtered.map((item) => {
              const isSelected = selected?.id === item.id;
              const preview = extractPreview(item.payload);
              return (
                <button
                  key={item.id}
                  onClick={() => selectItem(item)}
                  className={`w-full text-left bg-white border p-3.5 transition-colors ${
                    isSelected ? "border-primary/40 bg-primary/5" : "border-border hover:border-primary/20"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 ${TYPE_CONFIG[item.output_type]?.cls ?? "bg-light text-muted"}`}>
                      {TYPE_CONFIG[item.output_type]?.label ?? item.output_type}
                    </span>
                    {activeTab === "pending" ? (
                      <span className={`ml-auto text-[10px] font-medium px-1.5 py-0.5 ${
                        item.priority_score >= 80 ? "bg-accent/10 text-accent"
                        : item.priority_score >= 50 ? "bg-gold/10 text-gold"
                        : "bg-border text-muted"
                      }`}>
                        {item.priority_score >= 80 ? "High" : item.priority_score >= 50 ? "Med" : "Low"}
                      </span>
                    ) : (
                      <span className={`ml-auto text-[10px] ${STATUS_CONFIG[item.status]?.cls ?? "text-muted"}`}>
                        {STATUS_CONFIG[item.status]?.label ?? item.status}
                      </span>
                    )}
                  </div>

                  <p className="text-sm font-medium text-dark leading-snug line-clamp-2 mb-1">
                    {item.title}
                  </p>

                  {preview && (
                    <p className="text-xs text-muted line-clamp-2 mb-1.5">{preview}</p>
                  )}

                  <p className="text-[11px] text-muted/70">
                    {getAgentLabel(item)} · {fmtRelative(item.created_at)}
                  </p>
                </button>
              );
            })
          )}
        </div>

        {/* Right: detail panel */}
        <div className="flex-1 min-w-0">
          {selected ? (
            <div className="bg-white border border-border p-6">
              {/* Item header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 ${TYPE_CONFIG[selected.output_type]?.cls ?? "bg-light text-muted"}`}>
                      {TYPE_CONFIG[selected.output_type]?.label ?? selected.output_type}
                    </span>
                    {activeTab !== "pending" && (
                      <span className={`text-xs ${STATUS_CONFIG[selected.status]?.cls ?? "text-muted"}`}>
                        {STATUS_CONFIG[selected.status]?.label ?? selected.status}
                      </span>
                    )}
                  </div>
                  <h2 className="font-medium text-dark text-lg leading-snug">{selected.title}</h2>
                  <p className="text-xs text-muted mt-0.5">
                    {getAgentLabel(selected)} · {fmtDate(selected.created_at)}
                  </p>
                </div>
                <Link
                  href={`/review/${selected.id}`}
                  className="text-xs text-primary hover:underline shrink-0 ml-4"
                >
                  Full view →
                </Link>
              </div>

              {/* Routed-to banner for approved items */}
              {selected.status === "approved" && typeof selected.metadata?.route_to === "string" ? (
                <div className="mb-4 p-3 bg-teal-tint flex items-center justify-between">
                  <p className="text-xs text-primary">
                    Routed to: <span className="font-medium">{selected.metadata.route_to}</span>
                  </p>
                  <Link href={selected.metadata.route_to} className="text-xs text-primary font-medium hover:underline">
                    Go there →
                  </Link>
                </div>
              ) : null}

              {/* Draft this post — for approved briefs */}
              {selected.output_type === "brief" && selected.status === "approved" && (
                <div className="mb-4 p-3 bg-white border border-border">
                  <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-2">
                    Content Draft
                  </p>
                  {typeof selected.metadata?.drafted_post_id === "string" ? (
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-primary">Draft written.</p>
                      <Link href="/content" className="text-sm text-primary font-medium hover:underline">
                        View in Content →
                      </Link>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-muted mb-2">
                        Send this brief to the Content Draft agent to write the full post.
                      </p>
                      {draftError && (
                        <p className="text-xs text-accent mb-2">{draftError}</p>
                      )}
                      <button
                        onClick={draftPost}
                        disabled={drafting}
                        className="w-full py-2 bg-primary text-white text-sm font-medium hover:bg-primary-hover disabled:opacity-40 transition-colors"
                      >
                        {drafting ? "Writing draft…" : "Draft this post"}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Review notes for completed items */}
              {selected.human_notes && activeTab !== "pending" ? (
                <div className="mb-4 p-3 bg-gold-tint border-l-2 border-gold">
                  <p className="text-[10px] font-semibold text-gold uppercase tracking-wider mb-0.5">Review note</p>
                  <p className="text-sm text-dark">{selected.human_notes}</p>
                </div>
              ) : null}

              <div className="border-t border-border mb-4" />

              {/* Payload */}
              <div className="bg-light p-4 mb-4 max-h-[380px] overflow-y-auto">
                <PayloadDisplay payload={selected.payload} />
              </div>

              {/* Actions — pending only */}
              {activeTab === "pending" && (
                <>
                  <div className="mb-3">
                    <label className="text-xs text-muted block mb-1">Route to (on approval)</label>
                    <select
                      value={routeTo}
                      onChange={(e) => setRouteTo(e.target.value)}
                      className="w-full text-sm border border-border px-3 py-2 text-dark bg-white focus:outline-none focus:border-primary"
                    >
                      {ROUTE_OPTIONS.map((r) => (
                        <option key={r.href} value={r.href}>{r.label}</option>
                      ))}
                    </select>
                  </div>

                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes (required for Request Revision)..."
                    className="w-full border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none mb-4"
                    rows={3}
                  />

                  <div className="flex gap-3">
                    <button
                      onClick={() => act("approve")}
                      disabled={acting}
                      className="flex-1 py-2 bg-primary text-white text-sm font-medium hover:bg-primary-hover disabled:opacity-40 transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => act("redirect")}
                      disabled={acting || !notes.trim()}
                      className="flex-1 py-2 bg-gold text-white text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-colors"
                    >
                      Request Revision
                    </button>
                    <button
                      onClick={() => act("reject")}
                      disabled={acting}
                      className="flex-1 py-2 border border-border text-muted text-sm font-medium hover:text-dark hover:border-dark/30 disabled:opacity-40 transition-colors"
                    >
                      Discard
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div
              className="bg-white border border-border flex items-center justify-center"
              style={{ minHeight: 320 }}
            >
              <p className="text-sm text-muted">Select an item to review.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Payload Display ───────────────────────────────────────────────────────────

function PayloadDisplay({ payload }: { payload: Record<string, unknown> }) {
  const entries = Object.entries(payload).filter(([, v]) => v !== null && v !== undefined);

  if (entries.length === 0) {
    return <p className="text-xs text-muted">No content available.</p>;
  }

  return (
    <div className="space-y-4">
      {entries.map(([key, value]) => (
        <div key={key}>
          <p className="text-[10px] font-semibold tracking-wider uppercase text-muted mb-1">
            {toLabel(key)}
          </p>

          {typeof value === "string" && (
            <p className="text-sm text-dark leading-relaxed">{value}</p>
          )}

          {typeof value === "number" && (
            <p className="text-sm text-dark">{value.toLocaleString()}</p>
          )}

          {Array.isArray(value) && (
            <ul className="space-y-1">
              {(value as unknown[]).map((v, i) => (
                <li key={i} className="text-sm text-dark flex gap-2">
                  <span className="text-muted shrink-0">—</span>
                  <span>{safeStr(v)}</span>
                </li>
              ))}
            </ul>
          )}

          {typeof value === "object" && !Array.isArray(value) && (
            <div className="pl-3 border-l border-border space-y-2">
              {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
                <div key={k}>
                  <p className="text-[10px] text-muted mb-0.5">{toLabel(k)}</p>
                  {Array.isArray(v) ? (
                    <ul className="space-y-0.5">
                      {(v as unknown[]).map((item, i) => (
                        <li key={i} className="text-sm text-dark flex gap-2">
                          <span className="text-muted">—</span>
                          <span>{safeStr(item)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-dark">{safeStr(v)}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
