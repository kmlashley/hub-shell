"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { fmtDate } from "@/lib/fmt-date";

const STATUSES = ["draft", "review", "approved", "published"] as const;
type Status = (typeof STATUSES)[number];

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-border text-muted",
  review: "bg-gold/10 text-gold",
  approved: "bg-accent/10 text-accent",
  published: "bg-primary/10 text-primary",
};

interface Post {
  id: string;
  title: string;
  content: string | null;
  excerpt: string | null;
  primary_keyword: string | null;
  tags: string[] | null;
  status: string;
  score: number | null;
  score_breakdown: Record<string, unknown> | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editable fields
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [primaryKeyword, setPrimaryKeyword] = useState("");
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState<Status>("draft");

  useEffect(() => {
    fetch(`/api/content/posts/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.post) {
          const p = data.post as Post;
          setPost(p);
          setTitle(p.title ?? "");
          setContent(p.content ?? "");
          setExcerpt(p.excerpt ?? "");
          setPrimaryKeyword(p.primary_keyword ?? "");
          setTags((p.tags ?? []).join(", "));
          setStatus((p.status as Status) ?? "draft");
        } else {
          setNotFound(true);
        }
        setLoading(false);
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [id]);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch(`/api/content/posts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          excerpt: excerpt || null,
          primary_keyword: primaryKeyword || null,
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
          status,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "Failed to save");
      setPost(data.post);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this post? This can't be undone.")) return;
    await fetch(`/api/content/posts/${id}`, { method: "DELETE" });
    router.push("/content");
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="h-8 w-48 bg-light animate-pulse mb-6" />
        <div className="h-64 bg-white border border-border animate-pulse" />
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="max-w-4xl mx-auto">
        <Link href="/content" className="text-sm text-muted hover:text-dark mb-6 inline-block">
          ← Back to Content
        </Link>
        <div className="bg-white border border-border p-12 text-center">
          <p className="text-sm text-dark font-medium mb-1">Post not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/content" className="text-sm text-muted hover:text-dark mb-6 inline-block">
        ← Back to Content
      </Link>

      <div className="flex items-start justify-between mb-5 gap-4">
        <div className="flex-1 min-w-0">
          <input
            className="w-full text-2xl font-serif text-dark bg-transparent outline-none border-b border-transparent focus:border-border pb-1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <p className="text-xs text-muted mt-1">
            Created {fmtDate(post.created_at)} · Updated {fmtDate(post.updated_at)}
            {post.published_at ? ` · Published ${fmtDate(post.published_at)}` : ""}
          </p>
        </div>
        <span className={`text-[10px] font-medium px-2 py-1 rounded-full capitalize shrink-0 ${STATUS_COLORS[status] ?? "bg-border text-muted"}`}>
          {status}
        </span>
      </div>

      {saved && (
        <div className="mb-4 p-3 bg-teal-tint text-primary text-sm">Saved.</div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-rust-tint text-accent text-sm">{error}</div>
      )}

      <div className="bg-white border border-border p-5 mb-4">
        <label className="text-[10px] font-semibold tracking-widest uppercase text-muted block mb-1.5">
          Content
        </label>
        <textarea
          className="w-full text-sm text-dark bg-transparent outline-none resize-none leading-relaxed min-h-[400px] font-mono"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Post content (markdown)…"
        />
      </div>

      <div className="bg-white border border-border p-5 mb-4">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-[10px] font-semibold tracking-widest uppercase text-muted block mb-1.5">
              Primary Keyword
            </label>
            <input
              className="w-full text-sm text-dark bg-transparent outline-none border border-border px-3 py-2 focus:border-primary/50 transition-colors"
              value={primaryKeyword}
              onChange={(e) => setPrimaryKeyword(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold tracking-widest uppercase text-muted block mb-1.5">
              Tags <span className="normal-case font-normal">(comma-separated)</span>
            </label>
            <input
              className="w-full text-sm text-dark bg-transparent outline-none border border-border px-3 py-2 focus:border-primary/50 transition-colors"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>
        </div>
        <label className="text-[10px] font-semibold tracking-widest uppercase text-muted block mb-1.5">
          Excerpt
        </label>
        <textarea
          className="w-full text-sm text-dark bg-transparent outline-none border border-border px-3 py-2 focus:border-primary/50 transition-colors resize-none"
          rows={2}
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
        />
      </div>

      {typeof post.score === "number" && (
        <div className="bg-white border border-border p-5 mb-4">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-2">
            Last Score
          </p>
          <p className="text-2xl font-bold text-dark">{post.score} / 25</p>
        </div>
      )}

      <div className="bg-white border border-border p-5 flex items-center justify-between">
        <div>
          <label className="text-[10px] font-semibold tracking-widest uppercase text-muted block mb-1.5">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as Status)}
            className="text-sm border border-border px-3 py-2 text-dark bg-white focus:outline-none focus:border-primary capitalize"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s} className="capitalize">{s}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDelete}
            className="text-sm text-muted hover:text-accent transition-colors"
          >
            Delete
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="bg-primary text-white text-sm px-5 py-2 hover:bg-primary-hover transition-colors disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
