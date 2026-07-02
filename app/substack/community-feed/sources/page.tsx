"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface FeedSource {
  id: string;
  publication_url: string;
  publication_name: string;
  active: boolean;
  last_scraped_at: string | null;
  created_at: string;
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function FeedSourcesPage() {
  const [sources, setSources] = useState<FeedSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/substack/feed-sources");
    const d = await r.json();
    setSources(d.sources ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addSource(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !url.trim() || adding) return;
    setAdding(true);

    let normalized = url.trim();
    if (!normalized.startsWith("http")) normalized = `https://${normalized}`;

    const r = await fetch("/api/substack/feed-sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publication_name: name.trim(), publication_url: normalized }),
    });
    const d = await r.json();
    if (d.success) {
      setSources((prev) => [d.source, ...prev]);
      setName("");
      setUrl("");
      setShowForm(false);
    }
    setAdding(false);
  }

  async function toggleActive(source: FeedSource) {
    const r = await fetch(`/api/substack/feed-sources/${source.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !source.active }),
    });
    const d = await r.json();
    if (d.success) {
      setSources((prev) =>
        prev.map((s) => (s.id === source.id ? { ...s, active: !source.active } : s))
      );
    }
  }

  async function deleteSource(id: string) {
    if (!window.confirm("Remove this publication and all its feed items?")) return;
    setDeletingId(id);
    await fetch(`/api/substack/feed-sources/${id}`, { method: "DELETE" });
    setSources((prev) => prev.filter((s) => s.id !== id));
    setDeletingId(null);
  }

  function fmtDate(dt: string | null) {
    if (!dt) return "Never";
    return new Date(dt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return (
    <div className="max-w-3xl mx-auto">

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs text-muted mb-2">
            <Link href="/" className="hover:text-dark transition-colors">Dashboard</Link>
            {" › "}
            <Link href="/substack" className="hover:text-dark transition-colors">Substack</Link>
            {" › "}
            <Link href="/substack/community-feed" className="hover:text-dark transition-colors">Community Feed</Link>
            {" › "}
            <span className="text-dark">Sources</span>
          </p>
          <h1 className="text-2xl font-serif text-dark mb-1">Feed Sources</h1>
          <p className="text-sm text-muted">Manage which Substack publications appear in your feed.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-primary text-white text-xs font-medium px-3 py-1.5 hover:bg-primary-hover transition-colors"
        >
          + Add Publication
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={addSource} className="bg-white border border-border p-5 mb-5">
          <h2 className="text-sm font-medium text-dark mb-4">Add Publication</h2>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted mb-1.5">
                Publication Name
              </label>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. The Diff"
                className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted mb-1.5">
                Publication URL
              </label>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                placeholder="e.g. https://diff.substack.com"
                className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!name.trim() || !url.trim() || adding}
              className="bg-primary text-white text-sm font-medium px-4 py-1.5 hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {adding ? "Adding…" : "Add Publication"}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setName(""); setUrl(""); }}
              className="px-4 py-1.5 border border-border text-sm text-muted hover:text-dark transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Sources list */}
      {loading ? (
        <div className="flex flex-col gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-white border border-border animate-pulse" />
          ))}
        </div>
      ) : sources.length === 0 ? (
        <div className="border border-dashed border-border p-16 text-center">
          <p className="text-sm text-muted mb-2">No publications added yet.</p>
          <button
            onClick={() => setShowForm(true)}
            className="text-xs text-primary hover:text-primary-hover transition-colors"
          >
            Add your first Substack publication →
          </button>
        </div>
      ) : (
        <div className="bg-white border border-border divide-y divide-border">
          {sources.map((source) => (
            <div key={source.id} className="flex items-center gap-4 px-5 py-4 group">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-dark">{source.publication_name}</p>
                  <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 ${
                    source.active
                      ? "bg-teal-tint text-primary"
                      : "bg-light text-muted border border-border"
                  }`}>
                    {source.active ? "Active" : "Paused"}
                  </span>
                </div>
                <a
                  href={source.publication_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted hover:text-primary transition-colors truncate block"
                >
                  {source.publication_url} ↗
                </a>
                <p className="text-[11px] text-muted mt-1">
                  Last scraped: {fmtDate(source.last_scraped_at)}
                </p>
              </div>

              <div className="flex gap-2 items-center shrink-0">
                <button
                  onClick={() => toggleActive(source)}
                  className="text-xs border border-border text-muted hover:text-dark hover:border-dark/30 px-3 py-1 transition-colors"
                >
                  {source.active ? "Pause" : "Activate"}
                </button>
                <button
                  onClick={() => deleteSource(source.id)}
                  disabled={deletingId === source.id}
                  className="text-xs text-muted hover:text-accent transition-colors opacity-0 group-hover:opacity-100"
                >
                  {deletingId === source.id ? "…" : "Remove"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {sources.length > 0 && (
        <p className="text-xs text-muted mt-4 text-center">
          {sources.filter((s) => s.active).length} active · {sources.filter((s) => !s.active).length} paused
          {" · "}
          <Link href="/substack/community-feed" className="text-primary hover:text-primary-hover transition-colors">
            Go to feed →
          </Link>
        </p>
      )}
    </div>
  );
}
