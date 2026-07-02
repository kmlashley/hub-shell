"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddContentForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("published");
  const [primaryKeyword, setPrimaryKeyword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setTitle(""); setContent(""); setPrimaryKeyword(""); setStatus("published"); setError(null);
  }

  async function handleSave() {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/content/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, status, primary_keyword: primaryKeyword || undefined }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "Failed to save");
      reset();
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-sm border border-border px-4 py-2 text-muted hover:text-dark hover:border-border-2 transition-colors"
      >
        + Add existing content
      </button>

      {open && (
        <div className="absolute right-4 mt-2 w-[480px] bg-white border border-border shadow-lg p-5 z-10">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-3">
            Seed a piece you already wrote
          </p>
          <div className="flex flex-col gap-3">
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
              <label className="text-[10px] font-semibold tracking-widest uppercase text-muted block mb-1.5">Content</label>
              <textarea
                className="w-full text-sm text-dark placeholder:text-muted bg-transparent outline-none border border-border px-3 py-2 focus:border-primary/50 transition-colors resize-none"
                rows={8}
                placeholder="Paste the full text of the piece…"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-semibold tracking-widest uppercase text-muted block mb-1.5">Primary keyword (optional)</label>
                <input
                  type="text"
                  className="w-full text-sm text-dark placeholder:text-muted bg-transparent outline-none border border-border px-3 py-2 focus:border-primary/50 transition-colors"
                  value={primaryKeyword}
                  onChange={(e) => setPrimaryKeyword(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold tracking-widest uppercase text-muted block mb-1.5">Status</label>
                <select
                  className="w-full text-sm text-dark bg-transparent outline-none border border-border px-3 py-2 focus:border-primary/50 transition-colors"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "draft" | "published")}
                >
                  <option value="published">Already published</option>
                  <option value="draft">Unfinished draft</option>
                </select>
              </div>
            </div>
            {error && <p className="text-xs text-accent">{error}</p>}
            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                onClick={() => { reset(); setOpen(false); }}
                className="text-sm text-muted hover:text-dark transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !title.trim() || !content.trim()}
                className="bg-primary text-white text-sm px-5 py-2 hover:bg-primary-hover transition-colors disabled:opacity-40"
              >
                {saving ? "Saving…" : "Add to pipeline"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
