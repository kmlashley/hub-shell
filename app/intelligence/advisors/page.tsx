import Link from "next/link";
import { getAdvisors } from "@/lib/advisors";
import { createServerClient } from "@/lib/supabase-server";
import { fmtRelative } from "@/lib/fmt-date";

const SUBJECT_TYPE_CONFIG: Record<string, { label: string; cls: string }> = {
  landing_page:      { label: "Landing Page",    cls: "bg-teal-tint text-primary" },
  email:             { label: "Email",            cls: "bg-purple-tint text-purple" },
  social_post:       { label: "Social Post",      cls: "bg-rust-tint text-accent" },
  offer_description: { label: "Offer",            cls: "bg-gold-tint text-gold" },
  other:             { label: "Other",            cls: "bg-light text-muted" },
};

export default async function AdvisorsPage() {
  const supabase = createServerClient();

  const [advisors, critiqueRes, copyRes, recentCritiquesRes] = await Promise.all([
    getAdvisors(),
    supabase.from("advisor_critiques").select("advisor_id, created_at").order("created_at", { ascending: false }),
    supabase.from("generated_copy").select("id", { count: "exact", head: true }),
    supabase
      .from("advisor_critiques")
      .select("id, subject, subject_type, created_at, advisors(name)")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const allCritiques = critiqueRes.data ?? [];
  const copyCount = copyRes.count ?? 0;
  const recentCritiques = recentCritiquesRes.data ?? [];

  // Build per-advisor stats
  const statsByAdvisor: Record<string, { count: number; lastAt: string | null }> = {};
  for (const c of allCritiques) {
    if (!statsByAdvisor[c.advisor_id]) {
      statsByAdvisor[c.advisor_id] = { count: 0, lastAt: null };
    }
    const s = statsByAdvisor[c.advisor_id];
    s.count += 1;
    if (!s.lastAt) s.lastAt = c.created_at;
  }

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
            <span className="text-dark">AI Advisors</span>
          </p>
          <h1 className="text-3xl font-serif text-dark mb-1">AI Advisor Panel</h1>
          <p className="text-sm text-muted max-w-lg">
            Your personal AI mentor team. Each advisor is a specialist persona you consult for copy and strategy feedback.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/intelligence/advisors/run"
            className="bg-primary text-white text-sm font-medium px-4 py-2 hover:bg-primary-hover transition-colors"
          >
            Run critique
          </Link>
          <Link
            href="/intelligence/advisors/create"
            className="border border-border text-dark text-sm font-medium px-4 py-2 hover:border-primary/40 hover:text-primary transition-colors"
          >
            + Add advisor
          </Link>
        </div>
      </div>

      {/* ── Stats strip ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        <div className="bg-white border border-border p-4">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-1">Advisors</p>
          <p className="text-3xl font-serif text-dark">{advisors.length}</p>
          <p className="text-xs text-muted mt-0.5">in your panel</p>
        </div>
        <div className="bg-white border border-border p-4">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-1">Critiques run</p>
          <p className="text-3xl font-serif text-dark">{allCritiques.length}</p>
          <p className="text-xs text-muted mt-0.5">total</p>
        </div>
        <div className="bg-white border border-border p-4">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-1">Copy generated</p>
          <p className="text-3xl font-serif text-dark">{copyCount}</p>
          <p className="text-xs text-muted mt-0.5">pieces</p>
        </div>
      </div>

      {/* ── Advisor grid ─────────────────────────────────────────────────────── */}
      <div className="mb-10">
        <p className="text-[10px] font-semibold tracking-widest uppercase text-accent mb-1">
          Your panel
        </p>
        <h2 className="text-xl font-serif text-dark mb-6">Advisors</h2>

        {advisors.length === 0 ? (
          <div className="border border-dashed border-border p-12 text-center">
            <p className="text-sm font-medium text-dark mb-1">No advisors yet</p>
            <p className="text-xs text-muted mb-4">
              Add your first advisor — a positioning expert, copywriter, or any specialist persona you want to consult.
            </p>
            <Link
              href="/intelligence/advisors/create"
              className="inline-block bg-primary text-white text-sm font-medium px-4 py-2 hover:bg-primary-hover transition-colors"
            >
              + Add first advisor
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {advisors.map((advisor) => {
              const stats = statsByAdvisor[advisor.id] ?? { count: 0, lastAt: null };
              return (
                <Link
                  key={advisor.id}
                  href={`/intelligence/advisors/${advisor.id}`}
                  className="bg-white border border-border p-5 hover:border-primary/30 hover:-translate-y-0.5 transition-all group block"
                >
                  <div className="flex items-start gap-4 mb-3">
                    {/* Avatar */}
                    <div
                      className="w-10 h-10 shrink-0 flex items-center justify-center text-white text-sm font-semibold"
                      style={{ backgroundColor: advisor.avatar_color }}
                    >
                      {advisor.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-serif text-sm font-medium text-dark leading-snug">
                        {advisor.name}
                      </p>
                      <p className="text-xs text-muted mt-0.5 leading-snug">{advisor.specialty}</p>
                    </div>
                  </div>

                  <p className="text-xs text-muted leading-relaxed line-clamp-2 mb-4 pl-14">
                    {advisor.system_prompt.slice(0, 120)}
                    {advisor.system_prompt.length > 120 ? "…" : ""}
                  </p>

                  <div className="flex items-center justify-between text-xs text-muted border-t border-border pt-3">
                    <span>
                      {stats.count} critique{stats.count !== 1 ? "s" : ""}
                      {stats.lastAt ? ` · last ${fmtRelative(stats.lastAt)}` : ""}
                    </span>
                    <span className="text-accent group-hover:underline">View profile →</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Recent critiques ─────────────────────────────────────────────────── */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] font-semibold tracking-widest uppercase text-accent mb-1">
              Recent activity
            </p>
            <h2 className="text-xl font-serif text-dark">Latest critiques</h2>
          </div>
          <Link href="/intelligence/advisors/critiques" className="text-xs text-primary hover:underline">
            View all →
          </Link>
        </div>

        {recentCritiques.length === 0 ? (
          <div className="border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted">No critiques run yet.</p>
            <p className="text-xs text-muted mt-1">
              <Link href="/intelligence/advisors/run" className="text-primary hover:underline">
                Run your first critique →
              </Link>
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {recentCritiques.map((c) => {
              const advisorName =
                c.advisors && typeof c.advisors === "object" && "name" in c.advisors
                  ? (c.advisors as { name: string }).name
                  : "Unknown";
              const typeConf = SUBJECT_TYPE_CONFIG[c.subject_type] ?? SUBJECT_TYPE_CONFIG.other;
              return (
                <div
                  key={c.id}
                  className="bg-white border border-border p-4 flex items-center gap-4"
                >
                  <span className={`text-[10px] font-semibold px-2 py-0.5 shrink-0 ${typeConf.cls}`}>
                    {typeConf.label}
                  </span>
                  <p className="text-sm text-dark flex-1 leading-snug line-clamp-1">
                    {c.subject}
                  </p>
                  <span className="text-xs text-muted shrink-0">{advisorName}</span>
                  <span className="text-xs text-muted shrink-0">{fmtRelative(c.created_at)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Copy log teaser ──────────────────────────────────────────────────── */}
      <div className="bg-white border border-border p-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-dark mb-0.5">Copy Log</p>
          <p className="text-xs text-muted">
            {copyCount > 0
              ? `${copyCount} piece${copyCount !== 1 ? "s" : ""} of copy generated by your advisor panel.`
              : "No copy generated yet. Run a critique and generate copy from the results."}
          </p>
        </div>
        <Link
          href="/intelligence/advisors/copy-log"
          className="text-xs text-primary hover:underline shrink-0 ml-6"
        >
          View copy log →
        </Link>
      </div>
    </div>
  );
}
