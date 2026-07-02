"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Notebook {
  id: string;
  title: string;
  description: string | null;
  external_url: string | null;
  tags: string[];
  last_updated: string | null;
  created_at: string;
}

// ─── Empty form state ───────────────────────────────────────────────────────────

const EMPTY_FORM = { title: "", description: "", external_url: "", tags: "" };

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function NotebooksPage() {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTag, setFilterTag] = useState("");

  // Add form
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_FORM);
  const [adding, setAdding] = useState(false);

  // Edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/notebooks");
    const d = await r.json();
    setNotebooks(d.notebooks ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function parseTags(raw: string): string[] {
    return raw.split(",").map((t) => t.trim()).filter(Boolean);
  }

  // ── Add ─────────────────────────────────────────────────────────────────────

  async function addNotebook() {
    if (!addForm.title.trim() || adding) return;
    setAdding(true);
    const r = await fetch("/api/notebooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: addForm.title,
        description: addForm.description || null,
        external_url: addForm.external_url || null,
        tags: parseTags(addForm.tags),
      }),
    });
    const d = await r.json();
    if (d.notebook) {
      setNotebooks((prev) => [d.notebook, ...prev]);
      setAddForm(EMPTY_FORM);
      setShowAddForm(false);
    }
    setAdding(false);
  }

  // ── Edit ────────────────────────────────────────────────────────────────────

  function startEdit(nb: Notebook) {
    setEditingId(nb.id);
    setEditForm({
      title: nb.title,
      description: nb.description ?? "",
      external_url: nb.external_url ?? "",
      tags: (nb.tags ?? []).join(", "),
    });
  }

  async function saveEdit(id: string) {
    if (!editForm.title.trim() || saving) return;
    setSaving(true);
    const r = await fetch(`/api/notebooks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editForm.title,
        description: editForm.description || null,
        external_url: editForm.external_url || null,
        tags: parseTags(editForm.tags),
        last_updated: new Date().toISOString(),
      }),
    });
    const d = await r.json();
    if (d.notebook) {
      setNotebooks((prev) => prev.map((nb) => nb.id === id ? d.notebook : nb));
    }
    setEditingId(null);
    setSaving(false);
  }

  async function deleteNotebook(id: string) {
    if (!window.confirm("Delete this notebook?")) return;
    await fetch(`/api/notebooks/${id}`, { method: "DELETE" });
    setNotebooks((prev) => prev.filter((nb) => nb.id !== id));
    if (editingId === id) setEditingId(null);
  }

  // ── Derived ─────────────────────────────────────────────────────────────────

  const allTags = [...new Set(notebooks.flatMap((nb) => nb.tags ?? []))].sort();
  const filtered = filterTag
    ? notebooks.filter((nb) => (nb.tags ?? []).includes(filterTag))
    : notebooks;

  return (
    <div className="max-w-5xl mx-auto">

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs text-muted mb-2">
            <Link href="/" className="hover:text-dark transition-colors">Dashboard</Link>
            {" › "}
            <span className="text-dark">Notebooks</span>
          </p>
          <h1 className="text-2xl font-serif text-dark mb-1">Notebooks</h1>
          <p className="text-sm text-muted">Track your NotebookLM notebooks and research references in one place.</p>
        </div>
        <button
          onClick={() => { setShowAddForm(!showAddForm); setEditingId(null); }}
          className="bg-primary text-white text-xs font-medium px-3 py-1.5 hover:bg-primary-hover transition-colors"
        >
          + Add Notebook
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="bg-white border border-border p-5 mb-6">
          <h2 className="text-sm font-medium text-dark mb-4">Add Notebook</h2>
          <NotebookForm
            form={addForm}
            onChange={setAddForm}
            onSubmit={addNotebook}
            onCancel={() => { setShowAddForm(false); setAddForm(EMPTY_FORM); }}
            busy={adding}
            submitLabel="Add Notebook"
          />
        </div>
      )}

      {/* Tag filter */}
      {allTags.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-5">
          <button
            onClick={() => setFilterTag("")}
            className={`text-xs font-medium px-3 py-1 border transition-colors ${
              filterTag === ""
                ? "bg-primary text-white border-primary"
                : "border-border text-muted hover:text-dark hover:border-dark/30"
            }`}
          >
            All
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setFilterTag(tag === filterTag ? "" : tag)}
              className={`text-xs font-medium px-3 py-1 border transition-colors ${
                filterTag === tag
                  ? "bg-primary text-white border-primary"
                  : "border-border text-muted hover:text-dark hover:border-dark/30"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Notebook grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-44 bg-white border border-border animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted mb-1">
            {notebooks.length === 0 ? "No notebooks yet." : "No notebooks match this filter."}
          </p>
          {notebooks.length === 0 && (
            <button
              onClick={() => setShowAddForm(true)}
              className="text-xs text-primary hover:text-primary-hover transition-colors mt-1"
            >
              Add your first notebook →
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((nb) => (
            <div key={nb.id} className="bg-white border border-border flex flex-col">
              {editingId === nb.id ? (
                <div className="p-4 flex-1">
                  <NotebookForm
                    form={editForm}
                    onChange={setEditForm}
                    onSubmit={() => saveEdit(nb.id)}
                    onCancel={() => setEditingId(null)}
                    busy={saving}
                    submitLabel="Save"
                  />
                </div>
              ) : (
                <>
                  <div className="p-4 flex-1">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-sm font-medium text-dark leading-snug">{nb.title}</h3>
                      {nb.last_updated && (
                        <span className="text-[10px] text-muted shrink-0">
                          {new Date(nb.last_updated).toLocaleDateString("en-US", {
                            month: "short", day: "numeric",
                          })}
                        </span>
                      )}
                    </div>
                    {nb.description && (
                      <p className="text-xs text-muted leading-relaxed mb-3">{nb.description}</p>
                    )}
                    {(nb.tags ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {(nb.tags ?? []).map((tag) => (
                          <span key={tag} className="text-[10px] bg-teal-tint text-primary px-2 py-0.5">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="px-4 pb-4 border-t border-border pt-3 flex items-center gap-2">
                    {nb.external_url ? (
                      <a
                        href={nb.external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-primary text-white text-xs font-medium px-3 py-1.5 hover:bg-primary-hover transition-colors"
                      >
                        Open ↗
                      </a>
                    ) : (
                      <span className="text-xs text-muted italic">No URL set</span>
                    )}
                    <button
                      onClick={() => startEdit(nb)}
                      className="text-xs text-muted hover:text-dark transition-colors px-2 py-1.5 border border-transparent hover:border-border"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteNotebook(nb.id)}
                      className="text-xs text-muted hover:text-accent transition-colors px-2 py-1.5 ml-auto"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted text-center mt-6">
        {filtered.length} of {notebooks.length} notebook{notebooks.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

// ─── Shared form component ──────────────────────────────────────────────────────

type FormState = { title: string; description: string; external_url: string; tags: string };

function NotebookForm({
  form,
  onChange,
  onSubmit,
  onCancel,
  busy,
  submitLabel,
}: {
  form: FormState;
  onChange: (f: FormState) => void;
  onSubmit: () => void;
  onCancel: () => void;
  busy: boolean;
  submitLabel: string;
}) {
  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    onChange({ ...form, [key]: e.target.value });

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted mb-1.5">Title *</label>
        <input
          autoFocus
          value={form.title}
          onChange={set("title")}
          placeholder="e.g. Content Strategy Research"
          className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors placeholder:text-muted"
        />
      </div>
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted mb-1.5">Description</label>
        <textarea
          value={form.description}
          onChange={set("description")}
          placeholder="What's in this notebook? When would you use it?"
          rows={2}
          className="w-full border border-border bg-light px-3 py-2 text-sm text-dark resize-none focus:outline-none focus:border-primary transition-colors placeholder:text-muted"
        />
      </div>
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted mb-1.5">NotebookLM URL</label>
        <input
          value={form.external_url}
          onChange={set("external_url")}
          placeholder="https://notebooklm.google.com/notebook/..."
          className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors placeholder:text-muted"
        />
      </div>
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted mb-1.5">Tags (comma-separated)</label>
        <input
          value={form.tags}
          onChange={set("tags")}
          placeholder="e.g. content, research, competitor"
          className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors placeholder:text-muted"
        />
      </div>
      <div className="flex gap-2 justify-end pt-1">
        <button
          onClick={onCancel}
          className="text-xs text-muted hover:text-dark transition-colors px-3 py-1.5"
        >
          Cancel
        </button>
        <button
          onClick={onSubmit}
          disabled={!form.title.trim() || busy}
          className="bg-primary text-white text-xs font-medium px-4 py-1.5 hover:bg-primary-hover transition-colors disabled:opacity-50"
        >
          {busy ? "Saving…" : submitLabel}
        </button>
      </div>
    </div>
  );
}
