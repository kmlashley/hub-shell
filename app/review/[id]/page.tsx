"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { fmtDate, fmtRelative } from "@/lib/fmt-date";
import type { ReviewItem, OutputType } from "@/lib/review/types";

// ─── Config ────────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { label: string; cls: string }> = {
  brief:       { label: "Brief",    cls: "bg-teal-tint text-primary" },
  draft:       { label: "Draft",    cls: "bg-purple-tint text-purple" },
  research:    { label: "Research", cls: "bg-olive-tint text-olive" },
  analysis:    { label: "Analysis", cls: "bg-gold-tint text-gold" },
  social_post: { label: "Social",   cls: "bg-rust-tint text-accent" },
  other:       { label: "Other",    cls: "bg-light text-muted" },
};

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  ready:      { label: "Pending Review",     cls: "bg-gold-tint text-gold" },
  approved:   { label: "Approved",           cls: "bg-teal-tint text-primary" },
  rejected:   { label: "Discarded",          cls: "bg-light text-muted" },
  redirected: { label: "Revision Requested", cls: "bg-gold-tint text-gold" },
  published:  { label: "Published",          cls: "bg-olive-tint text-olive" },
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

function toLabel(key: string) {
  return key.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function safeStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return JSON.stringify(v);
}

function getAgentLabel(item: ReviewItem): string {
  const src = item.metadata?.source;
  if (typeof src === "string") return src.replace(/_/g, " ");
  if (item.agent_id) return `Agent ${item.agent_id.slice(0, 8)}…`;
  return "Unknown Agent";
}

function getTrigger(item: ReviewItem): string {
  const t = item.metadata?.triggered_by;
  if (typeof t === "string") return t.replace(/_/g, " ");
  return "—";
}

// ─── Payload Renderer ──────────────────────────────────────────────────────────

