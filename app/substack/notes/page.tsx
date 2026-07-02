"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Status = "Draft" | "Ready" | "Posted";

interface Note {
  id: string;
  content: string;
  status: Status;
  tags: string[];
  category: string | null;
  posted_at: string | null;
  created_at: string;
}

interface BankItem {
  id: string;
  content: string;
  tags: string[];
  created_at: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const STATUSES: Status[] = ["Draft", "Ready", "Posted"];

const STATUS_CONFIG: Record<Status, { color: string; bg: string; border: string }> = {
  Draft:  { color: "text-muted",   bg: "bg-light",        border: "border-border" },
  Ready:  { color: "text-primary", bg: "bg-teal-tint",    border: "border-primary/30" },
  Posted: { color: "text-olive",   bg: "bg-olive-tint",   border: "border-olive/30" },
};

const CHAR_LIMIT = 280;

const CATEGORIES = ["Observation", "Hook", "One-liner", "Story", "Question", "Hot Take", "Resource", "Other"];

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function SubstackNotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [bankItems, setBankItems] = useState<BankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<Status | "All">("All");
  const [filterTag, setFilterTag] = useState("");
  const [showBank, setShowBank] = useState(false);

  // Editor state
  const [editorContent, setEditorContent] = useState("");
  const [editorStatus, setEditorStatus] = useState<Status>("Draft");
  const [editorTags, setEditorTags] = useState<string[]>([]);
  const [editorCategory, setEditorCategory] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // New note form
  const [showNewForm, setShowNewForm] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [creating, setCreating] = useState(false);

  // Notes bank form
  const [bankInput, setBankInput] = useState("");
  const [savingBank, setSavingBank] = useState(false);

