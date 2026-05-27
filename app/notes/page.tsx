"use client";

import { useEffect, useState } from "react";
import { fmtRelative } from "@/lib/fmt-date";

interface Note {
  id: string;
  title: string | null;
  content: string;
  tags: string[] | null;
  created_at: string;
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch("/api/notes");
    if (res.ok) {
      const data = await res.json();
      setNotes(data.notes ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function save() {
    if (!draft.trim() || saving) return;
    setSaving(true);
    await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: draft }),
    });
    setDraft("");
    await load();
    setSaving(false);
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-serif text-dark mb-1">Notes</h1>
        <p className="text-sm text-muted">Quick capture for ideas, observations, and reminders.</p>
      </div>

      {/* Quick capture */}
      <div className="bg-white border border-border rounded-xl p-4 mb-6">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && e.metaKey && save()}
          placeholder="Capture a thought... (⌘+Enter to save)"
          className="w-full text-sm border-0 outline-none resize-none text-dark placeholder:text-muted"
          rows={3}
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={save}
            disabled={saving || !draft.trim()}
            className="px-4 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* Notes list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-white border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : notes.length === 0 ? (
        <p className="text-sm text-muted text-center py-8">No notes yet.</p>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.id} className="bg-white border border-border rounded-xl p-4">
              {note.title && (
                <p className="font-medium text-dark text-sm mb-1">{note.title}</p>
              )}
              <p className="text-sm text-dark/80 whitespace-pre-wrap">{note.content}</p>
              <p className="text-xs text-muted mt-2">{fmtRelative(note.created_at)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
