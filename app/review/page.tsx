"use client";

import { useEffect, useState } from "react";
import { fmtRelative } from "@/lib/fmt-date";
import type { ReviewItem } from "@/lib/review/types";

export default function ReviewPage() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [selected, setSelected] = useState<ReviewItem | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    setLoading(true);
    const res = await fetch("/api/review/outputs");
    const data = await res.json();
    setItems(data.items ?? []);
    setLoading(false);
  }

  async function act(action: "approve" | "reject" | "redirect") {
    if (!selected || acting) return;
    setActing(true);

    await fetch("/api/review/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selected.id, action, notes }),
    });

    setSelected(null);
    setNotes("");
    await loadItems();
    setActing(false);
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-serif text-dark mb-1">Review Queue</h1>
        <p className="text-sm text-muted">
          Approve, reject, or redirect AI-generated briefs and drafts. Nothing moves to content creation without your sign-off.
        </p>
      </div>

      <div className="flex gap-6">
        {/* Item list */}
        <div className="w-[340px] shrink-0 space-y-2">
          {loading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-white border border-border rounded-xl animate-pulse" />
            ))
          ) : items.length === 0 ? (
            <div className="bg-white border border-border rounded-xl p-8 text-center">
              <p className="text-sm text-muted">Queue is clear.</p>
              <p className="text-xs text-muted mt-1">Run a research sweep to generate new briefs.</p>
            </div>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                onClick={() => { setSelected(item); setNotes(""); }}
                className={`w-full text-left bg-white border rounded-xl p-4 transition-colors ${
                  selected?.id === item.id
                    ? "border-primary/40 bg-primary/5"
                    : "border-border hover:border-primary/20"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-dark leading-snug">{item.title}</p>
                  <span
                    className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${
                      item.priority_score >= 80
                        ? "bg-accent/10 text-accent"
                        : item.priority_score >= 50
                        ? "bg-gold/10 text-gold"
                        : "bg-border text-muted"
                    }`}
                  >
                    {item.priority_score >= 80 ? "High" : item.priority_score >= 50 ? "Med" : "Low"}
                  </span>
                </div>
                <p className="text-xs text-muted mt-1">
                  {item.output_type} · {fmtRelative(item.created_at)}
                </p>
              </button>
            ))
          )}
        </div>

        {/* Detail panel */}
        <div className="flex-1 min-w-0">
          {selected ? (
            <div className="bg-white border border-border rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="font-medium text-dark text-lg">{selected.title}</h2>
                  <p className="text-xs text-muted mt-0.5 capitalize">{selected.output_type}</p>
                </div>
                <span className="text-xs text-muted">{fmtRelative(selected.created_at)}</span>
              </div>

              {/* Payload display */}
              <div className="bg-light rounded-lg p-4 mb-4 max-h-[400px] overflow-y-auto">
                <pre className="text-xs text-dark whitespace-pre-wrap font-mono">
                  {JSON.stringify(selected.payload, null, 2)}
                </pre>
              </div>

              {/* Notes */}
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes (required for Redirect, optional for others)..."
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none mb-4"
                rows={3}
              />

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => act("approve")}
                  disabled={acting}
                  className="flex-1 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 disabled:opacity-40 transition-colors"
                >
                  Approve
                </button>
                <button
                  onClick={() => act("redirect")}
                  disabled={acting || !notes.trim()}
                  className="flex-1 py-2 bg-gold text-white rounded-lg text-sm font-medium hover:bg-gold/90 disabled:opacity-40 transition-colors"
                >
                  Redirect
                </button>
                <button
                  onClick={() => act("reject")}
                  disabled={acting}
                  className="flex-1 py-2 border border-border text-muted rounded-lg text-sm font-medium hover:text-dark hover:border-dark/30 disabled:opacity-40 transition-colors"
                >
                  Reject
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-border rounded-xl p-12 flex items-center justify-center h-full">
              <p className="text-sm text-muted">Select an item to review.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
