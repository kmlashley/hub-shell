import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdvisorById, getCritiquesForAdvisor } from "@/lib/advisors";
import { createServerClient } from "@/lib/supabase-server";
import { fmtRelative, fmtDate } from "@/lib/fmt-date";
import { DeleteAdvisorButton } from "./DeleteAdvisorButton";

const SUBJECT_TYPE_CONFIG: Record<string, { label: string; cls: string }> = {
  landing_page:      { label: "Landing Page",    cls: "bg-teal-tint text-primary" },
  email:             { label: "Email",            cls: "bg-purple-tint text-purple" },
  social_post:       { label: "Social Post",      cls: "bg-rust-tint text-accent" },
  offer_description: { label: "Offer",            cls: "bg-gold-tint text-gold" },
  other:             { label: "Other",            cls: "bg-light text-muted" },
};

function topSubjectTypes(
  critiques: Array<{ subject_type: string }>
): Array<{ type: string; count: number }> {
  const counts: Record<string, number> = {};
  for (const c of critiques) {
    counts[c.subject_type] = (counts[c.subject_type] ?? 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type, count]) => ({ type, count }));
}

function extractKeyFinding(critiqueJson: Record<string, unknown>): string {
  const keys = ["key_finding", "summary", "headline", "main_finding", "opening"];
  for (const k of keys) {
    if (typeof critiqueJson[k] === "string" && critiqueJson[k]) {
      return (critiqueJson[k] as string).slice(0, 140);
    }
  }
  for (const v of Object.values(critiqueJson)) {
    if (typeof v === "string" && v) return v.slice(0, 140);
  }
  return "";
}

export default async function AdvisorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServerClient();

  const [advisor, critiques, copyRes] = await Promise.all([
    getAdvisorById(id),
    getCritiquesForAdvisor(id),
    supabase
      .from("generated_copy")
      .select("id", { count: "exact", head: true })
      .eq("advisor_id", id),
  ]);

  if (!advisor) notFound();

  const copyCount = copyRes.count ?? 0;
  const topTypes = topSubjectTypes(critiques);

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
            <span className="text-dark">{advisor.name}</span>
          </p>
          <div className="flex items-center gap-4 mb-2">
            <div
              className="w-12 h-12 shrink-0 flex items-center justify-center text-white text-lg font-semibold"
              style={{ backgroundColor: advisor.avatar_color }}
            >
              {advisor.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-3xl font-serif text-dark leading-tight">{advisor.name}</h1>
              <p className="text-sm text-muted mt-0.5">{advisor.specialty}</p>
            </div>
          </div>
        </div>
        <Link
          href={`/intelligence/advisors/run?advisor=${id}`}
          className="bg-primary text-white text-sm font-medium px-4 py-2 hover:bg-primary-hover transition-colors shrink-0"
        >
          Run critique
        </Link>
      </div>

      {/* ── Stats + system prompt ────────────────────────────────────────────── */}
      <div className="grid grid-cols-[1fr_280px] gap-6 mb-10">

        {/* System prompt */}
        <div className="bg-white border border-border p-5">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-3">
            Persona instructions
          </p>
          <p className="text-sm text-dark leading-relaxed whitespace-pre-wrap font-mono">
            {advisor.system_prompt}
          </p>
        </div>

        {/* Stats */}
        <div className="flex flex-col gap-4">
          <div className="bg-white border border-border p-4">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-1">
              Total critiques
            </p>
            <p className="text-3xl font-serif text-dark">{critiques.length}</p>
          </div>

          <div className="bg-white border border-border p-4">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-1">
              Copy generated
            </p>
            <p className="text-3xl font-serif text-dark">{copyCount}</p>
            {copyCount > 0 && (
              <Link
                href="/intelligence/advisors/copy-log"
                className="text-xs text-primary hover:underline mt-1 block"
              >
                View copy log →
              </Link>
            )}
          </div>

          {topTypes.length > 0 && (
            <div className="bg-white border border-border p-4">
              <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-3">
                Most critiqued
              </p>
              <div className="flex flex-col gap-2">
                {topTypes.map(({ type, count }) => {
                  const conf = SUBJECT_TYPE_CONFIG[type] ?? SUBJECT_TYPE_CONFIG.other;
                  return (
                    <div key={type} className="flex items-center justify-between">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 ${conf.cls}`}>
                        {conf.label}
                      </span>
                      <span className="text-xs text-muted">{count}×</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-white border border-border p-4">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-1">
              Added
            </p>
            <p className="text-sm text-dark">{fmtDate(advisor.created_at)}</p>
          </div>
        </div>
      </div>

      {/* ── Run history ─────────────────────────────────────────────────────── */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] font-semibold tracking-widest uppercase text-accent mb-1">
              Run history
            </p>
            <h2 className="text-xl font-serif text-dark">
              All critiques by {advisor.name}
            </h2>
          </div>
          {critiques.length > 0 && (
            <Link
              href={`/intelligence/advisors/run?advisor=${id}`}
              className="text-xs text-primary hover:underline"
            >
              Run another →
            </Link>
          )}
        </div>

        {critiques.length === 0 ? (
          <div className="border border-dashed border-border p-10 text-center">
            <p className="text-sm text-dark mb-1 font-medium">No critiques yet</p>
            <p className="text-xs text-muted mb-4">
              Run this advisor on a piece of content to see results here.
            </p>
            <Link
              href={`/intelligence/advisors/run?advisor=${id}`}
              className="inline-block bg-primary text-white text-sm font-medium px-4 py-2 hover:bg-primary-hover transition-colors"
            >
              Run first critique →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {critiques.map((critique) => {
              const typeConf =
                SUBJECT_TYPE_CONFIG[critique.subject_type] ?? SUBJECT_TYPE_CONFIG.other;
              const keyFinding = extractKeyFinding(critique.critique_json);
              return (
                <div
                  key={critique.id}
                  className="bg-white border border-border p-4"
                >
                  <div className="flex items-start gap-3 mb-2">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 shrink-0 mt-0.5 ${typeConf.cls}`}>
                      {typeConf.label}
                    </span>
                    <p className="text-sm font-medium text-dark flex-1 leading-snug">
                      {critique.subject}
                    </p>
                    <span className="text-xs text-muted shrink-0">
                      {fmtRelative(critique.created_at)}
                    </span>
                  </div>
                  {keyFinding && (
                    <p className="text-xs text-muted leading-relaxed pl-[calc(theme(spacing.2)+theme(spacing.px)+3.5ch+theme(spacing.3))]">
                      {keyFinding}{keyFinding.length === 140 ? "…" : ""}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Delete ───────────────────────────────────────────────────────────── */}
      <div className="border border-dashed border-border p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-dark">Remove this advisor</p>
          <p className="text-xs text-muted mt-0.5">
            Deletes the advisor and all their critiques. This cannot be undone.
          </p>
        </div>
        <DeleteAdvisorButton advisorId={id} advisorName={advisor.name} />
      </div>
    </div>
  );
}

