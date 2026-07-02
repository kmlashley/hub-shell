"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Tab = "compose" | "queue" | "calendar" | "drafts" | "published";
type PlatformKey = "linkedin" | "substack_note" | "instagram" | "twitter";
type PostStatus = "draft" | "queued" | "published";

interface Post {
  id: string;
  content: string;
  platforms_json: PlatformKey[];
  scheduled_at: string | null;
  status: PostStatus;
  external_id: string | null;
  created_at: string;
}

interface Variant {
  platform: PlatformKey;
  text: string;
  character_count: number;
  notes: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const PLATFORM_LABELS: Record<PlatformKey, string> = {
  linkedin: "LinkedIn",
  substack_note: "Substack Note",
  instagram: "Instagram",
  twitter: "Twitter/X",
};

const PLATFORM_BADGE: Record<PlatformKey, string> = {
  linkedin: "bg-purple-tint text-purple",
  substack_note: "bg-gold-tint text-gold",
  instagram: "bg-rust-tint text-accent",
  twitter: "bg-border text-muted",
};

const STATUS_BADGE: Record<PostStatus, string> = {
  draft: "bg-gold-tint text-gold",
  queued: "bg-teal-tint text-primary",
  published: "bg-olive-tint text-olive",
};

const PLATFORMS: { key: PlatformKey; label: string }[] = [
  { key: "linkedin", label: "LinkedIn" },
  { key: "substack_note", label: "Substack Note" },
  { key: "instagram", label: "Instagram" },
  { key: "twitter", label: "Twitter/X" },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function relDateTime(dateStr: string | null | undefined) {
  if (!dateStr) return "No date set";
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function relDate(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

async function updatePost(id: string, updates: Partial<Post>) {
  return fetch("/api/distribution/posts", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, ...updates }),
  });
}

async function deletePost(id: string) {
  return fetch(`/api/distribution/posts?id=${id}`, { method: "DELETE" });
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function DistributionPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("compose");

  async function load() {
    setLoading(true);
    const r = await fetch("/api/distribution/posts");
    if (r.ok) setPosts((await r.json()).posts ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const queued = posts
    .filter((p) => p.status === "queued")
    .sort((a, b) => {
      if (!a.scheduled_at) return 1;
      if (!b.scheduled_at) return -1;
      return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
    });
  const drafts = posts
    .filter((p) => p.status === "draft")
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const published = posts
    .filter((p) => p.status === "published")
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const TABS: { key: Tab; label: string }[] = [
    { key: "compose", label: "Compose" },
    { key: "queue", label: queued.length > 0 ? `Queue (${queued.length})` : "Queue" },
    { key: "calendar", label: "Calendar" },
    { key: "drafts", label: drafts.length > 0 ? `Drafts (${drafts.length})` : "Drafts" },
    { key: "published", label: "Published" },
  ];

  return (
    <div className="max-w-4xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <p className="text-xs text-muted mb-2">
          <Link href="/" className="hover:text-dark transition-colors">Dashboard</Link>
          {" › "}
          <span className="text-dark">Distribution</span>
        </p>
        <h1 className="text-2xl font-serif text-dark mb-1">Distribution</h1>
        <p className="text-sm text-muted">Compose once, adapt for every platform.</p>
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
          {tab === "compose" && (
            <ComposeTab onSaved={() => { load(); setTab("queue"); }} />
          )}
          {tab === "queue" && (
            <QueueTab posts={queued} onRefresh={load} />
          )}
          {tab === "calendar" && (
            <CalendarTab posts={posts.filter((p) => p.status !== "draft")} />
          )}
          {tab === "drafts" && (
            <DraftsTab posts={drafts} onRefresh={load} />
          )}
          {tab === "published" && (
            <PublishedTab posts={published} />
          )}
        </>
      )}
    </div>
  );
}

// ─── Compose tab ───────────────────────────────────────────────────────────────

function ComposeTab({ onSaved }: { onSaved: () => void }) {
  const [content, setContent] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformKey[]>(["linkedin"]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [genError, setGenError] = useState<string | null>(null);

  function togglePlatform(p: PlatformKey) {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  }

  async function generateVariants() {
    if (!content.trim() || generating) return;
    setGenerating(true);
    setGenError(null);
    const r = await fetch("/api/distribution/social-post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, platforms: selectedPlatforms }),
    });
    const json = await r.json();
    if (json.variants) {
      setVariants(json.variants);
    } else {
      setGenError(json.error ?? "Failed to generate variants. Check your Anthropic API key.");
    }
    setGenerating(false);
  }

  async function savePost(status: "draft" | "queued") {
    if (!content.trim() || saving) return;
    setSaving(true);
    await fetch("/api/distribution/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content,
        platforms_json: selectedPlatforms,
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        status,
      }),
    });
    setContent("");
    setVariants([]);
    setScheduledAt("");
    setSaving(false);
    onSaved();
  }

  return (
    <div className="flex flex-col gap-5">

      {/* Source content */}
      <div>
        <label className="block text-xs font-medium text-dark mb-1">Source content</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Paste your source content here — a newsletter excerpt, idea, or key insight. The AI will adapt it for each platform you select."
          rows={7}
          className="w-full border border-border bg-white px-4 py-3 text-sm text-dark focus:outline-none focus:border-primary transition-colors resize-none"
        />
        <p className="text-xs text-muted mt-1">{content.length} characters</p>
      </div>

      {/* Platform selector */}
      <div>
        <label className="block text-xs font-medium text-dark mb-2">Platforms</label>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => (
            <button
              key={p.key}
              onClick={() => togglePlatform(p.key)}
              className={`text-xs font-medium px-3 py-1.5 border transition-colors ${
                selectedPlatforms.includes(p.key)
                  ? "border-primary bg-teal-tint text-primary"
                  : "border-border text-muted hover:text-dark hover:border-dark/30"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Generate */}
      <div className="flex items-center gap-3">
        <button
          onClick={generateVariants}
          disabled={!content.trim() || selectedPlatforms.length === 0 || generating}
          className="bg-primary text-white text-sm font-medium px-4 py-2 hover:bg-primary-hover transition-colors disabled:opacity-50"
        >
          {generating ? "Generating…" : "Generate platform variants"}
        </button>
        {variants.length > 0 && (
          <p className="text-xs text-primary">{variants.length} variant{variants.length !== 1 ? "s" : ""} ready</p>
        )}
      </div>

      {genError && (
        <div className="border border-accent/30 bg-rust-tint px-4 py-3">
          <p className="text-xs text-accent">{genError}</p>
        </div>
      )}

      {/* Platform previews */}
      {variants.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-dark">Platform previews</h3>
          {variants.map((v) => (
            <div key={v.platform} className="bg-white border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <span className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 ${PLATFORM_BADGE[v.platform] ?? "bg-border text-muted"}`}>
                  {PLATFORM_LABELS[v.platform] ?? v.platform}
                </span>
                <span className="text-xs text-muted">{v.character_count} chars</span>
              </div>
              <p className="text-sm text-dark whitespace-pre-wrap leading-relaxed">{v.text}</p>
              {v.notes && (
                <p className="text-xs text-muted mt-3 pt-3 border-t border-border italic">{v.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Schedule + save */}
      <div className="flex flex-col gap-3 pt-3 border-t border-border">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-dark mb-1">Schedule for (optional)</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full border border-border bg-white px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => savePost("draft")}
              disabled={!content.trim() || saving}
              className="border border-border text-sm font-medium px-4 py-2 text-dark hover:border-primary/40 transition-colors disabled:opacity-50"
            >
              Save draft
            </button>
            <button
              onClick={() => savePost("queued")}
              disabled={!content.trim() || saving}
              className="bg-primary text-white text-sm font-medium px-4 py-2 hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {saving ? "Saving…" : scheduledAt ? "Schedule" : "Add to queue"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Queue tab ─────────────────────────────────────────────────────────────────

function QueueTab({ posts, onRefresh }: { posts: Post[]; onRefresh: () => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editScheduledAt, setEditScheduledAt] = useState("");
  const [saving, setSaving] = useState(false);

  function startEdit(post: Post) {
    setEditingId(post.id);
    setEditContent(post.content);
    setEditScheduledAt(
      post.scheduled_at
        ? new Date(post.scheduled_at).toISOString().slice(0, 16)
        : ""
    );
  }

  async function saveEdit(id: string) {
    setSaving(true);
    await updatePost(id, {
      content: editContent,
      scheduled_at: editScheduledAt ? new Date(editScheduledAt).toISOString() : null,
    });
    setSaving(false);
    setEditingId(null);
    onRefresh();
  }

  async function markPublished(id: string) {
    await updatePost(id, { status: "published" });
    onRefresh();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this post?")) return;
    await deletePost(id);
    onRefresh();
  }

  if (posts.length === 0) {
    return (
      <div className="border border-dashed border-border p-16 text-center">
        <p className="text-sm text-muted mb-1">Queue is empty.</p>
        <p className="text-xs text-muted">Add content from the Compose tab to schedule it here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {posts.map((post) => (
        <div key={post.id} className="bg-white border border-border">
          {editingId === post.id ? (
            <div className="p-4 flex flex-col gap-3">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={5}
                className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors resize-none"
              />
              <div className="flex items-center gap-3">
                <input
                  type="datetime-local"
                  value={editScheduledAt}
                  onChange={(e) => setEditScheduledAt(e.target.value)}
                  className="border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
                />
                <button
                  onClick={() => saveEdit(post.id)}
                  disabled={saving}
                  className="bg-primary text-white text-sm font-medium px-4 py-1.5 hover:bg-primary-hover transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="text-sm text-muted hover:text-dark transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="px-5 py-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-dark leading-relaxed line-clamp-2">{post.content}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  {(post.platforms_json ?? []).map((p) => (
                    <span key={p} className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 ${PLATFORM_BADGE[p] ?? "bg-border text-muted"}`}>
                      {PLATFORM_LABELS[p] ?? p}
                    </span>
                  ))}
                  <span className="text-xs text-muted">
                    {post.scheduled_at ? `Scheduled ${relDateTime(post.scheduled_at)}` : "No date set"}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => markPublished(post.id)}
                    className="text-xs text-muted hover:text-primary transition-colors"
                  >
                    Mark published
                  </button>
                  <button
                    onClick={() => startEdit(post)}
                    className="text-xs text-muted hover:text-dark transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(post.id)}
                    className="text-xs text-muted hover:text-accent transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Calendar tab ──────────────────────────────────────────────────────────────

function CalendarTab({ posts }: { posts: Post[] }) {
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthLabel = viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // Days in month
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Index posts by date string YYYY-MM-DD
  const postsByDay: Record<string, Post[]> = {};
  for (const post of posts) {
    const dateStr = post.scheduled_at
      ? new Date(post.scheduled_at).toISOString().split("T")[0]
      : null;
    if (dateStr) {
      postsByDay[dateStr] = [...(postsByDay[dateStr] ?? []), post];
    }
  }

  function dayKey(d: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  function prevMonth() {
    setViewDate(new Date(year, month - 1, 1));
    setSelectedDay(null);
  }

  function nextMonth() {
    setViewDate(new Date(year, month + 1, 1));
    setSelectedDay(null);
  }

  const selectedPosts = selectedDay ? (postsByDay[selectedDay] ?? []) : [];

  return (
    <div className="flex flex-col gap-4">
      {/* Month nav */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-dark">{monthLabel}</h3>
        <div className="flex gap-1">
          <button
            onClick={prevMonth}
            className="px-3 py-1.5 border border-border text-sm text-muted hover:text-dark transition-colors"
          >
            ←
          </button>
          <button
            onClick={nextMonth}
            className="px-3 py-1.5 border border-border text-sm text-muted hover:text-dark transition-colors"
          >
            →
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="bg-white border border-border">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-muted">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {/* Empty cells before first day */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="h-16 border-b border-r border-border last:border-r-0 bg-light" />
          ))}

          {/* Day cells */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const key = dayKey(day);
            const dayPosts = postsByDay[key] ?? [];
            const isSelected = selectedDay === key;
            const isToday =
              new Date().getFullYear() === year &&
              new Date().getMonth() === month &&
              new Date().getDate() === day;
            const col = (firstDay + i) % 7;

            return (
              <button
                key={day}
                onClick={() => setSelectedDay(isSelected ? null : key)}
                className={`h-16 border-b border-border text-left p-2 transition-colors flex flex-col ${
                  col < 6 ? "border-r" : ""
                } ${isSelected ? "bg-teal-tint" : "hover:bg-light"}`}
              >
                <span className={`text-xs font-medium mb-1 ${isToday ? "text-primary font-bold" : "text-dark"}`}>
                  {day}
                </span>
                {dayPosts.length > 0 && (
                  <div className="flex flex-wrap gap-0.5">
                    {dayPosts.slice(0, 3).map((p, idx) => (
                      <span
                        key={idx}
                        className={`w-2 h-2 ${p.status === "published" ? "bg-olive" : "bg-primary"}`}
                      />
                    ))}
                    {dayPosts.length > 3 && (
                      <span className="text-[10px] text-muted">+{dayPosts.length - 3}</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 bg-primary" />
          <span className="text-xs text-muted">Queued</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 bg-olive" />
          <span className="text-xs text-muted">Published</span>
        </div>
      </div>

      {/* Selected day posts */}
      {selectedDay && (
        <div className="bg-white border border-border">
          <div className="px-5 py-3.5 border-b border-border">
            <h3 className="text-sm font-medium text-dark">
              {new Date(selectedDay + "T12:00:00").toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </h3>
          </div>
          {selectedPosts.length === 0 ? (
            <p className="text-sm text-muted px-5 py-4">No posts scheduled for this day.</p>
          ) : (
            <div className="divide-y divide-border">
              {selectedPosts.map((post) => (
                <div key={post.id} className="px-5 py-3.5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 ${STATUS_BADGE[post.status]}`}>
                      {post.status}
                    </span>
                    {(post.platforms_json ?? []).map((p) => (
                      <span key={p} className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 ${PLATFORM_BADGE[p] ?? "bg-border text-muted"}`}>
                        {PLATFORM_LABELS[p] ?? p}
                      </span>
                    ))}
                    {post.scheduled_at && (
                      <span className="text-xs text-muted">
                        {new Date(post.scheduled_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-dark line-clamp-2 leading-relaxed">{post.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Drafts tab ────────────────────────────────────────────────────────────────

function DraftsTab({ posts, onRefresh }: { posts: Post[]; onRefresh: () => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editScheduledAt, setEditScheduledAt] = useState("");
  const [saving, setSaving] = useState(false);

  function startEdit(post: Post) {
    setEditingId(post.id);
    setEditContent(post.content);
    setEditScheduledAt("");
  }

  async function saveEdit(id: string, status: "draft" | "queued") {
    setSaving(true);
    await updatePost(id, {
      content: editContent,
      status,
      scheduled_at: editScheduledAt ? new Date(editScheduledAt).toISOString() : null,
    });
    setSaving(false);
    setEditingId(null);
    onRefresh();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this draft?")) return;
    await deletePost(id);
    onRefresh();
  }

  if (posts.length === 0) {
    return (
      <div className="border border-dashed border-border p-16 text-center">
        <p className="text-sm text-muted">No drafts yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {posts.map((post) => (
        <div key={post.id} className="bg-white border border-border">
          {editingId === post.id ? (
            <div className="p-4 flex flex-col gap-3">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={5}
                autoFocus
                className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors resize-none"
              />
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="datetime-local"
                  value={editScheduledAt}
                  onChange={(e) => setEditScheduledAt(e.target.value)}
                  className="border border-border bg-light px-3 py-1.5 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
                />
                <button
                  onClick={() => saveEdit(post.id, "draft")}
                  disabled={saving}
                  className="border border-border text-sm font-medium px-3 py-1.5 text-dark hover:border-primary/40 transition-colors disabled:opacity-50"
                >
                  Save draft
                </button>
                <button
                  onClick={() => saveEdit(post.id, "queued")}
                  disabled={saving}
                  className="bg-primary text-white text-sm font-medium px-3 py-1.5 hover:bg-primary-hover transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving…" : editScheduledAt ? "Schedule" : "Add to queue"}
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="text-sm text-muted hover:text-dark transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="px-5 py-4">
              <p className="text-sm text-dark leading-relaxed line-clamp-2 mb-3">{post.content}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  {(post.platforms_json ?? []).map((p) => (
                    <span key={p} className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 ${PLATFORM_BADGE[p] ?? "bg-border text-muted"}`}>
                      {PLATFORM_LABELS[p] ?? p}
                    </span>
                  ))}
                  <span className="text-xs text-muted">{relDate(post.created_at)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => startEdit(post)} className="text-xs text-muted hover:text-dark transition-colors">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(post.id)} className="text-xs text-muted hover:text-accent transition-colors">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Published tab ─────────────────────────────────────────────────────────────

function PublishedTab({ posts }: { posts: Post[] }) {
  if (posts.length === 0) {
    return (
      <div className="border border-dashed border-border p-16 text-center">
        <p className="text-sm text-muted">No published posts yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-border divide-y divide-border">
      {posts.map((post) => (
        <div key={post.id} className="px-5 py-4 hover:bg-light transition-colors">
          <p className="text-sm text-dark leading-relaxed line-clamp-2 mb-2">{post.content}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 bg-olive-tint text-olive">
              Published
            </span>
            {(post.platforms_json ?? []).map((p) => (
              <span key={p} className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 ${PLATFORM_BADGE[p] ?? "bg-border text-muted"}`}>
                {PLATFORM_LABELS[p] ?? p}
              </span>
            ))}
            <span className="text-xs text-muted">{relDate(post.created_at)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
