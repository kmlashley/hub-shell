"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { fmtRelative, fmtDate } from "@/lib/fmt-date";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface AdvisorRef {
  id: string;
  name: string;
  avatar_color: string;
}

interface Critique {
  id: string;
  advisor_id: string;
  subject: string;
  subject_type: string;
  input_content: string;
  critique_json: Record<string, unknown>;
  created_at: string;
  advisors: AdvisorRef | null;
}

// ─── Config ────────────────────────────────────────────────────────────────────

const SUBJECT_TYPE_CONFIG: Record<string, { label: string; cls: string }> = {
  landing_page:      { label: "Landing Page",    cls: "bg-teal-tint text-primary" },
  email:             { label: "Email",            cls: "bg-purple-tint text-purple" },
  social_post:       { label: "Social Post",      cls: "bg-rust-tint text-accent" },
  offer_description: { label: "Offer",            cls: "bg-gold-tint text-gold" },
  other:             { label: "Other",            cls: "bg-light text-muted" },
};

type DateFilter = "all" | "7d" | "30d";

function applyDateFilter(items: Critique[], f: DateFilter): Critique[] {
  if (f === "all") return items;
  const ms = f === "7d" ? 7 * 86_400_000 : 30 * 86_400_000;
  const cutoff = Date.now() - ms;
  return items.filter((c) => new Date(c.created_at).getTime() > cutoff);
}

