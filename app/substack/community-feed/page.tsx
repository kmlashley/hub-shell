"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface FeedItem {
  id: string;
  source_id: string;
  title: string;
  url: string;
  excerpt: string | null;
  published_at: string | null;
  read_at: string | null;
  created_at: string;
  feed_sources: { publication_name: string; publication_url: string } | null;
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function CommunityFeedPage() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<string | null>(null);
  const [filterSource, setFilterSource] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterSource) params.set("source_id", filterSource);
    if (unreadOnly) params.set("unread", "true");
    const r = await fetch(`/api/substack/feed-items?${params}`);
    const d = await r.json();
    setItems(d.items ?? []);
    setLoading(false);
  }, [filterSource, unreadOnly]);

  useEffect(() => { load(); }, [load]);

  // Unique sources from items for filter dropdown
  const sources = [...new Map(
    items.map((i) => [i.source_id, i.feed_sources?.publication_name ?? "Unknown"])
  ).entries()];

  async function markRead(item: FeedItem) {
    if (item.read_at) return;
    const readAt = new Date().toISOString();
    await fetch(`/api/substack/feed-items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read_at: readAt }),
    });
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, read_at: readAt } : i))
    );
  }

  async function saveAsResearch(item: FeedItem) {
    if (savingId || savedIds.has(item.id)) return;
    setSavingId(item.id);
    const content = [
      `**${item.title}**`,
      item.feed_sources?.publication_name ? `Source: ${item.feed_sources.publication_name}` : "",
      item.url,
      item.excerpt ?? "",
    ].filter(Boolean).join("\n\n");

    await fetch("/api/substack/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, status: "Draft", category: "Resource" }),
    });

    setSavedIds((prev) => new Set([...prev, item.id]));
    setSavingId(null);
    markRead(item);
  }

  async function runScrape() {
    if (scraping) return;
    setScraping(true);
    setScrapeResult(null);
    try {
      const r = await fetch("/api/substack/feed-scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const d = await r.json();
      if (d.success) {
        setScrapeResult(
          d.totalAdded > 0
            ? `Added ${d.totalAdded} new post${d.totalAdded !== 1 ? "s" : ""}`
            : "No new posts found"
        );
        load();
      } else {
        setScrapeResult(`Error: ${d.error}`);
      }
    } catch {
      setScrapeResult("Scrape failed — check your Firecrawl key");
    } finally {
      setScraping(false);
    }
  }

  const unreadCount = items.filter((i) => !i.read_at).length;

  return (
    <div className="max-w-4xl mx-auto">

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs text-muted mb-2">
            <Link href="/" className="hover:text-dark transition-colors">Dashboard</Link>
            {" › "}
            <Link href="/substack" className="hover:text-dark transition-colors">Substack</Link>
            {" › "}
            <span className="text-dark">Community Feed</span>
          </p>
          <h1 className="text-2xl font-serif text-dark mb-1">Community Feed</h1>
          <p className="text-sm text-muted">Posts from Substack publications you follow.</p>
        </div>
        <div className="flex gap-2 items-start">
          <Link
            href="/substack/community-feed/sources"
            className="text-xs font-medium px-3 py-1.5 border border-border text-dark hover:border-primary/40 hover:text-primary transition-colors"
          >
            Manage Sources
          </Link>
          <button
            onClick={runScrape}
            disabled={scraping}
            className="bg-primary text-white text-xs font-medium px-3 py-1.5 hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {scraping ? "Scraping…" : "↻ Refresh Feed"}
          </button>
        </div>
      </div>

      {/* Scrape result */}
      {scrapeResult && (
        <div className={`px-4 py-2.5 mb-4 text-sm border ${
          scrapeResult.startsWith("Error") || scrapeResult.includes("failed")
            ? "bg-rust-tint border-accent/30 text-accent"
            : "bg-teal-tint border-primary/20 text-primary"
        }`}>
          {scrapeResult}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-5 items-center">
        <select
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value)}
          className="text-sm border border-border bg-white text-dark px-3 py-1.5 focus:outline-none focus:border-primary transition-colors"
        >
          <option value="">All publications</option>
          {sources.map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>

        <button
          onClick={() => setUnreadOnly(!unreadOnly)}
          className={`text-xs font-medium px-3 py-1.5 border transition-colors ${
            unreadOnly
              ? "bg-primary text-white border-primary"
              : "border-border text-muted hover:text-dark hover:border-dark/30"
          }`}
        >
          Unread only {unreadCount > 0 && `(${unreadCount})`}
        </button>

        <span className="text-xs text-muted ml-auto">
          {items.length} post{items.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Empty states */}
      {!loading && items.length === 0 && (
        <div className="border border-dashed border-border p-16 text-center">
          {sources.length === 0 ? (
            <>
              <p className="text-sm text-muted mb-2">No sources added yet.</p>
              <Link
                href="/substack/community-feed/sources"
                className="text-xs text-primary hover:text-primary-hover transition-colors"
              >
                Add your first publication →
              </Link>
            </>
          ) : (
            <>
              <p className="text-sm text-muted mb-2">No posts in your feed yet.</p>
              <button
                onClick={runScrape}
                className="text-xs text-primary hover:text-primary-hover transition-colors"
              >
                Click Refresh Feed to pull the latest posts →
              </button>
            </>
          )}
        </div>
      )}

      {/* Feed items */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white border border-border p-5 animate-pulse">
              <div className="h-3 bg-border w-1/4 mb-3" />
              <div className="h-4 bg-border w-3/4 mb-2" />
              <div className="h-3 bg-border w-full mb-1" />
              <div className="h-3 bg-border w-2/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => {
            const isRead = !!item.read_at;
            const isSaved = savedIds.has(item.id);

            return (
              <div
                key={item.id}
                className={`bg-white border px-5 py-4 transition-colors ${
                  isRead ? "border-border opacity-60" : "border-border hover:border-primary/20"
                }`}
              >
                {/* Source + date */}
                <div className="flex items-center gap-2 mb-2">
                  {item.feed_sources?.publication_name && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 bg-teal-tint text-primary">
                      {item.feed_sources.publication_name}
                    </span>
                  )}
                  {item.published_at && (
                    <span className="text-xs text-muted">
                      {new Date(item.published_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  )}
                  {isRead && (
                    <span className="text-[10px] text-muted ml-auto">Read</span>
                  )}
                </div>

                {/* Title */}
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => markRead(item)}
                  className="block text-sm font-medium text-dark hover:text-primary transition-colors mb-1.5"
                >
                  {item.title} ↗
                </a>

                {/* Excerpt */}
                {item.excerpt && (
                  <p className="text-xs text-muted leading-relaxed line-clamp-2 mb-3">
                    {item.excerpt}
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-3 items-center">
                  <button
                    onClick={() => saveAsResearch(item)}
                    disabled={isSaved || savingId === item.id}
                    className={`text-xs font-medium transition-colors ${
                      isSaved
                        ? "text-olive cursor-default"
                        : "text-primary hover:text-primary-hover"
                    }`}
                  >
                    {isSaved ? "Saved to Notes ✓" : savingId === item.id ? "Saving…" : "Save as research"}
                  </button>

                  {!isRead && (
                    <button
                      onClick={() => markRead(item)}
                      className="text-xs text-muted hover:text-dark transition-colors"
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
