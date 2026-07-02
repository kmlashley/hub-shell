"use client";

import { useState } from "react";
import Link from "next/link";

interface LinkSuggestion {
  phrase: string;
  url: string;
  page_title: string;
  reason: string;
  context: string;
}

interface InternalLinkerResult {
  suggestions: LinkSuggestion[];
  draft_with_links: string;
  pages_used: number;
  source: "library" | "scraped";
}

function SectionHeader({ label }: { label: string }) {
  return (
    <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-4">
      {label}
    </p>
  );
}

function highlightPhrase(context: string, phrase: string) {
  const idx = context.indexOf(phrase);
  if (idx === -1) return <span>{context}</span>;
  return (
    <>
      {context.slice(0, idx)}
      <mark className="bg-gold-tint text-dark px-0.5 not-italic">{phrase}</mark>
      {context.slice(idx + phrase.length)}
    </>
  );
}

export default function InternalLinkerPage() {
  const [draft, setDraft] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InternalLinkerResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleAnalyze() {
    if (!draft.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setCopied(false);

    try {
      const res = await fetch("/api/content/internal-linker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft, website_url: websiteUrl }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "Analysis failed");
      setResult(data.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!result?.draft_with_links) return;
    await navigator.clipboard.writeText(result.draft_with_links);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-serif text-dark mb-1">Internal Linker</h1>
        <p className="text-sm text-muted">
          Paste a draft. Get internal linking suggestions based on your published content library,
          then copy the updated draft with links inserted.
        </p>
      </div>

      {/* Input */}
      <div className="bg-white border border-border p-5 mb-4">
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-[10px] font-semibold tracking-widest uppercase text-muted block mb-1.5">
              Your Draft
            </label>
            <textarea
              className="w-full text-sm text-dark placeholder:text-muted bg-transparent outline-none border border-border px-3 py-2 focus:border-primary/50 transition-colors resize-none"
              rows={10}
              placeholder="Paste your blog post, newsletter, or article draft here…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold tracking-widest uppercase text-muted block mb-1.5">
              Your Website URL{" "}
              <span className="normal-case font-normal tracking-normal">
                (optional — used if your content library is empty)
              </span>
            </label>
            <input
              type="text"
              className="w-full text-sm text-dark placeholder:text-muted bg-transparent outline-none border border-border px-3 py-2 focus:border-primary/50 transition-colors"
              placeholder="https://yoursite.com"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted">
              Links are pulled from your{" "}
              <Link href="/content/published" className="text-primary hover:underline">
                Published Content
              </Link>{" "}
              library.
            </p>
            <button
              onClick={handleAnalyze}
              disabled={loading || !draft.trim()}
              className="bg-primary text-white text-sm px-5 py-2 hover:bg-primary-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "Analyzing…" : "Find internal links"}
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
          <p className="text-sm text-muted">Analyzing draft and matching to your content library…</p>
          <p className="text-xs text-muted mt-1.5">Takes 10–20 seconds.</p>
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-4">

          {/* Status bar */}
          <div className="bg-light border border-border px-4 py-3 flex items-center justify-between">
            <p className="text-xs text-muted">
              {result.suggestions.length === 0
                ? "No strong linking opportunities found in this draft."
                : `${result.suggestions.length} link ${result.suggestions.length === 1 ? "suggestion" : "suggestions"} · `}
              {result.pages_used > 0
                ? `${result.pages_used} pages in library (${result.source === "scraped" ? "scraped from website" : "from Published Content"})`
                : "No content library found — suggestions based on structure only"}
            </p>
            {result.suggestions.length > 0 && (
              <button
                onClick={handleCopy}
                className="text-xs font-medium text-primary hover:text-primary-hover transition-colors"
              >
                {copied ? "Copied ✓" : "Copy draft with links"}
              </button>
            )}
          </div>

          {result.suggestions.length === 0 ? (
            <div className="bg-white border border-border p-8 text-center">
              <p className="text-sm text-muted mb-2">No strong internal linking opportunities found.</p>
              <p className="text-xs text-muted">
                {result.pages_used === 0
                  ? "Add published content to your library so Claude has pages to link to."
                  : "The draft content doesn't closely match your published pages. Try a different draft or add more pages to your library."}
              </p>
              {result.pages_used === 0 && (
                <Link
                  href="/content/published"
                  className="inline-block mt-3 text-xs text-primary hover:underline"
                >
                  Go to Published Content →
                </Link>
              )}
            </div>
          ) : (
            <>
              {/* Link suggestions */}
              <div className="bg-white border border-border p-5">
                <SectionHeader label={`Link Suggestions (${result.suggestions.length})`} />
                <div className="flex flex-col gap-3">
                  {result.suggestions.map((s, i) => (
                    <div key={i} className="border border-border p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-bold text-primary w-5 h-5 bg-teal-tint flex items-center justify-center shrink-0">
                            {i + 1}
                          </span>
                          <p className="text-sm font-medium text-dark truncate">{s.page_title}</p>
                        </div>
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline shrink-0"
                        >
                          View page →
                        </a>
                      </div>

                      {/* Context with highlighted phrase */}
                      <p className="text-xs text-dark/70 leading-relaxed mb-2.5 italic">
                        &ldquo;{highlightPhrase(s.context, s.phrase)}&rdquo;
                      </p>

                      <div className="flex items-start gap-3">
                        <div className="bg-gold-tint px-2 py-1 shrink-0">
                          <p className="text-[10px] font-semibold tracking-widest uppercase text-gold">
                            Link text
                          </p>
                          <p className="text-xs text-dark font-medium">{s.phrase}</p>
                        </div>
                        <p className="text-xs text-muted leading-snug pt-1">{s.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Updated draft preview */}
              <div className="bg-white border border-border p-5">
                <div className="flex items-center justify-between mb-4">
                  <SectionHeader label="Draft with Links Inserted" />
                  <button
                    onClick={handleCopy}
                    className="text-xs text-primary hover:text-primary-hover transition-colors -mt-3"
                  >
                    {copied ? "Copied ✓" : "Copy to clipboard"}
                  </button>
                </div>
                <pre className="text-xs text-dark/80 leading-relaxed whitespace-pre-wrap font-sans bg-light p-4 overflow-auto max-h-64">
                  {result.draft_with_links}
                </pre>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
