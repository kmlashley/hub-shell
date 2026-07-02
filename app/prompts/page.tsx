"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { fmtRelative } from "@/lib/fmt-date";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface SavedPrompt {
  id: string;
  title: string;
  content: string;
  tags: string[];
  category: string;
  created_at: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = ["research", "content", "analysis", "business", "general"];
const CATEGORY_LABELS: Record<string, string> = {
  research: "Research",
  content: "Content",
  analysis: "Analysis",
  business: "Business",
  general: "General",
};
const CATEGORY_BADGE: Record<string, string> = {
  research: "bg-teal-tint text-primary",
  content: "bg-purple-tint text-purple",
  analysis: "bg-gold-tint text-gold",
  business: "bg-olive-tint text-olive",
  general: "bg-border text-muted",
};

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<SavedPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SavedPrompt | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/prompts");
    if (res.ok) setPrompts((await res.json()).prompts ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSave(data: Omit<SavedPrompt, "id" | "created_at">) {
    if (editing) {
      await fetch("/api/prompts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editing.id, ...data }),
      });
    } else {
      await fetch("/api/prompts", {
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
    if (!window.confirm("Delete this prompt?")) return;
    await fetch(`/api/prompts?id=${id}`, { method: "DELETE" });
    await load();
  }

  async function copyPrompt(prompt: SavedPrompt) {
    await navigator.clipboard.writeText(prompt.content);
    setCopiedId(prompt.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  // All unique tags across all prompts
  const allTags = [...new Set(prompts.flatMap(p => p.tags ?? []))].sort();

  // Filter chain
  const filtered = prompts.filter(p => {
    if (categoryFilter && p.category !== categoryFilter) return false;
    if (tagFilter && !(p.tags ?? []).includes(tagFilter)) return false;
    if (search) {
      const q = search.toLowerCase();
      return p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q);
    }
    return true;
  });

  const counts: Record<string, number> = {};
  for (const cat of CATEGORIES) {
    counts[cat] = prompts.filter(p => p.category === cat).length;
  }

  return (
    <div className="max-w-5xl mx-auto">

      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="text-xs text-muted mb-2">
            <Link href="/" className="hover:text-dark transition-colors">Dashboard</Link>
            {" › "}
            <span className="text-dark">Prompt Library</span>
          </p>
          <h1 className="text-2xl font-serif text-dark mb-1">Prompt Library</h1>
          <p className="text-sm text-muted">Your best Claude prompts — saved, tagged, and ready to copy.</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="bg-primary text-white text-sm font-medium px-4 py-2 hover:bg-primary-hover transition-colors shrink-0"
        >
          + Save prompt
        </button>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col gap-3 mb-6">
        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search prompts…"
          className="w-full border border-border bg-white px-4 py-2.5 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
        />

        {/* Category filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setCategoryFilter(null)}
            className={`px-3 py-1.5 text-xs font-medium border transition-colors ${
              categoryFilter === null ? "bg-primary text-white border-primary" : "bg-white border-border text-dark hover:border-primary/30"
            }`}
          >
            All ({prompts.length})
          </button>
          {CATEGORIES.map(cat => counts[cat] > 0 && (
            <button
              key={cat}
              onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
              className={`px-3 py-1.5 text-xs font-medium border transition-colors ${
                categoryFilter === cat ? "bg-primary text-white border-primary" : "bg-white border-border text-dark hover:border-primary/30"
              }`}
            >
              {CATEGORY_LABELS[cat]} ({counts[cat]})
            </button>
          ))}
        </div>

        {/* Tag filters */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted">Tags:</span>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                className={`px-2.5 py-1 text-xs border transition-colors ${
                  tagFilter === tag ? "bg-dark text-white border-dark" : "bg-white border-border text-muted hover:text-dark hover:border-dark/30"
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results count */}
      {(search || categoryFilter || tagFilter) && (
        <p className="text-xs text-muted mb-4">
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          {search && ` for "${search}"`}
          {categoryFilter && ` in ${CATEGORY_LABELS[categoryFilter]}`}
          {tagFilter && ` tagged #${tagFilter}`}
          {" · "}
          <button
            onClick={() => { setSearch(""); setCategoryFilter(null); setTagFilter(null); }}
            className="text-primary hover:underline"
          >
            Clear filters
          </button>
        </p>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-48 bg-white border border-border animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-border p-16 text-center">
          <p className="text-base font-serif text-dark mb-1">
            {prompts.length === 0 ? "No prompts saved yet" : "No prompts match your filters"}
          </p>
          {prompts.length === 0 && (
            <>
              <p className="text-sm text-muted mb-5">Save your best Claude prompts so you can find and reuse them instantly.</p>
              <button
                onClick={() => { setEditing(null); setShowForm(true); }}
                className="bg-primary text-white text-sm px-5 py-2 hover:bg-primary-hover transition-colors"
              >
                Save your first prompt
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {filtered.map(prompt => (
            <PromptCard
              key={prompt.id}
              prompt={prompt}
              expanded={expandedId === prompt.id}
              copied={copiedId === prompt.id}
              onToggleExpand={() => setExpandedId(expandedId === prompt.id ? null : prompt.id)}
              onCopy={() => copyPrompt(prompt)}
              onEdit={() => { setEditing(prompt); setShowForm(true); }}
              onDelete={() => handleDelete(prompt.id)}
              onTagClick={(tag) => setTagFilter(tag)}
            />
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <PromptForm
          initial={editing}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

// ─── Prompt card ───────────────────────────────────────────────────────────────

function PromptCard({
  prompt,
  expanded,
  copied,
  onToggleExpand,
  onCopy,
  onEdit,
  onDelete,
  onTagClick,
}: {
  prompt: SavedPrompt;
  expanded: boolean;
  copied: boolean;
  onToggleExpand: () => void;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onTagClick: (tag: string) => void;
}) {
  const badge = CATEGORY_BADGE[prompt.category] ?? CATEGORY_BADGE.general;
  const preview = prompt.content.slice(0, 180) + (prompt.content.length > 180 ? "…" : "");

  return (
    <div className="bg-white border border-border p-5 flex flex-col group hover:border-primary/30 transition-colors">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-dark leading-snug mb-1">{prompt.title}</h3>
          <span className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 ${badge}`}>
            {CATEGORY_LABELS[prompt.category] ?? prompt.category}
          </span>
        </div>
        <button
          onClick={onCopy}
          className={`shrink-0 text-xs font-medium px-3 py-1.5 border transition-colors ${
            copied
              ? "bg-primary text-white border-primary"
              : "border-border text-muted hover:border-primary hover:text-primary"
          }`}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      {/* Prompt preview / full */}
      <div className="flex-1 mb-3">
        <p className="text-sm text-dark/80 whitespace-pre-wrap leading-relaxed">
          {expanded ? prompt.content : preview}
        </p>
        {prompt.content.length > 180 && (
          <button
            onClick={onToggleExpand}
            className="text-xs text-primary hover:underline mt-1"
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        )}
      </div>

      {/* Tags */}
      {(prompt.tags ?? []).length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {(prompt.tags ?? []).map(tag => (
            <button
              key={tag}
              onClick={() => onTagClick(tag)}
              className="text-[11px] text-muted hover:text-dark border border-border px-1.5 py-0.5 hover:border-dark/30 transition-colors"
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-border mt-auto">
        <span className="text-xs text-muted">{fmtRelative(prompt.created_at)}</span>
        <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="text-xs text-muted hover:text-dark transition-colors">Edit</button>
          <button onClick={onDelete} className="text-xs text-muted hover:text-accent transition-colors">Delete</button>
        </div>
      </div>
    </div>
  );
}

// ─── Prompt form modal ─────────────────────────────────────────────────────────

function PromptForm({
  initial,
  onSave,
  onClose,
}: {
  initial: SavedPrompt | null;
  onSave: (data: Omit<SavedPrompt, "id" | "created_at">) => Promise<void>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [category, setCategory] = useState(initial?.category ?? "general");
  const [tagsInput, setTagsInput] = useState((initial?.tags ?? []).join(", "));
  const [saving, setSaving] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  function handleBackdrop(e: React.MouseEvent) {
    if (e.target === backdropRef.current) onClose();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim() || saving) return;
    setSaving(true);
    const tags = tagsInput
      .split(",")
      .map(t => t.trim().toLowerCase())
      .filter(Boolean);
    await onSave({ title: title.trim(), content: content.trim(), category, tags });
    setSaving(false);
  }

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdrop}
      className="fixed inset-0 bg-dark/50 flex items-center justify-center z-50 p-4"
    >
      <div className="bg-white border border-border w-full max-w-xl shadow-3 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="font-serif text-dark">{initial ? "Edit prompt" : "Save prompt"}</h2>
          <button onClick={onClose} className="text-muted hover:text-dark transition-colors text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={submit} className="p-6 flex flex-col gap-4 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-dark mb-1.5">Title <span className="text-accent">*</span></label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              autoFocus
              placeholder="Competitive research deep dive"
              className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark mb-1.5">
              Prompt <span className="text-accent">*</span>
            </label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              required
              rows={10}
              placeholder="You are a competitive intelligence researcher. Analyze [competitor] and produce a brief covering: their positioning, top content themes, gaps in their coverage, and 3 specific opportunities for me to differentiate…"
              className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors resize-none font-mono leading-relaxed"
            />
            <p className="text-xs text-muted mt-1">{content.length} characters</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-dark mb-1.5">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-dark mb-1.5">
                Tags <span className="text-muted font-normal text-xs">(comma-separated)</span>
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={e => setTagsInput(e.target.value)}
                placeholder="research, competitive, claude"
                className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || !title.trim() || !content.trim()}
              className="flex-1 bg-primary text-white text-sm font-medium py-2 hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {saving ? "Saving…" : initial ? "Save changes" : "Save prompt"}
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
