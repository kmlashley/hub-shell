"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Campaign {
  id: string;
  name: string;
  type: "launch" | "promo" | "paid" | "organic" | "other";
  status: "planning" | "active" | "complete";
  start_date: string | null;
  end_date: string | null;
  goal: string | null;
  result: string | null;
  notes: string | null;
  created_at: string;
}

type FormData = Omit<Campaign, "id" | "created_at">;

// ─── Config ────────────────────────────────────────────────────────────────────

const STATUS: Record<Campaign["status"], { label: string; className: string }> = {
  planning: { label: "Planning", className: "bg-gold-tint text-gold" },
  active:   { label: "Active",   className: "bg-teal-tint text-primary" },
  complete: { label: "Complete", className: "bg-border text-muted" },
};

const TYPE_LABELS: Record<Campaign["type"], string> = {
  launch:  "Launch",
  promo:   "Promo",
  paid:    "Paid",
  organic: "Organic",
  other:   "Other",
};

const BLANK: FormData = {
  name: "",
  type: "launch",
  status: "planning",
  start_date: null,
  end_date: null,
  goal: null,
  result: null,
  notes: null,
};

function fmtDate(d: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return new Date(Number(y), Number(m) - 1, Number(day)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Campaign["status"] | "all">("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/sales-marketing/campaigns");
    if (res.ok) {
      const data = await res.json();
      setCampaigns(data.campaigns ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSave(data: FormData) {
    if (editing) {
      await fetch("/api/sales-marketing/campaigns", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editing.id, ...data }),
      });
    } else {
      await fetch("/api/sales-marketing/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    }
    setShowForm(false);
    setEditing(null);
    await load();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this campaign?")) return;
    await fetch(`/api/sales-marketing/campaigns?id=${id}`, { method: "DELETE" });
    if (expanded === id) setExpanded(null);
    await load();
  }

  const filtered = filter === "all" ? campaigns : campaigns.filter((c) => c.status === filter);

  const counts = {
    all:      campaigns.length,
    planning: campaigns.filter((c) => c.status === "planning").length,
    active:   campaigns.filter((c) => c.status === "active").length,
    complete: campaigns.filter((c) => c.status === "complete").length,
  };

  return (
    <div className="max-w-4xl mx-auto">

      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="text-xs text-muted mb-2">
            <Link href="/" className="hover:text-dark transition-colors">Dashboard</Link>
            {" › "}
            <Link href="/sales-marketing" className="hover:text-dark transition-colors">Sales & Marketing</Link>
            {" › "}
            <span className="text-dark">Campaigns</span>
          </p>
          <h1 className="text-2xl font-serif text-dark mb-1">Campaigns</h1>
          <p className="text-sm text-muted">Track launches, promos, and paid campaigns — goals, results, and dates.</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="bg-primary text-white text-sm font-medium px-4 py-2 hover:bg-primary-hover transition-colors shrink-0"
        >
          + Add campaign
        </button>
      </div>

      {/* Status filters */}
      <div className="flex items-center gap-2 mb-6">
        {(["all", "planning", "active", "complete"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 text-xs font-medium border transition-colors capitalize ${
              filter === s
                ? "bg-primary text-white border-primary"
                : "bg-white border-border text-dark hover:border-primary/30"
            }`}
          >
            {s === "all" ? "All" : STATUS[s].label} ({counts[s]})
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex flex-col gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-white border border-border animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-border p-16 text-center">
          <p className="text-base font-serif text-dark mb-1">
            {filter === "all" ? "No campaigns yet" : `No ${STATUS[filter as Campaign["status"]].label.toLowerCase()} campaigns`}
          </p>
          {filter === "all" && (
            <>
              <p className="text-sm text-muted mb-5">Add your first campaign to start tracking.</p>
              <button
                onClick={() => { setEditing(null); setShowForm(true); }}
                className="bg-primary text-white text-sm px-5 py-2 hover:bg-primary-hover transition-colors"
              >
                Add your first campaign
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="bg-white border border-border divide-y divide-border">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_100px_80px_140px_140px] gap-4 px-5 py-2.5 bg-light">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Campaign</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Type</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Status</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Start</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">End</span>
          </div>

          {filtered.map((campaign) => {
            const s = STATUS[campaign.status];
            const isOpen = expanded === campaign.id;
            return (
              <div key={campaign.id}>
                {/* Row */}
                <div
                  className="grid grid-cols-[1fr_100px_80px_140px_140px] gap-4 px-5 py-3.5 items-center hover:bg-light transition-colors cursor-pointer group"
                  onClick={() => setExpanded(isOpen ? null : campaign.id)}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-dark truncate">{campaign.name}</p>
                  </div>
                  <span className="text-xs text-muted">{TYPE_LABELS[campaign.type]}</span>
                  <span className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 w-fit ${s.className}`}>
                    {s.label}
                  </span>
                  <span className="text-xs text-muted">{fmtDate(campaign.start_date)}</span>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted">{fmtDate(campaign.end_date)}</span>
                    <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditing(campaign); setShowForm(true); }}
                        className="text-xs text-muted hover:text-dark transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(campaign.id); }}
                        className="text-xs text-muted hover:text-accent transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="px-5 py-4 bg-light border-t border-border grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Goal</p>
                      <p className="text-sm text-dark">
                        {campaign.goal ?? <span className="text-muted italic">No goal set</span>}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Result</p>
                      <p className="text-sm text-dark">
                        {campaign.result ?? <span className="text-muted italic">No result recorded yet</span>}
                      </p>
                    </div>
                    {campaign.notes && (
                      <div className="col-span-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Notes</p>
                        <p className="text-sm text-dark">{campaign.notes}</p>
                      </div>
                    )}
                    <div className="col-span-2">
                      <Link
                        href="/sales-marketing/revenue"
                        className="text-xs text-primary hover:underline"
                      >
                        View revenue entries →
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <CampaignForm
          initial={editing}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}

    </div>
  );
}

// ─── Campaign form modal ───────────────────────────────────────────────────────

function CampaignForm({
  initial,
  onSave,
  onClose,
}: {
  initial: Campaign | null;
  onSave: (data: FormData) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<Campaign["type"]>(initial?.type ?? "launch");
  const [status, setStatus] = useState<Campaign["status"]>(initial?.status ?? "planning");
  const [startDate, setStartDate] = useState(initial?.start_date ?? "");
  const [endDate, setEndDate] = useState(initial?.end_date ?? "");
  const [goal, setGoal] = useState(initial?.goal ?? "");
  const [result, setResult] = useState(initial?.result ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === backdropRef.current) onClose();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    await onSave({
      name: name.trim(),
      type,
      status,
      start_date: startDate || null,
      end_date: endDate || null,
      goal: goal.trim() || null,
      result: result.trim() || null,
      notes: notes.trim() || null,
    });
    setSaving(false);
  }

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-dark/50 flex items-center justify-center z-50 p-4"
    >
      <div className="bg-white border border-border w-full max-w-lg shadow-3 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-serif text-dark">{initial ? "Edit campaign" : "Add campaign"}</h2>
          <button onClick={onClose} className="text-muted hover:text-dark transition-colors text-2xl leading-none">
            &times;
          </button>
        </div>

        <form onSubmit={submit} className="p-6 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-dark mb-1.5">
              Name <span className="text-accent">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              placeholder="e.g. Summer Course Launch, Black Friday Promo"
              className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-dark mb-1.5">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as Campaign["type"])}
                className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
              >
                <option value="launch">Launch</option>
                <option value="promo">Promo</option>
                <option value="paid">Paid</option>
                <option value="organic">Organic</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-dark mb-1.5">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Campaign["status"])}
                className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
              >
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="complete">Complete</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-dark mb-1.5">
                Start date <span className="text-muted font-normal text-xs">(optional)</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark mb-1.5">
                End date <span className="text-muted font-normal text-xs">(optional)</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark mb-1.5">
              Goal <span className="text-muted font-normal text-xs">(optional)</span>
            </label>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. 20 course sales, $5k revenue, 500 new subscribers"
              rows={2}
              className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark mb-1.5">
              Result <span className="text-muted font-normal text-xs">(optional)</span>
            </label>
            <textarea
              value={result}
              onChange={(e) => setResult(e.target.value)}
              placeholder="What actually happened…"
              rows={2}
              className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark mb-1.5">
              Notes <span className="text-muted font-normal text-xs">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Lessons learned, things to repeat or avoid…"
              rows={2}
              className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex-1 bg-primary text-white text-sm font-medium py-2 hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {saving ? "Saving…" : initial ? "Save changes" : "Add campaign"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-border text-sm text-muted hover:text-dark hover:border-dark/30 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
