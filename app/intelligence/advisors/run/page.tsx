"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Advisor {
  id: string;
  name: string;
  specialty: string;
  avatar_color: string;
}

interface CritiqueResult {
  critiqueId: string;
  advisorId: string;
  advisorName: string;
  advisorColor: string;
  critiqueJson: {
    key_finding?: string;
    overall_assessment?: string;
    strengths?: string[];
    weaknesses?: string[];
    recommendations?: Array<{ issue: string; fix: string }>;
    audience_fit?: string;
    raw?: string;
  };
  generatedCopy?: string;
  generatingCopy?: boolean;
}

// ─── Config ────────────────────────────────────────────────────────────────────

const CONTENT_TYPES = [
  { value: "landing_page",      label: "Landing Page" },
  { value: "email",             label: "Email" },
  { value: "social_post",       label: "Social Post" },
  { value: "offer_description", label: "Offer Description" },
];

const AUDIENCE_TEMPS = [
  { value: "cold", label: "Cold",
    desc: "Never heard of you" },
  { value: "warm", label: "Warm",
    desc: "Aware but not a buyer yet" },
  { value: "hot",  label: "Hot",
    desc: "Ready to buy" },
];

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function RunCritiquePage() {
  const searchParams = useSearchParams();
  const preselectedAdvisorId = searchParams.get("advisor");

  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [selectedAdvisorIds, setSelectedAdvisorIds] = useState<string[]>([]);
  const [contentType, setContentType] = useState("landing_page");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [audienceTemp, setAudienceTemp] = useState("warm");
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<CritiqueResult[]>([]);
  const [error, setError] = useState("");

  const loadAdvisors = useCallback(async () => {
    const res = await fetch("/api/advisors");
    const data = await res.json();
    const list: Advisor[] = data.advisors ?? [];
    setAdvisors(list);
    if (preselectedAdvisorId && list.some((a) => a.id === preselectedAdvisorId)) {
      setSelectedAdvisorIds([preselectedAdvisorId]);
    }
  }, [preselectedAdvisorId]);

  useEffect(() => { loadAdvisors(); }, [loadAdvisors]);

  function toggleAdvisor(id: string) {
    setSelectedAdvisorIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleRun() {
    if (selectedAdvisorIds.length === 0) {
      setError("Select at least one advisor.");
      return;
    }
    if (!subject.trim() || !content.trim()) {
      setError("Subject and content are required.");
      return;
    }
    setError("");
    setRunning(true);
    setResults([]);

    const newResults: CritiqueResult[] = [];

    for (const advisorId of selectedAdvisorIds) {
      const advisor = advisors.find((a) => a.id === advisorId);
      try {
        const res = await fetch("/api/advisors/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            advisor_id: advisorId,
            subject: subject.trim(),
            subject_type: contentType,
            input_content: content.trim(),
            audience_temperature: audienceTemp,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          newResults.push({
            critiqueId: "",
            advisorId,
            advisorName: advisor?.name ?? "Advisor",
            advisorColor: advisor?.avatar_color ?? "#0f6b70",
            critiqueJson: { raw: data.error ?? "Failed to run critique." },
          });
        } else {
          newResults.push({
            critiqueId: data.critique.id,
            advisorId,
            advisorName: data.advisor_name,
            advisorColor: data.advisor_color ?? advisor?.avatar_color ?? "#0f6b70",
            critiqueJson: data.critique.critique_json,
          });
        }
      } catch {
        newResults.push({
          critiqueId: "",
          advisorId,
          advisorName: advisor?.name ?? "Advisor",
          advisorColor: advisor?.avatar_color ?? "#0f6b70",
          critiqueJson: { raw: "Network error — please try again." },
        });
      }
    }

    setResults(newResults);
    setRunning(false);
  }

  async function handleGenerateCopy(critiqueId: string) {
    setResults((prev) =>
      prev.map((r) =>
        r.critiqueId === critiqueId ? { ...r, generatingCopy: true } : r
      )
    );
    try {
      const res = await fetch("/api/advisors/generate-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ critique_id: critiqueId }),
      });
      const data = await res.json();
      setResults((prev) =>
        prev.map((r) =>
          r.critiqueId === critiqueId
            ? { ...r, generatingCopy: false, generatedCopy: data.copy?.full_copy ?? "" }
            : r
        )
      );
    } catch {
      setResults((prev) =>
        prev.map((r) =>
          r.critiqueId === critiqueId ? { ...r, generatingCopy: false } : r
        )
      );
    }
  }

  return (
    <div className="max-w-4xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <p className="text-xs text-muted mb-2">
          <Link href="/" className="hover:text-dark transition-colors">Dashboard</Link>
          {" › "}
          <Link href="/intelligence" className="hover:text-dark transition-colors">Intelligence</Link>
          {" › "}
          <Link href="/intelligence/advisors" className="hover:text-dark transition-colors">AI Advisors</Link>
          {" › "}
          <span className="text-dark">Run Critique</span>
        </p>
        <h1 className="text-3xl font-serif text-dark mb-1">Run Advisor Critique</h1>
        <p className="text-sm text-muted">
          Select one or more advisors, paste your content, and get specialist feedback.
        </p>
      </div>

      {/* ── Step 1: Select advisors ──────────────────────────────────────────── */}
      <div className="mb-7">
        <p className="text-[10px] font-semibold tracking-widest uppercase text-accent mb-1">
          Step 1
        </p>
        <h2 className="text-base font-serif text-dark mb-3">Select advisor(s)</h2>

        {advisors.length === 0 ? (
          <div className="border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted mb-2">No advisors in your panel yet.</p>
            <Link
              href="/intelligence/advisors/create"
              className="text-xs text-primary hover:underline"
            >
              Add your first advisor →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {advisors.map((advisor) => {
              const selected = selectedAdvisorIds.includes(advisor.id);
              return (
                <button
                  key={advisor.id}
                  onClick={() => toggleAdvisor(advisor.id)}
                  className={`text-left p-3 border transition-colors flex items-center gap-3 ${
                    selected
                      ? "border-primary/50 bg-teal-tint"
                      : "border-border bg-white hover:border-primary/20"
                  }`}
                >
                  <div
                    className="w-8 h-8 shrink-0 flex items-center justify-center text-white text-xs font-semibold"
                    style={{ backgroundColor: advisor.avatar_color }}
                  >
                    {advisor.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium leading-snug ${selected ? "text-primary" : "text-dark"}`}>
                      {advisor.name}
                    </p>
                    <p className="text-xs text-muted truncate">{advisor.specialty}</p>
                  </div>
                  {selected && (
                    <span className="ml-auto shrink-0 w-4 h-4 bg-primary flex items-center justify-center">
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Step 2: Content type ─────────────────────────────────────────────── */}
      <div className="mb-7">
        <p className="text-[10px] font-semibold tracking-widest uppercase text-accent mb-1">
          Step 2
        </p>
        <h2 className="text-base font-serif text-dark mb-3">Content type</h2>
        <div className="flex gap-2 flex-wrap">
          {CONTENT_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setContentType(t.value)}
              className={`px-4 py-2 text-sm border transition-colors ${
                contentType === t.value
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-dark border-border hover:border-primary/30"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Step 3: Content ──────────────────────────────────────────────────── */}
      <div className="mb-7">
        <p className="text-[10px] font-semibold tracking-widest uppercase text-accent mb-1">
          Step 3
        </p>
        <h2 className="text-base font-serif text-dark mb-3">Your content</h2>
        <div className="flex flex-col gap-3">
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject — e.g. Homepage hero copy, Welcome email, LinkedIn launch post"
            className="w-full border border-border px-3 py-2.5 text-sm text-dark placeholder:text-muted/60 focus:outline-none focus:border-primary"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste your content here, or describe what you want written..."
            rows={10}
            className="w-full border border-border px-3 py-2.5 text-sm text-dark placeholder:text-muted/50 focus:outline-none focus:border-primary resize-none"
          />
          <p className="text-xs text-muted">{content.length} characters</p>
        </div>
      </div>

      {/* ── Step 4: Audience temperature ────────────────────────────────────── */}
      <div className="mb-8">
        <p className="text-[10px] font-semibold tracking-widest uppercase text-accent mb-1">
          Step 4
        </p>
        <h2 className="text-base font-serif text-dark mb-3">Audience temperature</h2>
        <div className="flex gap-3">
          {AUDIENCE_TEMPS.map((t) => (
            <button
              key={t.value}
              onClick={() => setAudienceTemp(t.value)}
              className={`flex-1 p-3 border text-left transition-colors ${
                audienceTemp === t.value
                  ? "border-primary bg-teal-tint"
                  : "border-border bg-white hover:border-primary/20"
              }`}
            >
              <p className={`text-sm font-medium mb-0.5 ${audienceTemp === t.value ? "text-primary" : "text-dark"}`}>
                {t.label}
              </p>
              <p className="text-xs text-muted">{t.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Error + Run button ───────────────────────────────────────────────── */}
      {error && (
        <p className="text-sm text-accent border border-accent/20 bg-rust-tint px-3 py-2 mb-4">
          {error}
        </p>
      )}

      <button
        onClick={handleRun}
        disabled={running || advisors.length === 0}
        className="w-full py-3 bg-primary text-white text-sm font-medium hover:bg-primary-hover disabled:opacity-40 transition-colors mb-10"
      >
        {running
          ? `Running critique${selectedAdvisorIds.length > 1 ? "s" : ""}…`
          : `Run critique${selectedAdvisorIds.length > 1 ? "s" : ""}`}
      </button>

      {/* ── Results ──────────────────────────────────────────────────────────── */}
      {results.length > 0 && (
        <div className="flex flex-col gap-8">
          <div>
            <p className="text-[10px] font-semibold tracking-widest uppercase text-accent mb-1">
              Results
            </p>
            <h2 className="text-xl font-serif text-dark">
              {results.length} critique{results.length !== 1 ? "s" : ""} complete
            </h2>
          </div>

          {results.map((result) => (
            <CritiqueResultCard
              key={result.critiqueId || result.advisorId}
              result={result}
              onGenerateCopy={() => handleGenerateCopy(result.critiqueId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Critique result card ──────────────────────────────────────────────────────

function CritiqueResultCard({
  result,
  onGenerateCopy,
}: {
  result: CritiqueResult;
  onGenerateCopy: () => void;
}) {
  const { critiqueJson, generatedCopy, generatingCopy } = result;
  const [copyExpanded, setCopyExpanded] = useState(false);

  useEffect(() => {
    if (generatedCopy) setCopyExpanded(true);
  }, [generatedCopy]);

  if (critiqueJson.raw) {
    return (
      <div className="bg-white border border-border p-5">
        <AdvisorTag result={result} />
        <p className="text-sm text-dark leading-relaxed mt-3">{critiqueJson.raw}</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-border p-6">
      <AdvisorTag result={result} />

      {/* Key finding */}
      {critiqueJson.key_finding && (
        <div className="border-l-4 border-primary pl-4 my-4">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-1">
            Key finding
          </p>
          <p className="text-base font-medium text-dark leading-snug">
            {critiqueJson.key_finding}
          </p>
        </div>
      )}

      {/* Overall assessment */}
      {critiqueJson.overall_assessment && (
        <p className="text-sm text-dark leading-relaxed mb-5">
          {critiqueJson.overall_assessment}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 mb-5">
        {/* Strengths */}
        {critiqueJson.strengths && critiqueJson.strengths.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold tracking-widest uppercase text-olive mb-2">
              Strengths
            </p>
            <ul className="flex flex-col gap-1.5">
              {critiqueJson.strengths.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm text-dark">
                  <span className="text-olive shrink-0 mt-0.5">+</span>
                  <span className="leading-snug">{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Weaknesses */}
        {critiqueJson.weaknesses && critiqueJson.weaknesses.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold tracking-widest uppercase text-accent mb-2">
              Weaknesses
            </p>
            <ul className="flex flex-col gap-1.5">
              {critiqueJson.weaknesses.map((w, i) => (
                <li key={i} className="flex gap-2 text-sm text-dark">
                  <span className="text-accent shrink-0 mt-0.5">−</span>
                  <span className="leading-snug">{w}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Recommendations */}
      {critiqueJson.recommendations && critiqueJson.recommendations.length > 0 && (
        <div className="mb-5">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-3">
            Specific fixes
          </p>
          <div className="flex flex-col gap-3">
            {critiqueJson.recommendations.map((r, i) => (
              <div key={i} className="bg-light p-3">
                <p className="text-xs font-semibold text-accent mb-1">Issue: {r.issue}</p>
                <p className="text-sm text-dark leading-relaxed">Fix: {r.fix}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audience fit */}
      {critiqueJson.audience_fit && (
        <div className="border border-border p-3 mb-5">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-1">
            Audience fit
          </p>
          <p className="text-sm text-dark leading-relaxed">{critiqueJson.audience_fit}</p>
        </div>
      )}

      {/* Actions */}
      <div className="border-t border-border pt-4 flex items-center gap-3">
        <Link
          href={`/intelligence/advisors/${result.advisorId}`}
          className="text-xs text-muted hover:text-dark transition-colors"
        >
          View advisor profile →
        </Link>
        <div className="ml-auto flex gap-2">
          {!generatedCopy && result.critiqueId && (
            <button
              onClick={onGenerateCopy}
              disabled={generatingCopy}
              className="bg-primary text-white text-sm font-medium px-4 py-2 hover:bg-primary-hover disabled:opacity-40 transition-colors"
            >
              {generatingCopy ? "Generating…" : "Generate copy"}
            </button>
          )}
          {generatedCopy && (
            <button
              onClick={() => setCopyExpanded((v) => !v)}
              className="border border-border text-dark text-sm px-4 py-2 hover:border-primary/40 hover:text-primary transition-colors"
            >
              {copyExpanded ? "Hide copy" : "Show copy"}
            </button>
          )}
        </div>
      </div>

      {/* Generated copy */}
      {generatedCopy && copyExpanded && (
        <div className="mt-4 bg-light border border-border p-4">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-2">
            Generated copy — saved to copy log
          </p>
          <pre className="text-sm text-dark leading-relaxed whitespace-pre-wrap font-sans">
            {generatedCopy}
          </pre>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => navigator.clipboard.writeText(generatedCopy)}
              className="text-xs text-primary hover:underline"
            >
              Copy to clipboard
            </button>
            <Link
              href="/intelligence/advisors/copy-log"
              className="text-xs text-muted hover:text-dark"
            >
              View copy log →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function AdvisorTag({ result }: { result: CritiqueResult }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-7 h-7 shrink-0 flex items-center justify-center text-white text-xs font-semibold"
        style={{ backgroundColor: result.advisorColor }}
      >
        {result.advisorName.charAt(0).toUpperCase()}
      </div>
      <div>
        <p className="text-sm font-medium text-dark">{result.advisorName}</p>
      </div>
    </div>
  );
}

