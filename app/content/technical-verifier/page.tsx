"use client";

import { useState } from "react";

type ClaimStatus = "accurate" | "outdated" | "incorrect" | "unverified";

interface VerifiedClaim {
  claim: string;
  status: "accurate";
  note: string;
}

interface FlaggedClaim {
  claim: string;
  status: Exclude<ClaimStatus, "accurate">;
  what_is_wrong: string;
  what_is_correct: string;
  source: string;
}

interface VerificationResult {
  summary: string;
  verified: VerifiedClaim[];
  flagged: FlaggedClaim[];
  corrected_content: string;
}

const FLAG_CONFIG: Record<Exclude<ClaimStatus, "accurate">, { label: string; color: string; bg: string }> = {
  outdated: { label: "Outdated", color: "text-gold", bg: "bg-gold-tint" },
  incorrect: { label: "Incorrect", color: "text-accent", bg: "bg-rust-tint" },
  unverified: { label: "Unverified", color: "text-muted", bg: "bg-light" },
};

function SectionHeader({ label }: { label: string }) {
  return (
    <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-4">
      {label}
    </p>
  );
}

export default function TechnicalVerifierPage() {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCorrected, setShowCorrected] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleVerify() {
    if (!content.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setShowCorrected(false);
    setSaved(false);

    try {
      const res = await fetch("/api/content/technical-verifier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "Verification failed");
      setResult(data.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!result) return;
    setSaving(true);
    try {
      await fetch("/api/content/technical-verifier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, results: result, save: true }),
      });
      setSaved(true);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  async function handleCopyCorrected() {
    if (!result?.corrected_content) return;
    await navigator.clipboard.writeText(result.corrected_content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const flagCount = result?.flagged.length ?? 0;
  const verifiedCount = result?.verified.length ?? 0;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-serif text-dark mb-1">Technical Verifier</h1>
        <p className="text-sm text-muted">
          Paste content containing AI tool names, pricing, or technical claims. Get a fact-check report with corrections before you publish.
        </p>
      </div>

      {/* Input */}
      <div className="bg-white border border-border p-5 mb-4">
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-[10px] font-semibold tracking-widest uppercase text-muted block mb-1.5">
              Content to Verify
            </label>
            <textarea
              className="w-full text-sm text-dark placeholder:text-muted bg-transparent outline-none border border-border px-3 py-2 focus:border-primary/50 transition-colors resize-none"
              rows={10}
              placeholder="Paste your blog post, newsletter, LinkedIn post, or any content with technical claims…"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleVerify}
              disabled={loading || !content.trim()}
              className="bg-primary text-white text-sm px-5 py-2 hover:bg-primary-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "Verifying…" : "Verify content"}
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
          <p className="text-sm text-muted">Extracting claims and fact-checking…</p>
          <p className="text-xs text-muted mt-1.5">
            Runs two passes — claim extraction then live search verification. Takes 20–40 seconds.
          </p>
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-4">

          {/* Score bar */}
          <div className={`border p-4 flex items-center justify-between ${
            flagCount === 0
              ? "bg-teal-tint border-primary/20"
              : flagCount <= 2
              ? "bg-gold-tint border-gold/30"
              : "bg-rust-tint border-accent/30"
          }`}>
            <div>
              <p className={`text-sm font-medium ${
                flagCount === 0 ? "text-primary" : flagCount <= 2 ? "text-gold" : "text-accent"
              }`}>
                {flagCount === 0
                  ? "All claims verified ✓"
                  : `${flagCount} flag${flagCount !== 1 ? "s" : ""} found`}
              </p>
              <p className="text-xs text-dark/70 mt-0.5">{result.summary}</p>
            </div>
            <div className="text-right shrink-0 ml-4">
              <p className="text-xs text-muted">{verifiedCount} accurate · {flagCount} flagged</p>
            </div>
          </div>

          {/* Flagged claims */}
          {result.flagged.length > 0 && (
            <div className="bg-white border border-border p-5">
              <SectionHeader label={`Flagged Claims (${result.flagged.length})`} />
              <div className="flex flex-col gap-3">
                {result.flagged.map((flag, i) => {
                  const cfg = FLAG_CONFIG[flag.status] ?? FLAG_CONFIG.unverified;
                  return (
                    <div key={i} className="border border-border p-4">
                      <div className="flex items-start gap-2 mb-3">
                        <span className={`text-[10px] font-semibold tracking-widest uppercase px-2 py-0.5 shrink-0 ${cfg.bg} ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        <p className="text-sm text-dark/70 leading-snug italic">&ldquo;{flag.claim}&rdquo;</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-2">
                        <div className="bg-rust-tint px-3 py-2.5">
                          <p className="text-[10px] font-semibold tracking-widest uppercase text-accent mb-1">
                            What&apos;s wrong
                          </p>
                          <p className="text-xs text-dark leading-snug">{flag.what_is_wrong}</p>
                        </div>
                        <div className="bg-teal-tint px-3 py-2.5">
                          <p className="text-[10px] font-semibold tracking-widest uppercase text-primary mb-1">
                            What&apos;s correct
                          </p>
                          <p className="text-xs text-dark leading-snug">{flag.what_is_correct}</p>
                        </div>
                      </div>
                      <p className="text-[11px] text-muted">
                        Source: {flag.source}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Verified claims */}
          {result.verified.length > 0 && (
            <div className="bg-white border border-border p-5">
              <SectionHeader label={`Verified Claims (${result.verified.length})`} />
              <div className="flex flex-col gap-2">
                {result.verified.map((v, i) => (
                  <div key={i} className="border border-border px-4 py-3 flex items-start gap-3">
                    <span className="text-primary text-base shrink-0 mt-0.5">✓</span>
                    <div>
                      <p className="text-sm text-dark/80 leading-snug italic mb-1">&ldquo;{v.claim}&rdquo;</p>
                      <p className="text-xs text-muted leading-snug">{v.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Corrected version */}
          {result.flagged.length > 0 && (
            <div className="bg-white border border-border p-5">
              <div className="flex items-center justify-between mb-4">
                <SectionHeader label="Corrected Version" />
                <div className="flex items-center gap-3 -mt-3">
                  <button
                    onClick={() => setShowCorrected((s) => !s)}
                    className="text-xs text-muted hover:text-dark transition-colors"
                  >
                    {showCorrected ? "Hide" : "Show"}
                  </button>
                  <button
                    onClick={handleCopyCorrected}
                    className="text-xs text-primary hover:text-primary-hover transition-colors"
                  >
                    {copied ? "Copied ✓" : "Copy corrected version"}
                  </button>
                </div>
              </div>
              {showCorrected && (
                <pre className="text-xs text-dark/80 leading-relaxed whitespace-pre-wrap font-sans bg-light p-4 overflow-auto max-h-72">
                  {result.corrected_content}
                </pre>
              )}
              {!showCorrected && (
                <p className="text-xs text-muted">
                  {result.flagged.length} correction{result.flagged.length !== 1 ? "s" : ""} applied.{" "}
                  <button onClick={() => setShowCorrected(true)} className="text-primary hover:underline">
                    Show corrected draft
                  </button>{" "}
                  or copy it directly.
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end pb-4">
            <button
              onClick={handleSave}
              disabled={saving || saved}
              className="text-sm border border-border px-4 py-2 text-muted hover:text-dark hover:border-dark/20 transition-colors disabled:opacity-40"
            >
              {saved ? "Saved to history ✓" : saving ? "Saving…" : "Save to history"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