function PayloadRenderer({ payload }: { payload: Record<string, unknown> }) {
  // If there's a markdown "content" field, render it
  if (typeof payload.content === "string") {
    return (
      <div className="prose prose-sm max-w-none text-dark">
        <ReactMarkdown>{payload.content}</ReactMarkdown>
      </div>
    );
  }

  const entries = Object.entries(payload).filter(([, v]) => v !== null && v !== undefined);
  if (entries.length === 0) return <p className="text-sm text-muted">No content available.</p>;

  return (
    <div className="space-y-6">
      {entries.map(([key, value]) => (
        <div key={key}>
          <p className="text-[11px] font-semibold tracking-widest uppercase text-muted mb-2">
            {toLabel(key)}
          </p>

          {typeof value === "string" && (
            <p className="text-sm text-dark leading-relaxed">{value}</p>
          )}

          {typeof value === "number" && (
            <p className="text-sm text-dark font-medium">{value.toLocaleString()}</p>
          )}

          {Array.isArray(value) && (
            <ul className="space-y-1.5">
              {(value as unknown[]).map((v, i) => (
                <li key={i} className="flex gap-3 text-sm text-dark">
                  <span className="text-muted shrink-0 mt-0.5">—</span>
                  <span>{safeStr(v)}</span>
                </li>
              ))}
            </ul>
          )}

          {typeof value === "object" && !Array.isArray(value) && (
            <div className="pl-4 border-l-2 border-border space-y-3">
              {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
                <div key={k}>
                  <p className="text-[10px] font-medium text-muted/80 uppercase tracking-wide mb-0.5">
                    {toLabel(k)}
                  </p>
                  {Array.isArray(v) ? (
                    <ul className="space-y-1">
                      {(v as unknown[]).map((item, i) => (
                        <li key={i} className="flex gap-2 text-sm text-dark">
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

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ReviewDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [item, setItem] = useState<ReviewItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [notes, setNotes] = useState("");
  const [routeTo, setRouteTo] = useState("");
  const [acting, setActing] = useState(false);
  const [actionDone, setActionDone] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/review/outputs/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.item) {
          setItem(data.item);
          setRouteTo(DEFAULT_ROUTES[data.item.output_type as OutputType] ?? "/");
        } else {
          setNotFound(true);
        }
        setLoading(false);
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [id]);

  async function act(action: "approve" | "reject" | "redirect") {
    if (!item || acting) return;
    setActing(true);

    const res = await fetch("/api/review/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: item.id,
        action,
        notes: notes || undefined,
        route_to: action === "approve" ? routeTo : undefined,
      }),
    });

    const data = await res.json();
    if (data.success) {
      setActionDone(data.status);
      // Refresh item
      const refresh = await fetch(`/api/review/outputs/${id}`);
      const refreshData = await refresh.json();
      if (refreshData.item) setItem(refreshData.item);
    }
    setActing(false);
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="h-8 w-48 bg-light animate-pulse mb-6" />
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-16 bg-white border border-border animate-pulse" />
            ))}
          </div>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-white border border-border animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !item) {
    return (
      <div className="max-w-5xl mx-auto">
        <Link href="/review" className="text-sm text-muted hover:text-dark mb-6 inline-block">
          ← Back to Review Queue
        </Link>
        <div className="bg-white border border-border p-12 text-center">
          <p className="text-sm text-dark font-medium mb-1">Item not found</p>
          <p className="text-xs text-muted">This output may have been removed.</p>
        </div>
      </div>
    );
  }

  const isPending = item.status === "ready";
  const statusCfg = STATUS_CONFIG[item.status];
  const typeCfg = TYPE_CONFIG[item.output_type];

  return (
    <div className="max-w-5xl mx-auto">
      {/* Back link */}
      <Link href="/review" className="text-sm text-muted hover:text-dark mb-6 inline-block">
        ← Back to Review Queue
      </Link>

      {/* Success banner */}
      {actionDone && (
        <div className="mb-5 p-3 bg-teal-tint border-l-2 border-primary flex items-center justify-between">
          <p className="text-sm text-primary font-medium">
            {actionDone === "approved"
              ? "Approved and routed."
              : actionDone === "rejected"
              ? "Discarded."
              : "Revision requested."}
          </p>
          <button onClick={() => router.push("/review")} className="text-xs text-primary hover:underline">
            Back to queue →
          </button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Content area */}
        <div className="col-span-2">
          {/* Title block */}
          <div className="bg-white border border-border p-6 mb-5">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 ${typeCfg?.cls ?? "bg-light text-muted"}`}>
                {typeCfg?.label ?? item.output_type}
              </span>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 ${statusCfg?.cls ?? "bg-light text-muted"}`}>
                {statusCfg?.label ?? item.status}
              </span>
            </div>
            <h1 className="text-xl font-serif text-dark leading-snug">{item.title}</h1>
          </div>

          {/* Human notes (if revision requested) */}
          {item.human_notes ? (
            <div className="mb-5 p-4 bg-gold-tint border-l-2 border-gold">
              <p className="text-[10px] font-semibold text-gold uppercase tracking-wider mb-1">Review note</p>
              <p className="text-sm text-dark">{item.human_notes}</p>
            </div>
          ) : null}

          {/* Routed-to banner */}
          {item.status === "approved" && typeof item.metadata?.route_to === "string" ? (
            <div className="mb-5 p-4 bg-teal-tint flex items-center justify-between">
              <p className="text-sm text-primary">
                Routed to: <span className="font-medium">{item.metadata.route_to}</span>
              </p>
              <Link href={item.metadata.route_to} className="text-sm text-primary font-medium hover:underline">
                Go there →
              </Link>
            </div>
          ) : null}

          {/* Full output */}
          <div className="bg-white border border-border p-6">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-4">
              Output Content
            </p>
            <PayloadRenderer payload={item.payload} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Metadata */}
          <div className="bg-white border border-border p-4">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-3">
              Metadata
            </p>
            <dl className="space-y-2.5">
              <MetaRow label="Agent" value={getAgentLabel(item)} />
              <MetaRow label="Type" value={typeCfg?.label ?? item.output_type} />
              <MetaRow label="Priority" value={
                item.priority_score >= 80 ? "High"
                : item.priority_score >= 50 ? "Medium"
                : "Low"
              } />
              <MetaRow label="Trigger" value={getTrigger(item)} />
              <MetaRow label="Created" value={fmtDate(item.created_at)} />
              {item.updated_at !== item.created_at && (
                <MetaRow label="Reviewed" value={fmtRelative(item.updated_at)} />
              )}
            </dl>
          </div>

          {/* Actions — only for pending items */}
          {isPending && !actionDone && (
            <div className="bg-white border border-border p-4">
              <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-3">
                Actions
              </p>

              <div className="mb-3">
                <label className="text-xs text-muted block mb-1">Route to (on approval)</label>
                <select
                  value={routeTo}
                  onChange={(e) => setRouteTo(e.target.value)}
                  className="w-full text-sm border border-border px-2.5 py-2 text-dark bg-white focus:outline-none focus:border-primary"
                >
                  {ROUTE_OPTIONS.map((r) => (
                    <option key={r.href} value={r.href}>{r.label}</option>
                  ))}
                </select>
              </div>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes (required for revision request)..."
                rows={4}
                className="w-full border border-border px-2.5 py-2 text-sm focus:outline-none focus:border-primary resize-none mb-3"
              />

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => act("approve")}
                  disabled={acting}
                  className="w-full py-2.5 bg-primary text-white text-sm font-medium hover:bg-primary-hover disabled:opacity-40 transition-colors"
                >
                  Approve
                </button>
                <button
                  onClick={() => act("redirect")}
                  disabled={acting || !notes.trim()}
                  className="w-full py-2.5 bg-gold text-white text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-colors"
                >
                  Request Revision
                </button>
                <button
                  onClick={() => act("reject")}
                  disabled={acting}
                  className="w-full py-2.5 border border-border text-muted text-sm font-medium hover:text-dark hover:border-dark/30 disabled:opacity-40 transition-colors"
                >
                  Discard
                </button>
              </div>
            </div>
          )}

          {/* Raw metadata (debug) */}
          {item.metadata && Object.keys(item.metadata).length > 0 && (
            <details className="bg-white border border-border">
              <summary className="px-4 py-3 text-xs text-muted cursor-pointer hover:text-dark select-none">
                Raw metadata
              </summary>
              <div className="px-4 pb-4">
                <pre className="text-[11px] text-muted font-mono overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(item.metadata, null, 2)}
                </pre>
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MetaRow ──────────────────────────────────────────────────────────────────

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] text-muted uppercase tracking-wide">{label}</dt>
      <dd className="text-sm text-dark capitalize">{value}</dd>
    </div>
  );
}