function extractKeyFinding(json: Record<string, unknown>): string {
  const keys = ["key_finding", "summary", "headline", "main_finding"];
  for (const k of keys) {
    if (typeof json[k] === "string" && json[k]) return json[k] as string;
  }
  for (const v of Object.values(json)) {
    if (typeof v === "string" && v) return v.slice(0, 120);
  }
  return "—";
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function CritiquesPage() {
  const [critiques, setCritiques] = useState<Critique[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [advisorFilter, setAdvisorFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [generatingCopyFor, setGeneratingCopyFor] = useState<string | null>(null);
  const [generatedCopy, setGeneratedCopy] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/advisors/critiques");
    const data = await res.json();
    setCritiques(data.critiques ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleGenerateCopy(critiqueId: string) {
    setGeneratingCopyFor(critiqueId);
    const res = await fetch("/api/advisors/generate-copy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ critique_id: critiqueId }),
    });
    const data = await res.json();
    if (data.copy?.full_copy) {
      setGeneratedCopy((prev) => ({ ...prev, [critiqueId]: data.copy.full_copy }));
    }
    setGeneratingCopyFor(null);
  }

  // Unique advisors for filter
  const allAdvisors = Array.from(
    new Map(
      critiques
        .filter((c) => c.advisors)
        .map((c) => [c.advisors!.id, c.advisors!])
    ).values()
  );

  const allTypes = [...new Set(critiques.map((c) => c.subject_type))];

  const filtered = applyDateFilter(
    critiques
      .filter((c) => advisorFilter === "all" || c.advisor_id === advisorFilter)
      .filter((c) => typeFilter === "all" || c.subject_type === typeFilter),
    dateFilter
  );

  const hasFilters = advisorFilter !== "all" || typeFilter !== "all" || dateFilter !== "all";

  return (
    <div className="max-w-5xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="text-xs text-muted mb-2">
            <Link href="/" className="hover:text-dark transition-colors">Dashboard</Link>
            {" › "}
            <Link href="/intelligence" className="hover:text-dark transition-colors">Intelligence</Link>
            {" › "}
            <Link href="/intelligence/advisors" className="hover:text-dark transition-colors">AI Advisors</Link>
            {" › "}
            <span className="text-dark">All Critiques</span>
          </p>
          <h1 className="text-3xl font-serif text-dark mb-1">All Critiques</h1>
          <p className="text-sm text-muted">
            Every critique your advisor panel has produced.
          </p>
        </div>
        <Link
          href="/intelligence/advisors/run"
          className="bg-primary text-white text-sm font-medium px-4 py-2 hover:bg-primary-hover transition-colors shrink-0"
        >
          Run new critique
        </Link>
      </div>

      {/* ── Filters ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <select
          value={advisorFilter}
          onChange={(e) => setAdvisorFilter(e.target.value)}
          className="text-xs border border-border px-2.5 py-1.5 text-dark bg-white focus:outline-none focus:border-primary"
        >
          <option value="all">All advisors</option>
          {allAdvisors.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="text-xs border border-border px-2.5 py-1.5 text-dark bg-white focus:outline-none focus:border-primary"
        >
          <option value="all">All content types</option>
          {allTypes.map((t) => (
            <option key={t} value={t}>{SUBJECT_TYPE_CONFIG[t]?.label ?? t}</option>
          ))}
        </select>

        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value as DateFilter)}
          className="text-xs border border-border px-2.5 py-1.5 text-dark bg-white focus:outline-none focus:border-primary"
        >
          <option value="all">All time</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
        </select>

        {hasFilters && (
          <button
            onClick={() => { setAdvisorFilter("all"); setTypeFilter("all"); setDateFilter("all"); }}
            className="text-xs text-muted hover:text-dark"
          >
            Clear filters
          </button>
        )}

        {!loading && (
          <span className="text-xs text-muted ml-auto">
            {filtered.length} critique{filtered.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* ── Table ────────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-white border border-border animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-border p-12 text-center">
          <p className="text-sm font-medium text-dark mb-1">
            {hasFilters ? "No critiques match these filters." : "No critiques yet."}
          </p>
          {!hasFilters && (
            <p className="text-xs text-muted mb-4">
              Run your first critique to see results here.
            </p>
          )}
          {!hasFilters && (
            <Link
              href="/intelligence/advisors/run"
              className="inline-block bg-primary text-white text-sm font-medium px-4 py-2 hover:bg-primary-hover transition-colors"
            >
              Run critique →
            </Link>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-px bg-border border border-border">
          {/* Column headers */}
          <div className="grid grid-cols-[120px_1fr_140px_100px_110px] gap-4 bg-light px-4 py-2.5 text-[10px] font-semibold tracking-widest uppercase text-muted">
            <span>Date</span>
            <span>Subject</span>
            <span>Advisor</span>
            <span>Type</span>
            <span></span>
          </div>

          {filtered.map((critique) => {
            const isExpanded = expandedId === critique.id;
            const typeConf = SUBJECT_TYPE_CONFIG[critique.subject_type] ?? SUBJECT_TYPE_CONFIG.other;
            const keyFinding = extractKeyFinding(critique.critique_json);
            const advisor = critique.advisors;
            const copy = generatedCopy[critique.id];

            return (
              <div key={critique.id} className="bg-white">
                {/* Row */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : critique.id)}
                  className="w-full grid grid-cols-[120px_1fr_140px_100px_110px] gap-4 px-4 py-3.5 text-left hover:bg-light transition-colors items-center"
                >
                  <span className="text-xs text-muted">{fmtRelative(critique.created_at)}</span>
                  <span className="text-sm text-dark font-medium leading-snug line-clamp-1">
                    {critique.subject}
                  </span>
                  <div className="flex items-center gap-2 min-w-0">
                    {advisor && (
                      <>
                        <div
                          className="w-5 h-5 shrink-0 flex items-center justify-center text-white text-[10px] font-semibold"
                          style={{ backgroundColor: advisor.avatar_color }}
                        >
                          {advisor.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs text-dark truncate">{advisor.name}</span>
                      </>
                    )}
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 inline-block w-fit ${typeConf.cls}`}>
                    {typeConf.label}
                  </span>
                  <span className="text-xs text-accent">
                    {isExpanded ? "Collapse ↑" : "Expand ↓"}
                  </span>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-border bg-light px-4 py-4">
                    {/* Key finding */}
                    <div className="border-l-4 border-primary pl-4 mb-4">
                      <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-0.5">
                        Key finding
                      </p>
                      <p className="text-sm font-medium text-dark leading-snug">{keyFinding}</p>
                    </div>

                    {/* Full critique JSON */}
                    <CritiqueDetail json={critique.critique_json} />

                    {/* Original content */}
                    <details className="mt-4">
                      <summary className="text-xs text-muted cursor-pointer hover:text-dark select-none">
                        Show original content
                      </summary>
                      <div className="mt-2 bg-white border border-border p-3">
                        <p className="text-xs text-dark leading-relaxed whitespace-pre-wrap">
                          {critique.input_content}
                        </p>
                      </div>
                    </details>

                    {/* Generated copy */}
                    {copy && (
                      <div className="mt-4 bg-white border border-border p-4">
                        <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-2">
                          Generated copy
                        </p>
                        <pre className="text-sm text-dark leading-relaxed whitespace-pre-wrap font-sans">
                          {copy}
                        </pre>
                        <button
                          onClick={() => navigator.clipboard.writeText(copy)}
                          className="text-xs text-primary hover:underline mt-2"
                        >
                          Copy to clipboard
                        </button>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border">
                      <span className="text-xs text-muted">
                        {fmtDate(critique.created_at)}
                      </span>
                      <div className="ml-auto flex gap-2">
                        {advisor && (
                          <Link
                            href={`/intelligence/advisors/${advisor.id}`}
                            className="text-xs text-muted hover:text-dark transition-colors"
                          >
                            Advisor profile →
                          </Link>
                        )}
                        {!copy && (
                          <button
                            onClick={() => handleGenerateCopy(critique.id)}
                            disabled={generatingCopyFor === critique.id}
                            className="bg-primary text-white text-xs font-medium px-3 py-1.5 hover:bg-primary-hover disabled:opacity-40 transition-colors"
                          >
                            {generatingCopyFor === critique.id
                              ? "Generating…"
                              : "Generate copy"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Critique detail renderer ──────────────────────────────────────────────────

function CritiqueDetail({ json }: { json: Record<string, unknown> }) {
  if (json.raw) {
    return <p className="text-sm text-dark leading-relaxed">{json.raw as string}</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {typeof json.overall_assessment === "string" && (
        <div className="col-span-2">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-1">
            Overall assessment
          </p>
          <p className="text-sm text-dark leading-relaxed">{json.overall_assessment}</p>
        </div>
      )}

      {Array.isArray(json.strengths) && json.strengths.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold tracking-widest uppercase text-olive mb-2">
            Strengths
          </p>
          <ul className="flex flex-col gap-1">
            {(json.strengths as string[]).map((s, i) => (
              <li key={i} className="flex gap-2 text-xs text-dark">
                <span className="text-olive shrink-0">+</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {Array.isArray(json.weaknesses) && json.weaknesses.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold tracking-widest uppercase text-accent mb-2">
            Weaknesses
          </p>
          <ul className="flex flex-col gap-1">
            {(json.weaknesses as string[]).map((w, i) => (
              <li key={i} className="flex gap-2 text-xs text-dark">
                <span className="text-accent shrink-0">−</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {Array.isArray(json.recommendations) && json.recommendations.length > 0 && (
        <div className="col-span-2">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-2">
            Specific fixes
          </p>
          <div className="flex flex-col gap-2">
            {(json.recommendations as Array<{ issue: string; fix: string }>).map((r, i) => (
              <div key={i} className="bg-white border border-border p-3">
                <p className="text-[11px] font-semibold text-accent mb-0.5">Issue: {r.issue}</p>
                <p className="text-xs text-dark">Fix: {r.fix}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {typeof json.audience_fit === "string" && (
        <div className="col-span-2">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-1">
            Audience fit
          </p>
          <p className="text-xs text-dark leading-relaxed">{json.audience_fit as string}</p>
        </div>
      )}
    </div>
  );
}
