"use client";

import { useState, useEffect, useCallback } from "react";

const PLATFORMS = ["Newsletter", "YouTube", "Blog", "LinkedIn", "Twitter / X", "Podcast", "Instagram", "Other"];

interface PublishedItem {
  id: string;
  title: string;
  platform: string | null;
  url: string;
  excerpt: string | null;
  published_at: string | null;
  performance_notes: string | null;
  source_type: string | null;
  created_at: string;
}

type FormMode = "manual" | "import";

function SectionHeader({ label }: { label: string }) {
  return (
    <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-3">
      {label}
    </p>
  );
}

function PlatformBadge({ platform }: { platform: string | null }) {
  if (!platform) return <span className="text-muted text-xs">—</span>;
  return (
    <span className="text-[10px] font-semibold tracking-widest uppercase px-2 py-0.5 bg-light text-muted">
      {platform}
    </span>
  );
}

export default function PublishedContentPage() {
  const [items, setItems] = useState<PublishedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPlatform, setFilterPlatform] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("import");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
  const [importUrl, setImportUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState("");
  const [url, setUrl] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [publishedAt, setPublishedAt] = useState("");
  const [performanceNotes, setPerformanceNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/content/published");
      const data = await res.json();
      if (data.success) setItems(data.items);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadItems(); }, [loadItems]);

  function resetForm() {
    setTitle(""); setPlatform(""); setUrl(""); setExcerpt("");
    setPublishedAt(""); setPerformanceNotes(""); setImportUrl("");
    setScrapeError(null); setEditingId(null);
  }

  function openEdit(item: PublishedItem) {
    setEditingId(item.id);
    setTitle(item.title);
    setPlatform(item.platform ?? "");
    setUrl(item.url);
    setExcerpt(item.excerpt ?? "");
    setPublishedAt(item.published_at ?? "");
    setPerformanceNotes(item.performance_notes ?? "");
    setFormMode("manual");
    setShowForm(true);
  }

  async function handleScrape() {
    if (!importUrl.trim()) return;
    setScraping(true);
    setScrapeError(null);
    try {
      const res = await fetch("/api/content/published", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scrape: true, url: importUrl }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "Scrape failed");
      setTitle(data.scraped.title);
      setExcerpt(data.scraped.excerpt);
      setUrl(importUrl);
      setFormMode("manual");
    } catch (e) {
      setScrapeError(e instanceof Error ? e.message : "Failed to scrape URL");
    } finally {
      setScraping(false);
    }
  }

  async function handleSave() {
    if (!title.trim() || !url.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await fetch(`/api/content/published/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title, platform: platform || null, url,
            excerpt: excerpt || null,
            published_at: publishedAt || null,
            performance_notes: performanceNotes || null,
          }),
        });
      } else {
        await fetch("/api/content/published", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title, platform: platform || null, url,
            excerpt: excerpt || null,
            published_at: publishedAt || null,
            performance_notes: performanceNotes || null,
          }),
        });
      }
      resetForm();
      setShowForm(false);
      await loadItems();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this entry?")) return;
    await fetch(`/api/content/published/${id}`, { method: "DELETE" });
    await loadItems();
  }

  const filtered = filterPlatform === "All"
    ? items
    : items.filter((i) => i.platform === filterPlatform);

  const platforms = ["All", ...Array.from(new Set(items.map((i) => i.platform).filter(Boolean) as string[]))];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-serif text-dark mb-1">Published Content</h1>
          <p className="text-sm text-muted">
            Track everything you&apos;ve published in one place. Your Internal Linker pulls from this library.
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setFormMode("import"); setShowForm((s) => !s); }}
          className="bg-primary text-white text-sm px-4 py-2 hover:bg-primary-hover transition-colors shrink-0"
        >
          + Add content
        </button>
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <div className="bg-white border border-border p-5 mb-5">
          {!editingId && (
            <>
              <div className="flex gap-0 border border-border mb-5 w-fit">
                {(["import", "manual"] as FormMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setFormMode(m)}
                    className={`px-4 py-1.5 text-sm transition-colors ${
                      formMode === m ? "bg-primary text-white" : "text-muted hover:text-dark hover:bg-light"
                    }`}
                  >
                    {m === "import" ? "Import from URL" : "Add manually"}
                  </button>
                ))}
              </div>

              {formMode === "import" && (
                <div className="flex flex-col gap-3 mb-5">
                  <SectionHeader label="Paste a URL to auto-fill title and excerpt" />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 text-sm text-dark placeholder:text-muted bg-transparent outline-none border border-border px-3 py-2 focus:border-primary/50 transition-colors"
                      placeholder="https://yourpost.substack.com/p/..."
                      value={importUrl}
                      onChange={(e) => setImportUrl(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleScrape()}
                    />
                    <button
                      onClick={handleScrape}
                      disabled={scraping || !importUrl.trim()}
                      className="bg-primary text-white text-sm px-4 py-2 hover:bg-primary-hover transition-colors disabled:opacity-40"
                    >
                      {scraping ? "Fetching…" : "Fetch details"}
                    </button>
                  </div>
                  {scrapeError && (
                    <p className="text-xs text-accent">{scrapeError}</p>
                  )}
                </div>
              )}
            </>
          )}

          {/* Form fields — shown after scrape or in manual mode */}
          {(formMode === "manual" || editingId) && (
            <div className="flex flex-col gap-4">
              <SectionHeader label={editingId ? "Edit entry" : "Entry details"} />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-semibold tracking-widest uppercase text-muted block mb-1.5">Title</label>
                  <input
                    type="text"
                    className="w-full text-sm text-dark placeholder:text-muted bg-transparent outline-none border border-border px-3 py-2 focus:border-primary/50 transition-colors"
                    placeholder="Post title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold tracking-widest uppercase text-muted block mb-1.5">Platform</label>
                  <select
                    className="w-full text-sm text-dark bg-transparent outline-none border border-border px-3 py-2 focus:border-primary/50 transition-colors"
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                  >
                    <option value="">Select platform…</option>
                    {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-semibold tracking-widest uppercase text-muted block mb-1.5">URL</label>
                  <input
                    type="text"
                    className="w-full text-sm text-dark placeholder:text-muted bg-transparent outline-none border border-border px-3 py-2 focus:border-primary/50 transition-colors"
                    placeholder="https://…"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold tracking-widest uppercase text-muted block mb-1.5">Published Date</label>
                  <input
                    type="date"
                    className="w-full text-sm text-dark bg-transparent outline-none border border-border px-3 py-2 focus:border-primary/50 transition-colors"
                    value={publishedAt}
                    onChange={(e) => setPublishedAt(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold tracking-widest uppercase text-muted block mb-1.5">Excerpt <span className="normal-case font-normal tracking-normal">(used by Internal Linker)</span></label>
                <textarea
                  className="w-full text-sm text-dark placeholder:text-muted bg-transparent outline-none border border-border px-3 py-2 focus:border-primary/50 transition-colors resize-none"
                  rows={2}
                  placeholder="Brief description or excerpt from the piece…"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold tracking-widest uppercase text-muted block mb-1.5">Performance Notes <span className="normal-case font-normal tracking-normal">(optional)</span></label>
                <input
                  type="text"
                  className="w-full text-sm text-dark placeholder:text-muted bg-transparent outline-none border border-border px-3 py-2 focus:border-primary/50 transition-colors"
                  placeholder="e.g. 48% open rate, 3.2k views, best performer this month"
                  value={performanceNotes}
                  onChange={(e) => setPerformanceNotes(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  onClick={() => { resetForm(); setShowForm(false); }}
                  className="text-sm text-muted hover:text-dark transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !title.trim() || !url.trim()}
                  className="bg-primary text-white text-sm px-5 py-2 hover:bg-primary-hover transition-colors disabled:opacity-40"
                >
                  {saving ? "Saving…" : editingId ? "Save changes" : "Add to library"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Platform filter */}
      {items.length > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {platforms.map((p) => (
            <button
              key={p}
              onClick={() => setFilterPlatform(p)}
              className={`text-xs px-3 py-1.5 border transition-colors ${
                filterPlatform === p
                  ? "bg-primary text-white border-primary"
                  : "border-border text-muted hover:text-dark hover:border-dark/20"
              }`}
            >
              {p}
              {p !== "All" && (
                <span className="ml-1.5 opacity-60">
                  {items.filter((i) => i.platform === p).length}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="bg-white border border-border p-8 text-center">
          <p className="text-sm text-muted">Loading…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-border p-10 text-center">
          <p className="text-sm text-muted mb-1">
            {items.length === 0 ? "No published content yet." : "No content for this filter."}
          </p>
          {items.length === 0 && (
            <p className="text-xs text-muted">
              Add your first piece — the Internal Linker will use this library to suggest links in your drafts.
            </p>
          )}
        </div>
      ) : (
        <div className="bg-white border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-light">
                <th className="text-left text-[10px] font-semibold tracking-widest uppercase text-muted px-4 py-3">Title</th>
                <th className="text-left text-[10px] font-semibold tracking-widest uppercase text-muted px-4 py-3 w-32">Platform</th>
                <th className="text-left text-[10px] font-semibold tracking-widest uppercase text-muted px-4 py-3 w-32">Published</th>
                <th className="text-left text-[10px] font-semibold tracking-widest uppercase text-muted px-4 py-3">Performance</th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, i) => (
                <tr
                  key={item.id}
                  className={`border-b border-border last:border-0 ${i % 2 === 0 ? "" : "bg-light/40"}`}
                >
                  <td className="px-4 py-3">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-dark hover:text-primary transition-colors"
                    >
                      {item.title}
                    </a>
                    {item.excerpt && (
                      <p className="text-xs text-muted mt-0.5 line-clamp-1">{item.excerpt}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <PlatformBadge platform={item.platform} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-muted">
                      {item.published_at
                        ? new Date(item.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-muted">{item.performance_notes ?? "—"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 justify-end">
                      <button
                        onClick={() => openEdit(item)}
                        className="text-xs text-muted hover:text-dark transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-xs text-muted hover:text-accent transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2.5 border-t border-border bg-light">
            <p className="text-xs text-muted">{filtered.length} {filtered.length === 1 ? "entry" : "entries"}{filterPlatform !== "All" ? ` · ${filterPlatform}` : ""} · {items.length} total</p>
          </div>
        </div>
      )}
    </div>
  );
}
