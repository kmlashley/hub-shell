"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Status = "Idea" | "Drafting" | "Ready" | "Recorded";

interface Script {
  id: string;
  title: string;
  status: Status;
  hook: string | null;
  body: string | null;
  key_points: string[];
  cta: string | null;
  created_at: string;
  updated_at: string;
}

interface HookVariation {
  type: string;
  hook: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const STATUSES: Status[] = ["Idea", "Drafting", "Ready", "Recorded"];

const STATUS_CONFIG: Record<Status, { color: string; bg: string }> = {
  Idea:     { color: "text-muted",   bg: "bg-light" },
  Drafting: { color: "text-gold",    bg: "bg-gold-tint" },
  Ready:    { color: "text-primary", bg: "bg-teal-tint" },
  Recorded: { color: "text-purple",  bg: "bg-purple-tint" },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function wc(text: string) {
  const words = wordCount(text);
  const chars = text.length;
  return `${words}w · ${chars}c`;
}

function exportTeleprompter(script: Script, contextText: string): void {
  const divider = "─".repeat(40);
  const lines = [
    `TITLE: ${script.title.toUpperCase()}`,
    "",
    divider,
    "HOOK",
    divider,
    script.hook ?? "(no hook yet)",
    "",
    divider,
    "CONTEXT",
    divider,
    contextText || "(no context yet)",
    "",
    divider,
    "MAIN CONTENT",
    divider,
    script.body ?? "(no content yet)",
    "",
    divider,
    "CTA",
    divider,
    script.cta ?? "(no CTA yet)",
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${script.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_script.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function YouTubeScriptingPage() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<Status | "All">("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Editor state
  const [title, setTitle]       = useState("");
  const [status, setStatus]     = useState<Status>("Idea");
  const [hook, setHook]         = useState("");
  const [context, setContext]   = useState("");
  const [body, setBody]         = useState("");
  const [cta, setCta]           = useState("");
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Hook generator
  const [hookVariations, setHookVariations]       = useState<HookVariation[]>([]);
  const [generatingHooks, setGeneratingHooks]     = useState(false);
  const [showHookPanel, setShowHookPanel]         = useState(false);

  // New script form
  const [showNewForm, setShowNewForm]   = useState(false);
  const [newTitle, setNewTitle]         = useState("");
  const [creating, setCreating]         = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/content/youtube-scripts");
    const d = await r.json();
    setScripts(d.scripts ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  function openScript(s: Script) {
    setSelectedId(s.id);
    setTitle(s.title);
    setStatus(s.status);
    setHook(s.hook ?? "");
    setContext(Array.isArray(s.key_points) ? s.key_points.join("\n") : "");
    setBody(s.body ?? "");
    setCta(s.cta ?? "");
    setSaved(false);
    setHookVariations([]);
    setShowHookPanel(false);
    setTimeout(() => titleRef.current?.focus(), 50);
  }

  function closeEditor() {
    setSelectedId(null);
    setHookVariations([]);
    setShowHookPanel(false);
    setSaved(false);
  }

  async function saveScript() {
    if (!selectedId || saving) return;
    setSaving(true);
    await fetch(`/api/content/youtube-scripts/${selectedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim() || "Untitled",
        status,
        hook: hook || null,
        key_points: context.split("\n").map((l) => l.trim()).filter(Boolean),
        body: body || null,
        cta: cta || null,
      }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setScripts((prev) =>
      prev.map((s) =>
        s.id === selectedId ? { ...s, title: title.trim() || "Untitled", status } : s
      )
    );
    setSaving(false);
  }

  async function deleteScript() {
    if (!selectedId || !window.confirm("Delete this script?")) return;
    setDeleting(true);
    await fetch(`/api/content/youtube-scripts/${selectedId}`, { method: "DELETE" });
    setScripts((prev) => prev.filter((s) => s.id !== selectedId));
    closeEditor();
    setDeleting(false);
  }

  async function createScript() {
    if (!newTitle.trim() || creating) return;
    setCreating(true);
    const r = await fetch("/api/content/youtube-scripts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle.trim() }),
    });
    const d = await r.json();
    if (d.success) {
      await loadList();
      openScript(d.script);
      setNewTitle("");
      setShowNewForm(false);
    }
    setCreating(false);
  }

  async function generateHooks() {
    if (generatingHooks) return;
    setGeneratingHooks(true);
    setShowHookPanel(true);
    setHookVariations([]);
    const r = await fetch("/api/content/youtube-scripts/generate-hooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        key_points: context.split("\n").filter(Boolean),
        cta,
      }),
    });
    const d = await r.json();
    if (d.success) setHookVariations(d.hooks ?? []);
    setGeneratingHooks(false);
  }

  function applyHook(hookText: string) {
    setHook(hookText);
    setSaved(false);
    setShowHookPanel(false);
  }

  const selectedScript = scripts.find((s) => s.id === selectedId) ?? null;
  const filtered = filterStatus === "All" ? scripts : scripts.filter((s) => s.status === filterStatus);

  return (
    <div className="max-w-7xl mx-auto">

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs text-muted mb-2">
            <Link href="/" className="hover:text-dark transition-colors">Dashboard</Link>
            {" › "}
            <Link href="/youtube" className="hover:text-dark transition-colors">YouTube</Link>
            {" › "}
            <span className="text-dark">Scripting</span>
          </p>
          <h1 className="text-2xl font-serif text-dark mb-1">YouTube Scripting</h1>
          <p className="text-sm text-muted">Write and manage scripts with structured sections.</p>
        </div>
        <button
          onClick={() => { setShowNewForm(true); closeEditor(); }}
          className="bg-primary text-white text-xs font-medium px-3 py-1.5 hover:bg-primary-hover transition-colors"
        >
          + New Script
        </button>
      </div>

      <div className={`grid gap-5 ${selectedScript ? "grid-cols-[260px_1fr]" : "grid-cols-1 max-w-2xl"}`}>

        {/* ── Script List ── */}
        <div className="flex flex-col gap-2">

          {/* Status filters */}
          <div className="flex flex-wrap gap-1.5 mb-1">
            {(["All", ...STATUSES] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`text-xs font-medium px-2.5 py-1 border transition-colors ${
                  filterStatus === s
                    ? "bg-primary text-white border-primary"
                    : "border-border text-muted hover:text-dark hover:border-dark/30"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* New script form */}
          {showNewForm && (
            <div className="bg-white border border-border p-3">
              <input
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") createScript();
                  if (e.key === "Escape") { setShowNewForm(false); setNewTitle(""); }
                }}
                placeholder="Script title… (↵ to create)"
                className="w-full text-sm text-dark bg-transparent focus:outline-none placeholder:text-muted mb-2"
              />
              <div className="flex gap-2">
                <button
                  onClick={createScript}
                  disabled={!newTitle.trim() || creating}
                  className="bg-primary text-white text-xs font-medium px-3 py-1 hover:bg-primary-hover transition-colors disabled:opacity-50"
                >
                  {creating ? "Creating…" : "Create"}
                </button>
                <button
                  onClick={() => { setShowNewForm(false); setNewTitle(""); }}
                  className="text-xs text-muted hover:text-dark px-2 py-1 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* List */}
          {loading ? (
            <div className="flex flex-col gap-1.5">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-white border border-border animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="border border-dashed border-border p-10 text-center">
              <p className="text-sm text-muted mb-1">
                {scripts.length === 0 ? "No scripts yet." : "No scripts match this filter."}
              </p>
              {scripts.length === 0 && (
                <button
                  onClick={() => setShowNewForm(true)}
                  className="text-xs text-primary hover:text-primary-hover transition-colors"
                >
                  Create your first script →
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {filtered.map((s) => {
                const cfg = STATUS_CONFIG[s.status];
                const active = s.id === selectedId;
                return (
                  <button
                    key={s.id}
                    onClick={() => active ? closeEditor() : openScript(s)}
                    className={`text-left w-full border px-3 py-3 transition-colors ${
                      active
                        ? "bg-teal-tint border-primary/30"
                        : "bg-white border-border hover:border-primary/20 hover:bg-light"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 shrink-0 ${cfg.bg} ${cfg.color}`}>
                        {s.status}
                      </span>
                    </div>
                    <p className="text-sm text-dark leading-snug line-clamp-2">{s.title}</p>
                    <p className="text-[11px] text-muted mt-1">
                      {new Date(s.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </button>
                );
              })}
            </div>
          )}

          {scripts.length > 0 && (
            <p className="text-xs text-muted text-center pt-1">
              {filtered.length} of {scripts.length} script{scripts.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* ── Editor ── */}
        {selectedScript && (
          <div className="flex flex-col gap-4 min-w-0">

            {/* Title + controls */}
            <div className="bg-white border border-border px-5 py-4">
              <div className="flex items-center gap-3 mb-3">
                <input
                  ref={titleRef}
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); setSaved(false); }}
                  className="flex-1 text-lg font-serif text-dark bg-transparent focus:outline-none placeholder:text-muted"
                  placeholder="Script title…"
                />
                <div className="flex gap-2 items-center shrink-0">
                  {saved && <span className="text-xs text-primary">Saved</span>}
                  <button
                    onClick={saveScript}
                    disabled={saving}
                    className="bg-primary text-white text-xs font-medium px-3 py-1.5 hover:bg-primary-hover transition-colors disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                  <button
                    onClick={() => exportTeleprompter(
                      { ...selectedScript, hook, body, key_points: context.split("\n").filter(Boolean), cta },
                      context
                    )}
                    className="text-xs font-medium px-3 py-1.5 border border-border text-dark hover:border-primary/40 hover:text-primary transition-colors"
                  >
                    Export ↓
                  </button>
                  <button
                    onClick={deleteScript}
                    disabled={deleting}
                    className="text-xs text-muted hover:text-accent transition-colors px-2 py-1.5"
                  >
                    {deleting ? "…" : "Delete"}
                  </button>
                  <button onClick={closeEditor} className="text-muted hover:text-dark text-lg leading-none ml-1">×</button>
                </div>
              </div>

              {/* Status pipeline */}
              <div className="flex gap-2">
                {STATUSES.map((s) => {
                  const cfg = STATUS_CONFIG[s];
                  return (
                    <button
                      key={s}
                      onClick={() => { setStatus(s); setSaved(false); }}
                      className={`text-xs font-medium px-3 py-1 border transition-colors ${
                        status === s
                          ? `${cfg.bg} ${cfg.color} border-current/30`
                          : "border-border text-muted hover:text-dark"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sections grid */}
            <div className="grid grid-cols-2 gap-4">

              {/* Hook */}
              <div className="bg-white border border-border p-4 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted">Hook</label>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted font-mono">{wc(hook)}</span>
                    <button
                      onClick={generateHooks}
                      disabled={generatingHooks || !title.trim()}
                      className="text-[10px] font-medium text-primary hover:text-primary-hover transition-colors disabled:opacity-40"
                    >
                      {generatingHooks ? "Generating…" : "Generate variations →"}
                    </button>
                  </div>
                </div>
                <textarea
                  value={hook}
                  onChange={(e) => { setHook(e.target.value); setSaved(false); }}
                  placeholder="The first 30 seconds. Opens with a problem, surprise, or bold promise…"
                  rows={5}
                  className="flex-1 text-sm text-dark bg-transparent resize-none focus:outline-none placeholder:text-muted leading-relaxed"
                />
              </div>

              {/* Context */}
              <div className="bg-white border border-border p-4 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted">Context</label>
                  <span className="text-[11px] text-muted font-mono">{wc(context)}</span>
                </div>
                <textarea
                  value={context}
                  onChange={(e) => { setContext(e.target.value); setSaved(false); }}
                  placeholder={"Why this topic matters. Who this is for. What you'll cover.\n\nOne point per line."}
                  rows={5}
                  className="flex-1 text-sm text-dark bg-transparent resize-none focus:outline-none placeholder:text-muted leading-relaxed"
                />
              </div>

              {/* Main Content */}
              <div className="bg-white border border-border p-4 flex flex-col col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted">Main Content</label>
                    <span className="text-[10px] text-muted ml-2">Use [0:00] format for timestamps</span>
                  </div>
                  <span className="text-[11px] text-muted font-mono">{wc(body)}</span>
                </div>
                <textarea
                  value={body}
                  onChange={(e) => { setBody(e.target.value); setSaved(false); }}
                  placeholder={"[0:00] Introduction / transition from hook\n\n[1:30] First main point\n\n[4:00] Second main point\n\n[7:00] Third main point\n\n[10:00] Summary"}
                  rows={12}
                  className="flex-1 text-sm text-dark bg-transparent resize-none focus:outline-none placeholder:text-muted leading-relaxed font-mono"
                />
              </div>

              {/* CTA */}
              <div className="bg-white border border-border p-4 flex flex-col col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted">CTA</label>
                  <span className="text-[11px] text-muted font-mono">{wc(cta)}</span>
                </div>
                <textarea
                  value={cta}
                  onChange={(e) => { setCta(e.target.value); setSaved(false); }}
                  placeholder="What should viewers do next? Subscribe, comment, click the link…"
                  rows={3}
                  className="flex-1 text-sm text-dark bg-transparent resize-none focus:outline-none placeholder:text-muted leading-relaxed"
                />
              </div>
            </div>

            {/* Hook variations panel */}
            {showHookPanel && (
              <div className="bg-white border border-border p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-dark">Hook Variations</h3>
                  <button
                    onClick={() => setShowHookPanel(false)}
                    className="text-muted hover:text-dark text-lg leading-none"
                  >
                    ×
                  </button>
                </div>

                {generatingHooks ? (
                  <div className="flex flex-col gap-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-16 bg-light border border-border animate-pulse" />
                    ))}
                  </div>
                ) : hookVariations.length === 0 ? (
                  <p className="text-sm text-muted">No variations generated yet.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {hookVariations.map((v, i) => (
                      <div key={i} className="border border-border p-4 hover:border-primary/30 transition-colors">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2">{v.type}</p>
                        <p className="text-sm text-dark leading-relaxed mb-3">{v.hook}</p>
                        <button
                          onClick={() => applyHook(v.hook)}
                          className="text-xs font-medium text-primary hover:text-primary-hover transition-colors"
                        >
                          Use this hook →
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Total word count */}
            <div className="flex items-center justify-between text-xs text-muted pb-2">
              <span>
                Total: {wordCount(hook) + wordCount(context) + wordCount(body) + wordCount(cta)} words
              </span>
              <span>
                ~{Math.round((wordCount(hook) + wordCount(context) + wordCount(body) + wordCount(cta)) / 150)} min at 150 wpm
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
