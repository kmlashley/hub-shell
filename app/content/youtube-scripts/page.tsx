"use client";

import { useState, useEffect, useCallback } from "react";

type Status = "Idea" | "Drafting" | "Ready" | "Recorded";

const STATUSES: Status[] = ["Idea", "Drafting", "Ready", "Recorded"];

const STATUS_CONFIG: Record<Status, { color: string; bg: string }> = {
  Idea:     { color: "text-muted",   bg: "bg-light" },
  Drafting: { color: "text-gold",    bg: "bg-gold-tint" },
  Ready:    { color: "text-primary", bg: "bg-teal-tint" },
  Recorded: { color: "text-purple",  bg: "bg-purple-tint" },
};

interface Script {
  id: string;
  title: string;
  status: Status;
  hook: string | null;
  body: string | null;
  key_points: string[];
  cta: string | null;
  research_run_id: string | null;
  created_at: string;
  updated_at: string;
}

type ScriptListItem = Pick<Script, "id" | "title" | "status" | "hook" | "created_at" | "updated_at">;

interface HookVariation {
  type: string;
  hook: string;
}

export default function YouTubeScriptsPage() {
  const [scripts, setScripts] = useState<ScriptListItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selected, setSelected] = useState<Script | null>(null);
  const [loadingScript, setLoadingScript] = useState(false);

  // Editor state (mirrors selected script fields)
  const [title, setTitle] = useState("");
  const [hook, setHook] = useState("");
  const [body, setBody] = useState("");
  const [keyPoints, setKeyPoints] = useState<string[]>([""]);
  const [cta, setCta] = useState("");
  const [status, setStatus] = useState<Status>("Idea");

  // UI state
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [hooks, setHooks] = useState<HookVariation[]>([]);
  const [generatingHooks, setGeneratingHooks] = useState(false);
  const [hookError, setHookError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch("/api/content/youtube-scripts");
      const data = await res.json();
      if (data.success) setScripts(data.scripts);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  async function openScript(id: string) {
    setLoadingScript(true);
    setHooks([]);
    setHookError(null);
    try {
      const res = await fetch(`/api/content/youtube-scripts/${id}`);
      const data = await res.json();
      if (data.success) {
        const s: Script = data.script;
        setSelected(s);
        setTitle(s.title);
        setHook(s.hook ?? "");
        setBody(s.body ?? "");
        setKeyPoints(s.key_points?.length ? s.key_points : [""]);
        setCta(s.cta ?? "");
        setStatus(s.status);
        setSaved(false);
      }
    } finally {
      setLoadingScript(false);
    }
  }

  async function handleCreate() {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/content/youtube-scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      const data = await res.json();
      if (data.success) {
        setNewTitle("");
        setShowNewForm(false);
        await loadList();
        openScript(data.script.id);
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    try {
      await fetch(`/api/content/youtube-scripts/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          hook: hook || null,
          body: body || null,
          key_points: keyPoints.filter(Boolean),
          cta: cta || null,
          status,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      await loadList();
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(next: Status) {
    if (!selected) return;
    setStatus(next);
    await fetch(`/api/content/youtube-scripts/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    await loadList();
  }

  async function handleDelete() {
    if (!selected || !confirm("Delete this script?")) return;
    setDeleting(true);
    try {
      await fetch(`/api/content/youtube-scripts/${selected.id}`, { method: "DELETE" });
      setSelected(null);
      await loadList();
    } finally {
      setDeleting(false);
    }
  }

  async function handleGenerateHooks() {
    setGeneratingHooks(true);
    setHookError(null);
    setHooks([]);
    try {
      const res = await fetch("/api/content/youtube-scripts/generate-hooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          key_points: keyPoints.filter(Boolean),
          cta,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "Failed");
      setHooks(data.hooks);
    } catch (e) {
      setHookError(e instanceof Error ? e.message : "Failed to generate hooks");
    } finally {
      setGeneratingHooks(false);
    }
  }

  function addKeyPoint() {
    setKeyPoints((prev) => [...prev, ""]);
  }

  function updateKeyPoint(i: number, value: string) {
    setKeyPoints((prev) => prev.map((p, idx) => (idx === i ? value : p)));
  }

  function removeKeyPoint(i: number) {
    setKeyPoints((prev) => prev.filter((_, idx) => idx !== i));
  }

  const nextStatus = selected
    ? STATUSES[STATUSES.indexOf(status) + 1] ?? null
    : null;

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">

      {/* Sidebar — script list */}
      <div className="w-64 shrink-0 border-r border-border flex flex-col bg-white">
        <div className="px-4 py-4 border-b border-border flex items-center justify-between">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-muted">Scripts</p>
          <button
            onClick={() => setShowNewForm((s) => !s)}
            className="text-xs text-primary hover:text-primary-hover transition-colors"
          >
            + New
          </button>
        </div>

        {showNewForm && (
          <div className="px-4 py-3 border-b border-border bg-light">
            <input
              type="text"
              autoFocus
              className="w-full text-sm text-dark placeholder:text-muted bg-white outline-none border border-border px-2 py-1.5 mb-2"
              placeholder="Video title…"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={creating || !newTitle.trim()}
                className="text-xs bg-primary text-white px-3 py-1 hover:bg-primary-hover transition-colors disabled:opacity-40"
              >
                {creating ? "Creating…" : "Create"}
              </button>
              <button
                onClick={() => { setShowNewForm(false); setNewTitle(""); }}
                className="text-xs text-muted hover:text-dark transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {loadingList ? (
            <p className="text-xs text-muted px-4 py-6 text-center">Loading…</p>
          ) : scripts.length === 0 ? (
            <p className="text-xs text-muted px-4 py-6 text-center">No scripts yet. Create your first one.</p>
          ) : (
            <ul>
              {scripts.map((s) => {
                const cfg = STATUS_CONFIG[s.status] ?? STATUS_CONFIG.Idea;
                const isActive = selected?.id === s.id;
                return (
                  <li key={s.id}>
                    <button
                      onClick={() => openScript(s.id)}
                      className={`w-full text-left px-4 py-3 border-b border-border transition-colors ${
                        isActive ? "bg-teal-tint" : "hover:bg-light"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-xs font-medium text-dark leading-snug line-clamp-2">{s.title}</p>
                        <span className={`text-[9px] font-semibold tracking-widest uppercase px-1.5 py-0.5 shrink-0 ${cfg.bg} ${cfg.color}`}>
                          {s.status}
                        </span>
                      </div>
                      {s.hook && (
                        <p className="text-[11px] text-muted leading-snug line-clamp-1">{s.hook}</p>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex overflow-hidden">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-center p-8">
            {loadingScript ? (
              <p className="text-sm text-muted">Loading…</p>
            ) : (
              <div>
                <p className="text-sm text-muted mb-2">Select a script to edit</p>
                <p className="text-xs text-muted">or click + New to create one</p>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Main editor area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Editor toolbar */}
              <div className="border-b border-border px-6 py-3 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-3">
                  {/* Status pipeline */}
                  <div className="flex items-center gap-1">
                    {STATUSES.map((s, i) => {
                      const cfg = STATUS_CONFIG[s];
                      const isActive = status === s;
                      const isPast = STATUSES.indexOf(status) > i;
                      return (
                        <button
                          key={s}
                          onClick={() => handleStatusChange(s)}
                          className={`text-[10px] font-semibold tracking-widest uppercase px-2.5 py-1 transition-colors ${
                            isActive
                              ? `${cfg.bg} ${cfg.color}`
                              : isPast
                              ? "bg-light text-muted/50"
                              : "bg-light text-muted hover:text-dark"
                          }`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                  {nextStatus && (
                    <button
                      onClick={() => handleStatusChange(nextStatus)}
                      className="text-xs text-muted hover:text-dark transition-colors"
                    >
                      → Mark as {nextStatus}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="text-xs text-muted hover:text-accent transition-colors disabled:opacity-40"
                  >
                    {deleting ? "Deleting…" : "Delete"}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="text-xs bg-primary text-white px-4 py-1.5 hover:bg-primary-hover transition-colors disabled:opacity-40"
                  >
                    {saved ? "Saved ✓" : saving ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>

              {/* Title */}
              <div className="px-6 pt-5 pb-3 border-b border-border bg-white shrink-0">
                <input
                  type="text"
                  className="w-full text-xl font-serif text-dark placeholder:text-muted bg-transparent outline-none"
                  placeholder="Video title…"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-6 py-5 bg-white">
                <label className="text-[10px] font-semibold tracking-widest uppercase text-muted block mb-2">
                  Script Body
                </label>
                <textarea
                  className="w-full h-full min-h-[400px] text-sm text-dark placeholder:text-muted bg-transparent outline-none resize-none leading-relaxed"
                  placeholder="Write your script here. Use timestamps to mark sections: [0:00 – Intro], [1:30 – Main point], etc."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
              </div>
            </div>

            {/* Right panel */}
            <div className="w-72 shrink-0 border-l border-border bg-white flex flex-col overflow-y-auto">

              {/* Hook */}
              <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-semibold tracking-widest uppercase text-muted">Hook</p>
                  <button
                    onClick={handleGenerateHooks}
                    disabled={generatingHooks || !title.trim()}
                    className="text-[10px] text-primary hover:text-primary-hover transition-colors disabled:opacity-40"
                  >
                    {generatingHooks ? "Generating…" : "Generate variations"}
                  </button>
                </div>
                <textarea
                  className="w-full text-sm text-dark placeholder:text-muted bg-transparent outline-none border border-border px-2.5 py-2 resize-none focus:border-primary/50 transition-colors"
                  rows={3}
                  placeholder="Your opening hook — the first 30 seconds…"
                  value={hook}
                  onChange={(e) => setHook(e.target.value)}
                />

                {hookError && (
                  <p className="text-xs text-accent mt-1.5">{hookError}</p>
                )}

                {hooks.length > 0 && (
                  <div className="mt-3 flex flex-col gap-2">
                    <p className="text-[10px] font-semibold tracking-widest uppercase text-muted">Variations — click to use</p>
                    {hooks.map((h, i) => (
                      <button
                        key={i}
                        onClick={() => setHook(h.hook)}
                        className="text-left border border-border px-2.5 py-2 hover:border-primary/40 hover:bg-teal-tint transition-colors"
                      >
                        <p className="text-[9px] font-semibold tracking-widest uppercase text-muted mb-1">{h.type}</p>
                        <p className="text-xs text-dark leading-snug">{h.hook}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Key points */}
              <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-semibold tracking-widest uppercase text-muted">Key Points</p>
                  <button
                    onClick={addKeyPoint}
                    className="text-[10px] text-primary hover:text-primary-hover transition-colors"
                  >
                    + Add
                  </button>
                </div>
                <div className="flex flex-col gap-1.5">
                  {keyPoints.map((kp, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted shrink-0 w-4">{i + 1}.</span>
                      <input
                        type="text"
                        className="flex-1 text-xs text-dark placeholder:text-muted bg-transparent outline-none border border-border px-2 py-1.5 focus:border-primary/50 transition-colors min-w-0"
                        placeholder="Key point…"
                        value={kp}
                        onChange={(e) => updateKeyPoint(i, e.target.value)}
                      />
                      {keyPoints.length > 1 && (
                        <button
                          onClick={() => removeKeyPoint(i)}
                          className="text-muted hover:text-accent transition-colors text-xs shrink-0"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div className="p-4">
                <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-2">CTA</p>
                <textarea
                  className="w-full text-sm text-dark placeholder:text-muted bg-transparent outline-none border border-border px-2.5 py-2 resize-none focus:border-primary/50 transition-colors"
                  rows={3}
                  placeholder="What do you want viewers to do at the end?"
                  value={cta}
                  onChange={(e) => setCta(e.target.value)}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
