"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Status = "Pending" | "Approved" | "Published" | "Discarded";

interface QueuePost {
  id: string;
  platform: string;
  content: string;
  source: string | null;
  status: Status;
  approved_at: string | null;
  published_at: string | null;
  created_at: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const TABS: Status[] = ["Pending", "Approved", "Published"];

const PLATFORM_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  linkedin:      { label: "LinkedIn",      bg: "bg-navy",         color: "text-white" },
  twitter:       { label: "X / Twitter",   bg: "bg-dark",         color: "text-white" },
  instagram:     { label: "Instagram",     bg: "bg-purple",       color: "text-white" },
  substack_note: { label: "Substack Note", bg: "bg-olive",        color: "text-white" },
  facebook:      { label: "Facebook",      bg: "bg-primary",      color: "text-white" },
};

function platformBadge(platform: string) {
  const cfg = PLATFORM_CONFIG[platform.toLowerCase()] ?? {
    label: platform,
    bg: "bg-ink-3",
    color: "text-white",
  };
  return (
    <span className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 ${cfg.bg} ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function SocialQueuePage() {
  const [posts, setPosts] = useState<QueuePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Status>("Pending");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [batchBusy, setBatchBusy] = useState(false);

  // Add post form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPlatform, setNewPlatform] = useState("linkedin");
  const [newContent, setNewContent] = useState("");
  const [newSource, setNewSource] = useState("");
  const [adding, setAdding] = useState(false);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/social-queue");
    const d = await r.json();
    setPosts(d.posts ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // Switch tab → clear selection
  function switchTab(t: Status) {
    setTab(t);
    setSelected(new Set());
    setEditingId(null);
  }

  // ── Individual actions ──────────────────────────────────────────────────────

  async function approve(post: QueuePost, content?: string) {
    setBusy((prev) => new Set(prev).add(post.id));

    const updatedContent = content ?? post.content;

    // Update queue status
    await fetch(`/api/social-queue/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Approved", content: updatedContent }),
    });

    // Push to Distribution
    await fetch("/api/distribution/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: updatedContent,
        platforms: [post.platform],
        status: "draft",
      }),
    });

    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? { ...p, status: "Approved", content: updatedContent, approved_at: new Date().toISOString() }
          : p
      )
    );
    setEditingId(null);
    setBusy((prev) => { const s = new Set(prev); s.delete(post.id); return s; });
  }

  async function discard(id: string) {
    setBusy((prev) => new Set(prev).add(id));
    await fetch(`/api/social-queue/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Discarded" }),
    });
    setPosts((prev) => prev.filter((p) => p.id !== id));
    setBusy((prev) => { const s = new Set(prev); s.delete(id); return s; });
  }

  async function markPublished(id: string) {
    setBusy((prev) => new Set(prev).add(id));
    await fetch(`/api/social-queue/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Published" }),
    });
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, status: "Published", published_at: new Date().toISOString() } : p
      )
    );
    setBusy((prev) => { const s = new Set(prev); s.delete(id); return s; });
  }

  // ── Batch approve ───────────────────────────────────────────────────────────

  async function batchApprove() {
    if (selected.size === 0) return;
    setBatchBusy(true);
    const pending = posts.filter((p) => selected.has(p.id) && p.status === "Pending");
    await Promise.all(pending.map((p) => approve(p)));
    setSelected(new Set());
    setBatchBusy(false);
  }

  // ── Add post ────────────────────────────────────────────────────────────────

  async function addPost() {
    if (!newContent.trim() || adding) return;
    setAdding(true);
    const r = await fetch("/api/social-queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform: newPlatform,
        content: newContent.trim(),
        source: newSource.trim() || null,
      }),
    });
    const d = await r.json();
    if (d.post) {
      setPosts((prev) => [d.post, ...prev]);
      setNewContent("");
      setNewSource("");
      setShowAddForm(false);
      setTab("Pending");
    }
    setAdding(false);
  }

  // ── Toggle select ───────────────────────────────────────────────────────────

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  }

  function toggleSelectAll() {
    const visible = filtered.map((p) => p.id);
    const allSelected = visible.every((id) => selected.has(id));
    if (allSelected) {
      setSelected((prev) => {
        const s = new Set(prev);
        visible.forEach((id) => s.delete(id));
        return s;
      });
    } else {
      setSelected((prev) => {
        const s = new Set(prev);
        visible.forEach((id) => s.add(id));
        return s;
      });
    }
  }

  // ── Derived ──────────────────────────────────────────────────────────────────

  const counts: Record<Status, number> = {
    Pending:   posts.filter((p) => p.status === "Pending").length,
    Approved:  posts.filter((p) => p.status === "Approved").length,
    Published: posts.filter((p) => p.status === "Published").length,
    Discarded: 0,
  };

  const filtered = posts.filter((p) => p.status === tab);
  const selectedInTab = filtered.filter((p) => selected.has(p.id));
  const allInTabSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.id));

  return (
    <div className="max-w-4xl mx-auto">

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs text-muted mb-2">
            <Link href="/" className="hover:text-dark transition-colors">Dashboard</Link>
            {" › "}
            <span className="text-dark">Social Queue</span>
          </p>
          <h1 className="text-2xl font-serif text-dark mb-1">Social Queue</h1>
          <p className="text-sm text-muted">Review AI-generated social posts before they go anywhere.</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-primary text-white text-xs font-medium px-3 py-1.5 hover:bg-primary-hover transition-colors"
        >
          + Add Post
        </button>
      </div>

      {/* Add post form */}
      {showAddForm && (
        <div className="bg-white border border-border p-5 mb-6">
          <h2 className="text-sm font-medium text-dark mb-4">Add to Queue</h2>
          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted mb-1.5">Platform</label>
                <select
                  value={newPlatform}
                  onChange={(e) => setNewPlatform(e.target.value)}
                  className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
                >
                  {Object.entries(PLATFORM_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted mb-1.5">Source (optional)</label>
                <input
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value)}
                  placeholder="e.g. Post Scorer, AI Chat"
                  className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors placeholder:text-muted"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted mb-1.5">Content</label>
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Paste the post content…"
                rows={4}
                className="w-full border border-border bg-light px-3 py-2 text-sm text-dark resize-none focus:outline-none focus:border-primary transition-colors placeholder:text-muted"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setShowAddForm(false); setNewContent(""); setNewSource(""); }}
                className="text-xs text-muted hover:text-dark transition-colors px-3 py-1.5"
              >
                Cancel
              </button>
              <button
                onClick={addPost}
                disabled={!newContent.trim() || adding}
                className="bg-primary text-white text-xs font-medium px-4 py-1.5 hover:bg-primary-hover transition-colors disabled:opacity-50"
              >
                {adding ? "Adding…" : "Add to Queue"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0 border-b border-border mb-5">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            className={`px-5 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px ${
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-dark"
            }`}
          >
            {t}
            {counts[t] > 0 && (
              <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 ${
                tab === t ? "bg-teal-tint text-primary" : "bg-light text-muted"
              }`}>
                {counts[t]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Batch controls (Pending only) */}
      {tab === "Pending" && filtered.length > 0 && (
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-2 text-xs text-muted hover:text-dark transition-colors"
          >
            <span className={`w-4 h-4 border flex items-center justify-center transition-colors ${
              allInTabSelected ? "border-primary bg-primary" : "border-border"
            }`}>
              {allInTabSelected && <span className="text-white text-[10px] leading-none">✓</span>}
            </span>
            Select all
          </button>
          {selectedInTab.length > 0 && (
            <button
              onClick={batchApprove}
              disabled={batchBusy}
              className="bg-primary text-white text-xs font-medium px-3 py-1.5 hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {batchBusy ? "Approving…" : `Approve selected (${selectedInTab.length})`}
            </button>
          )}
        </div>
      )}

      {/* Post list */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 bg-white border border-border animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted">
            {tab === "Pending" ? "Nothing waiting for review." : `No ${tab.toLowerCase()} posts yet.`}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((post) => (
            <div
              key={post.id}
              className={`bg-white border transition-colors ${
                selected.has(post.id) ? "border-primary/40" : "border-border"
              }`}
            >
              {/* Card header */}
              <div className="px-4 py-3 border-b border-border flex items-center gap-3">
                {tab === "Pending" && (
                  <button
                    onClick={() => toggleSelect(post.id)}
                    className={`w-4 h-4 border shrink-0 flex items-center justify-center transition-colors ${
                      selected.has(post.id) ? "border-primary bg-primary" : "border-border hover:border-primary/40"
                    }`}
                  >
                    {selected.has(post.id) && <span className="text-white text-[10px] leading-none">✓</span>}
                  </button>
                )}
                {platformBadge(post.platform)}
                {post.source && (
                  <span className="text-[11px] text-muted">From: {post.source}</span>
                )}
                <span className="text-[11px] text-muted ml-auto">
                  {new Date(post.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>

              {/* Content */}
              <div className="px-4 py-3">
                {editingId === post.id ? (
                  <textarea
                    autoFocus
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={5}
                    className="w-full text-sm text-dark bg-light border border-border px-3 py-2 resize-none focus:outline-none focus:border-primary transition-colors"
                  />
                ) : (
                  <p className="text-sm text-dark leading-relaxed whitespace-pre-wrap">{post.content}</p>
                )}
              </div>

              {/* Actions */}
              <div className="px-4 pb-3 flex items-center gap-2">
                {tab === "Pending" && (
                  <>
                    {editingId === post.id ? (
                      <>
                        <button
                          onClick={() => approve(post, editContent)}
                          disabled={busy.has(post.id)}
                          className="bg-primary text-white text-xs font-medium px-3 py-1.5 hover:bg-primary-hover transition-colors disabled:opacity-50"
                        >
                          {busy.has(post.id) ? "Approving…" : "Approve & Send to Distribution"}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-xs text-muted hover:text-dark transition-colors px-2 py-1.5"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => approve(post)}
                          disabled={busy.has(post.id)}
                          className="bg-primary text-white text-xs font-medium px-3 py-1.5 hover:bg-primary-hover transition-colors disabled:opacity-50"
                        >
                          {busy.has(post.id) ? "Approving…" : "Approve"}
                        </button>
                        <button
                          onClick={() => { setEditingId(post.id); setEditContent(post.content); }}
                          className="text-xs font-medium px-3 py-1.5 border border-border text-dark hover:border-primary/40 hover:text-primary transition-colors"
                        >
                          Edit & Approve
                        </button>
                        <button
                          onClick={() => discard(post.id)}
                          disabled={busy.has(post.id)}
                          className="text-xs text-muted hover:text-accent transition-colors px-2 py-1.5 ml-auto"
                        >
                          Discard
                        </button>
                      </>
                    )}
                  </>
                )}

                {tab === "Approved" && (
                  <button
                    onClick={() => markPublished(post.id)}
                    disabled={busy.has(post.id)}
                    className="bg-olive text-white text-xs font-medium px-3 py-1.5 hover:bg-olive/80 transition-colors disabled:opacity-50"
                  >
                    {busy.has(post.id) ? "Marking…" : "Mark as Published"}
                  </button>
                )}

                {tab === "Published" && post.published_at && (
                  <p className="text-[11px] text-muted">
                    Published {new Date(post.published_at).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric",
                    })}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
