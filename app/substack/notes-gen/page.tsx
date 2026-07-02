"use client";

import { useState } from "react";
import Link from "next/link";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Format = "Rally" | "Contrarian Take" | "Quick Win" | "Observation";

interface Variation {
  note: string;
  angle: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const FORMATS: { id: Format; label: string; desc: string }[] = [
  {
    id: "Rally",
    label: "Rally",
    desc: "Fires people up around a shared belief or frustration.",
  },
  {
    id: "Contrarian Take",
    label: "Contrarian Take",
    desc: "Challenges a popular assumption. Sharp and confident.",
  },
  {
    id: "Quick Win",
    label: "Quick Win",
    desc: "One immediately actionable tip. Leads with the win.",
  },
  {
    id: "Observation",
    label: "Observation",
    desc: "A specific thing you noticed. Expertise through specificity.",
  },
];

const CHAR_LIMIT = 280;

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function NotesGenPage() {
  const [input, setInput] = useState("");
  const [format, setFormat] = useState<Format>("Observation");
  const [generating, setGenerating] = useState(false);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editedNotes, setEditedNotes] = useState<string[]>([]);
  const [savingIdx, setSavingIdx] = useState<number | null>(null);
  const [savedIdx, setSavedIdx] = useState<Set<number>>(new Set());

  async function generate() {
    if (!input.trim() || generating) return;
    setGenerating(true);
    setVariations([]);
    setEditedNotes([]);
    setError(null);
    setSavedIdx(new Set());

    try {
      const r = await fetch("/api/substack/notes-gen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, format }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error ?? "Generation failed");
      setVariations(d.variations);
      setEditedNotes(d.variations.map((v: Variation) => v.note));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  }

  async function saveToNotes(idx: number) {
    const content = editedNotes[idx];
    if (!content?.trim() || savingIdx !== null) return;
    setSavingIdx(idx);
    try {
      const r = await fetch("/api/substack/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), status: "Draft" }),
      });
      const d = await r.json();
      if (d.success) {
        setSavedIdx((prev) => new Set([...prev, idx]));
      }
    } finally {
      setSavingIdx(null);
    }
  }

  const selectedFormat = FORMATS.find((f) => f.id === format)!;

  return (
    <div className="max-w-3xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <p className="text-xs text-muted mb-2">
          <Link href="/" className="hover:text-dark transition-colors">Dashboard</Link>
          {" › "}
          <Link href="/substack" className="hover:text-dark transition-colors">Substack</Link>
          {" › "}
          <span className="text-dark">Note Generator</span>
        </p>
        <h1 className="text-2xl font-serif text-dark mb-1">Note Generator</h1>
        <p className="text-sm text-muted">
          Generate Substack Note drafts from a topic, observation, or pasted content.
        </p>
      </div>

      {/* Input form */}
      <div className="bg-white border border-border p-6 mb-6">

        {/* Format picker */}
        <div className="mb-5">
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted mb-2">
            Note Format
          </label>
          <div className="grid grid-cols-2 gap-2">
            {FORMATS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFormat(f.id)}
                className={`text-left px-4 py-3 border transition-colors ${
                  format === f.id
                    ? "border-primary bg-teal-tint"
                    : "border-border hover:border-primary/30 hover:bg-light"
                }`}
              >
                <p className={`text-sm font-medium mb-0.5 ${format === f.id ? "text-primary" : "text-dark"}`}>
                  {f.label}
                </p>
                <p className="text-xs text-muted leading-snug">{f.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="mb-4">
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted mb-2">
            Your Idea or Content
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              format === "Rally"
                ? "Describe the belief or frustration you want to rally around…"
                : format === "Contrarian Take"
                ? "What common assumption do you want to challenge?"
                : format === "Quick Win"
                ? "What's the one actionable tip you want to share?"
                : "What did you notice? Paste content, a quote, or describe your observation…"
            }
            rows={5}
            className="w-full border border-border bg-light px-4 py-3 text-sm text-dark resize-none focus:outline-none focus:border-primary transition-colors placeholder:text-muted"
          />
          <p className="text-xs text-muted mt-1.5">
            Paste a draft, a client quote, a blog excerpt, or just describe the idea in plain language.
          </p>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted">
            Format: <span className="font-medium text-dark">{selectedFormat.label}</span> · {selectedFormat.desc}
          </p>
          <button
            onClick={generate}
            disabled={!input.trim() || generating}
            className="bg-primary text-white text-sm font-medium px-5 py-2 hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {generating ? "Generating…" : "Generate 3 Variations"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-rust-tint border border-accent/30 px-4 py-3 mb-6 text-sm text-accent">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {generating && (
        <div className="flex flex-col gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white border border-border p-5 animate-pulse">
              <div className="h-3 bg-border w-1/4 mb-4" />
              <div className="h-3 bg-border w-full mb-2" />
              <div className="h-3 bg-border w-4/5 mb-2" />
              <div className="h-3 bg-border w-3/5" />
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {variations.length > 0 && !generating && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-medium text-dark">
              {format} — 3 Variations
            </h2>
            <button
              onClick={generate}
              className="text-xs text-primary hover:text-primary-hover transition-colors"
            >
              Regenerate →
            </button>
          </div>

          {variations.map((v, idx) => {
            const text = editedNotes[idx] ?? v.note;
            const chars = text.length;
            const over = chars > CHAR_LIMIT;
            const saved = savedIdx.has(idx);

            return (
              <div
                key={idx}
                className={`bg-white border p-5 transition-colors ${
                  saved ? "border-primary/30 bg-teal-tint/30" : "border-border"
                }`}
              >
                {/* Angle label */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                    Variation {idx + 1} · {v.angle}
                  </span>
                  <span className={`text-xs font-mono ${over ? "text-accent font-semibold" : "text-muted"}`}>
                    {chars}/{CHAR_LIMIT}
                  </span>
                </div>

                {/* Editable note */}
                <textarea
                  value={text}
                  onChange={(e) => {
                    const next = [...editedNotes];
                    next[idx] = e.target.value;
                    setEditedNotes(next);
                    if (saved) setSavedIdx((prev) => { const s = new Set(prev); s.delete(idx); return s; });
                  }}
                  rows={Math.max(3, Math.ceil(text.length / 60))}
                  className="w-full text-sm text-dark bg-transparent resize-none focus:outline-none leading-relaxed"
                />

                {over && (
                  <p className="text-xs text-accent mt-1">
                    {chars - CHAR_LIMIT} chars over the 280 soft limit
                  </p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border">
                  <button
                    onClick={() => saveToNotes(idx)}
                    disabled={saved || savingIdx !== null}
                    className={`text-xs font-medium px-4 py-1.5 transition-colors ${
                      saved
                        ? "bg-olive-tint text-olive border border-olive/30 cursor-default"
                        : "bg-primary text-white hover:bg-primary-hover disabled:opacity-50"
                    }`}
                  >
                    {saved ? "Saved to Notes ✓" : savingIdx === idx ? "Saving…" : "Save to Notes Manager"}
                  </button>
                  <button
                    onClick={() => navigator.clipboard.writeText(text)}
                    className="text-xs text-muted hover:text-dark transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>
            );
          })}

          {savedIdx.size > 0 && (
            <div className="text-center pt-2">
              <Link
                href="/substack/notes"
                className="text-xs text-primary hover:text-primary-hover transition-colors"
              >
                View saved notes in Notes Manager →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
