"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fmtRelative } from "@/lib/fmt-date";
import type { ReviewItem } from "@/lib/review/types";

export default function ReviewQueueCard() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/review/outputs?limit=4")
      .then((r) => r.json())
      .then((data) => setItems(data.items ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-white border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-medium text-dark">Review Queue</h2>
        <Link
          href="/review"
          className="text-xs text-primary hover:underline"
        >
          View all →
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-light rounded-lg animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted py-4 text-center">
          No items waiting for review.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/review?id=${item.id}`}
                className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-light transition-colors group"
              >
                <div className="min-w-0">
                  <p className="text-sm text-dark truncate group-hover:text-primary transition-colors">
                    {item.title}
                  </p>
                  <p className="text-[11px] text-muted">
                    {item.output_type} · {fmtRelative(item.created_at)}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ml-3 ${
                    item.priority_score >= 80
                      ? "bg-accent/10 text-accent"
                      : item.priority_score >= 50
                      ? "bg-gold/10 text-gold"
                      : "bg-border text-muted"
                  }`}
                >
                  {item.priority_score >= 80 ? "High" : item.priority_score >= 50 ? "Med" : "Low"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
