"use client";

import { useState } from "react";

export default function VoiceRewritePage() {
  const [content, setContent] = useState("");
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleRewrite() {
    if (!content.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setCopied(false);

    try {
      const res = await fetch("/api/content/voice-rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, instructions: instructions || undefined }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "Rewrite failed");
      setResult(data.rewritten);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-serif text-dark mb-1">Voice Rewrite</h1>
        <p className="text-sm text-muted">
          Paste any content — yours or a draft that reads generic — and get it rewritten in your voice.
        </p>
      </div>

      <div className="bg-white border border-border p-5 mb-4">
        <textarea
          className="w-full text-sm text-dark placeholder:text-muted bg-transparent resize-none outline-none leading-relaxed min-h-[220px]"
          placeholder="Paste the content to rewrite…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <div className="pt-3 border-t border-border mt-3">
          <label className="text-[10px] font-semibold tracking-widest uppercase text-muted block mb-1.5">
            Additional instructions (optional)
          </label>
          <input
            type="text"
            className="w-full text-sm text-dark placeholder:text-muted bg-transparent outline-none border border-border px-3 py-2 focus:border-primary/50 transition-colors mb-3"
            placeholder="e.g. make the opening hit harder, cut the middle section"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted">{content.length.toLocaleString()} characters</span>
            <button
              onClick={handleRewrite}
              disabled={loading || !content.trim()}
              className="bg-primary text-white text-sm px-5 py-2 hover:bg-primary-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "Rewriting…" : "Rewrite in my voice"}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rust-tint border border-accent/30 text-accent text-sm px-4 py-3 mb-4">
          {error}
        </div>
      )}

      {loading && (
        <div className="bg-white border border-border p-8 text-center mb-4">
          <p className="text-sm text-muted">Rewriting your content…</p>
        </div>
      )}

      {result && (
        <div className="bg-white border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-muted">
              Rewritten
            </p>
            <button
              onClick={handleCopy}
              className="text-xs border border-border px-3 py-1.5 text-muted hover:text-dark hover:border-border-2 transition-colors"
            >
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </div>
          <p className="text-sm text-dark leading-relaxed whitespace-pre-wrap">{result}</p>
        </div>
      )}
    </div>
  );
}