  const editorRef = useRef<HTMLTextAreaElement>(null);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/substack/notes");
    const d = await r.json();
    setNotes(d.notes ?? []);
    setLoading(false);
  }, []);

  const loadBank = useCallback(async () => {
    const r = await fetch("/api/substack/notes-bank");
    const d = await r.json();
    setBankItems(d.items ?? []);
  }, []);

  useEffect(() => {
    loadNotes();
    loadBank();
  }, [loadNotes, loadBank]);

  function openNote(note: Note) {
    setSelectedId(note.id);
    setEditorContent(note.content);
    setEditorStatus(note.status);
    setEditorTags(note.tags ?? []);
    setEditorCategory(note.category ?? "");
    setTagInput("");
    setSaved(false);
    setTimeout(() => editorRef.current?.focus(), 50);
  }

  function closeEditor() {
    setSelectedId(null);
    setEditorContent("");
    setEditorStatus("Draft");
    setEditorTags([]);
    setEditorCategory("");
    setSaved(false);
  }

  async function saveNote() {
    if (!selectedId || saving) return;
    setSaving(true);
    await fetch(`/api/substack/notes/${selectedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: editorContent,
        status: editorStatus,
        tags: editorTags,
        category: editorCategory || null,
      }),
    });
    setSaving(false);
    setSaved(true);
    setNotes((prev) =>
      prev.map((n) =>
        n.id === selectedId
          ? { ...n, content: editorContent, status: editorStatus, tags: editorTags, category: editorCategory || null }
          : n
      )
    );
  }

  async function markPosted() {
    if (!selectedId) return;
    const postedAt = new Date().toISOString();
    await fetch(`/api/substack/notes/${selectedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Posted", posted_at: postedAt }),
    });
    setEditorStatus("Posted");
    setNotes((prev) =>
      prev.map((n) =>
        n.id === selectedId ? { ...n, status: "Posted", posted_at: postedAt } : n
      )
    );
    setSaved(true);
  }

  async function deleteNote() {
    if (!selectedId || !window.confirm("Delete this note?")) return;
    setDeleting(true);
    await fetch(`/api/substack/notes/${selectedId}`, { method: "DELETE" });
    setNotes((prev) => prev.filter((n) => n.id !== selectedId));
    closeEditor();
    setDeleting(false);
  }

  async function createNote() {
    if (!newContent.trim() || creating) return;
    setCreating(true);
    const r = await fetch("/api/substack/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newContent.trim() }),
    });
    const d = await r.json();
    if (d.success) {
      setNotes((prev) => [d.note, ...prev]);
      setNewContent("");
      setShowNewForm(false);
      openNote(d.note);
    }
    setCreating(false);
  }

  function addTag() {
    const t = tagInput.trim();
    if (t && !editorTags.includes(t)) {
      setEditorTags((prev) => [...prev, t]);
    }
    setTagInput("");
  }

  function removeTag(tag: string) {
    setEditorTags((prev) => prev.filter((t) => t !== tag));
  }

  async function saveToBankAndInsert(content: string) {
    if (!bankInput.trim() && !content) return;
    const text = content || bankInput.trim();
    setSavingBank(true);
    const r = await fetch("/api/substack/notes-bank", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text }),
    });
    const d = await r.json();
    if (d.success) setBankItems((prev) => [d.item, ...prev]);
    setBankInput("");
    setSavingBank(false);
  }

  async function deleteBankItem(id: string) {
    await fetch(`/api/substack/notes-bank/${id}`, { method: "DELETE" });
    setBankItems((prev) => prev.filter((b) => b.id !== id));
  }

  function insertFromBank(content: string) {
    if (selectedId) {
      setEditorContent((prev) => (prev ? `${prev}\n\n${content}` : content));
      setSaved(false);
    }
  }

  // Filtered notes
  const allTags = [...new Set(notes.flatMap((n) => n.tags))].sort();
  const filtered = notes.filter((n) => {
    if (filterStatus !== "All" && n.status !== filterStatus) return false;
    if (filterTag && !n.tags.includes(filterTag)) return false;
    return true;
  });

  const selectedNote = notes.find((n) => n.id === selectedId) ?? null;
  const charCount = editorContent.length;
  const overLimit = charCount > CHAR_LIMIT;

  return (
    <div className="max-w-6xl mx-auto">

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs text-muted mb-2">
            <Link href="/" className="hover:text-dark transition-colors">Dashboard</Link>
            {" › "}
            <Link href="/substack" className="hover:text-dark transition-colors">Substack</Link>
            {" › "}
            <span className="text-dark">Notes Manager</span>
          </p>
          <h1 className="text-2xl font-serif text-dark mb-1">Notes Manager</h1>
          <p className="text-sm text-muted">Create, draft, and track your Substack Notes.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBank(!showBank)}
            className={`text-xs font-medium px-3 py-1.5 border transition-colors ${
              showBank
                ? "border-primary text-primary bg-teal-tint"
                : "border-border text-dark hover:border-primary/40 hover:text-primary"
            }`}
          >
            Notes Bank
          </button>
          <button
            onClick={() => { setShowNewForm(true); closeEditor(); }}
            className="bg-primary text-white text-xs font-medium px-3 py-1.5 hover:bg-primary-hover transition-colors"
          >
            + New Note
          </button>
        </div>
      </div>

      <div className={`grid gap-6 ${showBank ? "grid-cols-[1fr_1fr_280px]" : selectedNote ? "grid-cols-[280px_1fr]" : "grid-cols-1"}`}>

        {/* ── Note List ── */}
        <div className="flex flex-col gap-3">

          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            {(["All", ...STATUSES] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`text-xs font-medium px-3 py-1 border transition-colors ${
                  filterStatus === s
                    ? "bg-primary text-white border-primary"
                    : "border-border text-muted hover:text-dark hover:border-dark/30"
                }`}
              >
                {s}
              </button>
            ))}
            {allTags.length > 0 && (
              <select
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
                className="text-xs border border-border bg-white text-dark px-2 py-1 focus:outline-none focus:border-primary transition-colors"
              >
                <option value="">All tags</option>
                {allTags.map((t) => <option key={t}>{t}</option>)}
              </select>
            )}
          </div>

          {/* New note quick-form */}
          {showNewForm && (
            <div className="bg-white border border-border p-4">
              <textarea
                autoFocus
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) createNote();
                  if (e.key === "Escape") { setShowNewForm(false); setNewContent(""); }
                }}
                placeholder="Write your note… (⌘↵ to save)"
                rows={4}
                className="w-full text-sm text-dark bg-transparent resize-none focus:outline-none placeholder:text-muted"
              />
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                <span className={`text-xs ${newContent.length > CHAR_LIMIT ? "text-accent font-medium" : "text-muted"}`}>
                  {newContent.length}/{CHAR_LIMIT}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowNewForm(false); setNewContent(""); }}
                    className="text-xs text-muted hover:text-dark transition-colors px-2 py-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createNote}
                    disabled={!newContent.trim() || creating}
                    className="bg-primary text-white text-xs font-medium px-3 py-1 hover:bg-primary-hover transition-colors disabled:opacity-50"
                  >
                    {creating ? "Creating…" : "Create Note"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* List */}
          {loading ? (
            <div className="flex flex-col gap-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-white border border-border animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="border border-dashed border-border p-12 text-center">
              <p className="text-sm text-muted mb-1">
                {notes.length === 0 ? "No notes yet." : "No notes match this filter."}
              </p>
              {notes.length === 0 && (
                <button
                  onClick={() => setShowNewForm(true)}
                  className="text-xs text-primary hover:text-primary-hover transition-colors mt-1"
                >
                  Create your first note →
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {filtered.map((note) => {
                const cfg = STATUS_CONFIG[note.status];
                const isSelected = note.id === selectedId;
                return (
                  <button
                    key={note.id}
                    onClick={() => isSelected ? closeEditor() : openNote(note)}
                    className={`text-left w-full border px-4 py-3 transition-colors ${
                      isSelected
                        ? "bg-teal-tint border-primary/30"
                        : "bg-white border-border hover:border-primary/20 hover:bg-light"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 ${cfg.bg} ${cfg.color}`}>
                        {note.status}
                      </span>
                      {note.category && (
                        <span className="text-[10px] text-muted">{note.category}</span>
                      )}
                      <span className="text-[10px] text-muted ml-auto">
                        {new Date(note.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    <p className="text-sm text-dark line-clamp-2 leading-snug">{note.content}</p>
                    {note.tags.length > 0 && (
                      <p className="text-[11px] text-muted mt-1.5">{note.tags.join(" · ")}</p>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <p className="text-xs text-muted text-center pt-1">
            {filtered.length} of {notes.length} note{notes.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* ── Editor ── */}
        {selectedNote && (
          <div className="bg-white border border-border flex flex-col">
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 ${STATUS_CONFIG[editorStatus].bg} ${STATUS_CONFIG[editorStatus].color}`}>
                  {editorStatus}
                </span>
                {saved && <span className="text-xs text-primary">Saved</span>}
              </div>
              <button onClick={closeEditor} className="text-muted hover:text-dark transition-colors text-lg leading-none">×</button>
            </div>

            {/* Content */}
            <div className="flex-1 p-5">
              <textarea
                ref={editorRef}
                value={editorContent}
                onChange={(e) => { setEditorContent(e.target.value); setSaved(false); }}
                placeholder="Write your note…"
                className="w-full h-40 text-sm text-dark bg-transparent resize-none focus:outline-none placeholder:text-muted leading-relaxed"
              />
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                <span className={`text-xs font-mono ${overLimit ? "text-accent font-semibold" : "text-muted"}`}>
                  {charCount}/{CHAR_LIMIT} chars
                </span>
                {overLimit && (
                  <span className="text-xs text-accent">Over Substack limit</span>
                )}
              </div>
            </div>

            {/* Meta */}
            <div className="px-5 pb-4 flex flex-col gap-3 border-t border-border pt-4">

              {/* Status */}
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted mb-1.5">Status</label>
                <div className="flex gap-2">
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      onClick={() => { setEditorStatus(s); setSaved(false); }}
                      className={`text-xs font-medium px-3 py-1 border transition-colors ${
                        editorStatus === s
                          ? `${STATUS_CONFIG[s].bg} ${STATUS_CONFIG[s].color} ${STATUS_CONFIG[s].border}`
                          : "border-border text-muted hover:text-dark"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted mb-1.5">Category</label>
                <select
                  value={editorCategory}
                  onChange={(e) => { setEditorCategory(e.target.value); setSaved(false); }}
                  className="w-full border border-border bg-light px-3 py-1.5 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
                >
                  <option value="">— none —</option>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted mb-1.5">Tags</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {editorTags.map((t) => (
                    <span key={t} className="flex items-center gap-1 text-xs bg-teal-tint text-primary px-2 py-0.5">
                      {t}
                      <button onClick={() => removeTag(t)} className="hover:text-accent transition-colors">×</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); } }}
                    placeholder="Add tag, press Enter"
                    className="flex-1 border border-border bg-light px-3 py-1.5 text-xs text-dark focus:outline-none focus:border-primary transition-colors"
                  />
                  <button
                    onClick={addTag}
                    className="text-xs px-3 py-1.5 border border-border text-muted hover:text-dark transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={saveNote}
                  disabled={saving}
                  className="flex-1 bg-primary text-white text-xs font-medium py-2 hover:bg-primary-hover transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                {editorStatus !== "Posted" && (
                  <button
                    onClick={markPosted}
                    className="flex-1 bg-olive text-white text-xs font-medium py-2 hover:bg-olive/80 transition-colors"
                  >
                    Mark as Posted
                  </button>
                )}
                <button
                  onClick={deleteNote}
                  disabled={deleting}
                  className="px-3 py-2 border border-border text-xs text-muted hover:text-accent hover:border-accent/30 transition-colors"
                >
                  {deleting ? "…" : "Delete"}
                </button>
              </div>

              {selectedNote.posted_at && (
                <p className="text-[11px] text-muted">
                  Posted {new Date(selectedNote.posted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Notes Bank ── */}
        {showBank && (
          <div className="bg-white border border-border flex flex-col">
            <div className="px-4 py-3.5 border-b border-border">
              <h2 className="text-sm font-medium text-dark">Notes Bank</h2>
              <p className="text-xs text-muted mt-0.5">Saved hooks, one-liners, and observations.</p>
            </div>

            {/* Add to bank */}
            <div className="p-4 border-b border-border">
              <textarea
                value={bankInput}
                onChange={(e) => setBankInput(e.target.value)}
                placeholder="Save a hook or one-liner…"
                rows={3}
                className="w-full text-sm text-dark bg-light border border-border px-3 py-2 resize-none focus:outline-none focus:border-primary transition-colors placeholder:text-muted"
              />
              <button
                onClick={() => saveToBankAndInsert("")}
                disabled={!bankInput.trim() || savingBank}
                className="mt-2 w-full bg-primary text-white text-xs font-medium py-1.5 hover:bg-primary-hover transition-colors disabled:opacity-50"
              >
                {savingBank ? "Saving…" : "Save to Bank"}
              </button>
            </div>

            {/* Bank items */}
            <div className="flex-1 overflow-y-auto divide-y divide-border">
              {bankItems.length === 0 ? (
                <p className="text-xs text-muted text-center py-8">No saved items yet.</p>
              ) : (
                bankItems.map((item) => (
                  <div key={item.id} className="px-4 py-3 group hover:bg-light transition-colors">
                    <p className="text-xs text-dark leading-snug mb-2">{item.content}</p>
                    <div className="flex gap-2">
                      {selectedNote && (
                        <button
                          onClick={() => insertFromBank(item.content)}
                          className="text-[10px] font-medium text-primary hover:text-primary-hover transition-colors"
                        >
                          Insert →
                        </button>
                      )}
                      <button
                        onClick={() => deleteBankItem(item.id)}
                        className="text-[10px] text-muted hover:text-accent transition-colors ml-auto opacity-0 group-hover:opacity-100"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
