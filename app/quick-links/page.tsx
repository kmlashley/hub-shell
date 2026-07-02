"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface QuickLink {
  id: string;
  title: string;
  url: string;
  icon: string | null;
  category: string | null;
  sort_order: number;
  created_at: string;
}

type FormData = Pick<QuickLink, "title" | "url" | "icon" | "category" | "sort_order">;

// ─── Helpers ───────────────────────────────────────────────────────────────────

const CATEGORY_COLORS = [
  "bg-teal-tint text-primary",
  "bg-rust-tint text-accent",
  "bg-purple-tint text-purple",
  "bg-olive-tint text-olive",
  "bg-gold-tint text-gold",
  "bg-border text-muted",
];

function getCategoryColor(category: string, allCategories: string[]): string {
  const idx = allCategories.indexOf(category);
  return CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
}

function displayUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function QuickLinksPage() {
  const [links, setLinks] = useState<QuickLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<QuickLink | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/quick-links");
    if (res.ok) {
      const data = await res.json();
      setLinks(data.links ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openAdd() {
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(link: QuickLink) {
    setEditing(link);
    setShowForm(true);
  }

  async function deleteLink(id: string) {
    if (!window.confirm("Delete this link?")) return;
    await fetch(`/api/quick-links?id=${id}`, { method: "DELETE" });
    await load();
  }

  async function handleSave(data: FormData) {
    if (editing) {
      await fetch("/api/quick-links", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editing.id, ...data }),
      });
    } else {
      await fetch("/api/quick-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    }
    setShowForm(false);
    await load();
  }

  const sortedCategories = [
    ...new Set(
      links
        .map((l) => l.category)
        .filter((c): c is string => !!c)
        .sort()
    ),
  ];

  const filtered = activeCategory
    ? links.filter((l) => l.category === activeCategory)
    : links;

  return (
    <div className="max-w-5xl mx-auto">

      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="text-xs text-muted mb-2">
            <Link href="/" className="hover:text-dark transition-colors">Dashboard</Link>
            {" › "}
            <span className="text-dark">Quick Links</span>
          </p>
          <h1 className="text-2xl font-serif text-dark mb-1">Quick Links</h1>
          <p className="text-sm text-muted">
            Your most-used URLs, tools, and dashboards in one place.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="bg-primary text-white text-sm font-medium px-4 py-2 hover:bg-primary-hover transition-colors shrink-0"
        >
          + Add link
        </button>
      </div>

      {/* Category filters */}
      {sortedCategories.length > 0 && (
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-3 py-1.5 text-xs font-medium border transition-colors ${
              activeCategory === null
                ? "bg-primary text-white border-primary"
                : "bg-white border-border text-dark hover:border-primary/30"
            }`}
          >
            All ({links.length})
          </button>
          {sortedCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={`px-3 py-1.5 text-xs font-medium border transition-colors ${
                activeCategory === cat
                  ? "bg-primary text-white border-primary"
                  : "bg-white border-border text-dark hover:border-primary/30"
              }`}
            >
              {cat} ({links.filter((l) => l.category === cat).length})
            </button>
          ))}
        </div>
      )}

      {/* Link grid */}
      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-36 bg-white border border-border animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-border p-16 text-center">
          <p className="text-base font-serif text-dark mb-1">No links yet</p>
          <p className="text-sm text-muted mb-5">
            Add your most-used tools, dashboards, and docs.
          </p>
          <button
            onClick={openAdd}
            className="bg-primary text-white text-sm px-5 py-2 hover:bg-primary-hover transition-colors"
          >
            Add your first link
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map((link) => (
            <LinkCard
              key={link.id}
              link={link}
              categories={sortedCategories}
              onEdit={() => openEdit(link)}
              onDelete={() => deleteLink(link.id)}
            />
          ))}
        </div>
      )}

      {/* Add / Edit modal */}
      {showForm && (
        <LinkForm
          initial={editing}
          categories={sortedCategories}
          onSave={handleSave}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

// ─── Link card ─────────────────────────────────────────────────────────────────

function LinkCard({
  link,
  categories,
  onEdit,
  onDelete,
}: {
  link: QuickLink;
  categories: string[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const colorClass = link.category
    ? getCategoryColor(link.category, categories)
    : "bg-border text-muted";

  const hasEmoji = link.icon && link.icon.trim().length > 0;
  const iconDisplay = hasEmoji ? link.icon! : link.title.charAt(0).toUpperCase();

  return (
    <div className="bg-white border border-border p-5 group flex flex-col hover:border-primary/30 transition-colors">

      {/* Icon + category */}
      <div className="flex items-start justify-between mb-3">
        <div
          className={`w-9 h-9 flex items-center justify-center text-xl shrink-0 ${
            hasEmoji ? "" : "bg-teal-tint text-primary font-bold text-sm"
          }`}
        >
          {iconDisplay}
        </div>
        {link.category && (
          <span
            className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 ${colorClass}`}
          >
            {link.category}
          </span>
        )}
      </div>

      {/* Title + hostname */}
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 group/link block"
      >
        <p className="text-sm font-medium text-dark mb-1 group-hover/link:text-primary transition-colors leading-snug">
          {link.title}
        </p>
        <p className="text-xs text-muted truncate">{displayUrl(link.url)}</p>
      </a>

      {/* Actions row */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
        <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="text-xs text-muted hover:text-dark transition-colors"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="text-xs text-muted hover:text-accent transition-colors"
          >
            Delete
          </button>
        </div>
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline ml-auto"
        >
          Open →
        </a>
      </div>
    </div>
  );
}

// ─── Add / Edit form modal ──────────────────────────────────────────────────────

function LinkForm({
  initial,
  categories,
  onSave,
  onClose,
}: {
  initial: QuickLink | null;
  categories: string[];
  onSave: (data: FormData) => Promise<void>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [saving, setSaving] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === backdropRef.current) onClose();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !url.trim() || saving) return;
    setSaving(true);
    await onSave({
      title: title.trim(),
      url: url.trim(),
      icon: icon.trim() || null,
      category: category.trim() || null,
      sort_order: initial?.sort_order ?? 0,
    });
    setSaving(false);
  }

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-dark/50 flex items-center justify-center z-50 p-4"
    >
      <div className="bg-white border border-border w-full max-w-md shadow-3">

        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-serif text-dark">
            {initial ? "Edit link" : "Add link"}
          </h2>
          <button
            onClick={onClose}
            className="text-muted hover:text-dark transition-colors text-2xl leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="p-6 flex flex-col gap-4">

          <div>
            <label className="block text-sm font-medium text-dark mb-1.5">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
              placeholder="Notion workspace"
              className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark mb-1.5">URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              placeholder="https://notion.so/..."
              className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark mb-1">
              Icon{" "}
              <span className="text-muted font-normal text-xs">(optional)</span>
            </label>
            <p className="text-xs text-muted mb-1.5">
              Paste an emoji or leave blank to use the first letter.
            </p>
            <input
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="📋"
              maxLength={4}
              className="w-24 border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark mb-1.5">
              Category{" "}
              <span className="text-muted font-normal text-xs">(optional)</span>
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              list="ql-categories"
              placeholder="Tools, Docs, Dashboards…"
              className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
            />
            <datalist id="ql-categories">
              {categories.map((cat) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || !title.trim() || !url.trim()}
              className="flex-1 bg-primary text-white text-sm font-medium py-2 hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {saving ? "Saving…" : initial ? "Save changes" : "Add link"}
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
