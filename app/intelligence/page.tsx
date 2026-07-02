import Link from "next/link";
import { getAgentStates, AgentState, AgentStatus } from "@/lib/agent-state";
import { getMentors, formatMentorDate, MENTOR_BATCH_TOTAL } from "@/lib/mentors";
import { getAdvisorPanelStats } from "@/lib/advisors";
import { createServerClient } from "@/lib/supabase-server";
import { fmtRelative } from "@/lib/fmt-date";

// ─── Content pillars — update quarterly ──────────────────────────────────────
const PILLARS = [
  {
    num: "01",
    name: "The Thinking Comes First",
    desc: "The case for human judgment before AI involvement — in assignments, workflows, hiring, and decisions.",
  },
  {
    num: "02",
    name: "What AI Can't Do",
    desc: "Concrete, non-alarmist exploration of AI's actual limits — where human capability is irreplaceable.",
  },
  {
    num: "03",
    name: "Build Something",
    desc: "Practical, demonstration-forward content showing what it actually looks like to make something with AI.",
  },
  {
    num: "04",
    name: "The Map, Not the Answer",
    desc: "Content that names and normalizes uncertainty — orienting people without pretending the path is clear.",
  },
];

// ─── Update these weekly ──────────────────────────────────────────────────────
const OPPORTUNITIES = [
  {
    title: "Update this weekly with your top opportunity",
    agent: "Content Researcher",
    pillar: "Pillar 01",
  },
  {
    title: "Second top opportunity this week",
    agent: "SEO / AEO Researcher",
    pillar: "Pillar 02",
  },
  {
    title: "Third top opportunity this week",
    agent: "Competitive Analyzer",
    pillar: "Pillar 03",
  },
];

const WHATS_WORKING = [
  { channel: "Substack", finding: "Update this weekly with what's working and a stat or finding." },
  { channel: "YouTube", finding: "Second finding — what performed well this week." },
  { channel: "LinkedIn", finding: "Third finding — a win, a trend, or an engagement insight." },
];

const CHANNEL_COLORS: Record<string, string> = {
  Substack: "bg-gold-tint text-gold",
  YouTube: "bg-rust-tint text-accent",
  LinkedIn: "bg-teal-tint text-primary",
  Newsletter: "bg-gold-tint text-gold",
  Website: "bg-olive-tint text-olive",
};

const KILL_LIST = [
  {
    title: "Add what isn't working here",
    reason: "Explain why you're killing it and what you'll do instead.",
  },
  {
    title: "A content format, platform, or strategy to cut",
    reason: "The specific reason — low ROI, audience mismatch, or strategic misalignment.",
  },
];

// ─── Quick-run links ──────────────────────────────────────────────────────────
const QUICK_RUNS = [
  { label: "Content research",   href: "/content/keyword-research" },
  { label: "Competitor analysis", href: "/content/competitive-research" },
  { label: "SEO research",       href: "/content/seo-research" },
  { label: "AI visibility audit", href: "/content/aeo-geo-audit" },
  { label: "Substack research",  href: "/content/substack-research" },
  { label: "Run advisor critique", href: "/intelligence/advisors/run" },
];

// ─── Agent roster ─────────────────────────────────────────────────────────────
const AGENTS = [
  {
    key: "content-researcher",
    displayName: "Content Researcher",
    persona: "Claude",
    desc: "Deep topic research before writing. Surfaces angles, sources, and competitive positioning for any topic.",
    href: "/content/research",
    crossPillar: null,
  },
  {
    key: "seo-aeo-researcher",
    displayName: "SEO / AEO Researcher",
    persona: "Claude",
    desc: "Real keyword data and answer engine optimization insights — no LLM-imagined search data.",
    href: "/content/seo",
    crossPillar: null,
  },
  {
    key: "competitive-analyzer",
    displayName: "Competitive Analyzer",
    persona: "Claude",
    desc: "Weekly competitor intelligence — what they're publishing, how it's performing, where the gaps are.",
    href: "/content/competitive",
    crossPillar: null,
  },
  {
    key: "content-gap-synthesizer",
    displayName: "Content Gap Synthesizer",
    persona: "Claude",
    desc: "Synthesizes all research into the top content opportunities each week.",
    href: "/content/intelligence",
    crossPillar: null,
  },
  {
    key: "substack-researcher",
    displayName: "Substack Researcher",
    persona: "Claude",
    desc: "Newsletter performance analysis — what's growing, what's resonating, and how you compare to peers.",
    href: "/content/newsletter",
    crossPillar: null,
  },
  {
    key: "youtube-researcher",
    displayName: "YouTube Researcher",
    persona: "Claude",
    desc: "Video performance data, trending topics, and deep competitive research on channels in your space.",
    href: "/content/youtube",
    crossPillar: null,
  },
  {
    key: "offer-intel",
    displayName: "Offer Intel",
    persona: "Claude",
    desc: "Competitor offer ecosystems, pricing analysis, and positioning gaps — tells you what to build next.",
    href: "/business/offers",
    crossPillar: "Feeds Business",
  },
  {
    key: "technical-verifier",
    displayName: "Technical Verifier",
    persona: "Claude",
    desc: "Catches outdated info, wrong commands, and broken claims before they ship to your audience.",
    href: "/content/verify",
    crossPillar: null,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: AgentStatus }) {
  const styles: Record<AgentStatus, string> = {
    fresh:   "bg-olive-tint text-olive",
    stale:   "bg-gold-tint text-gold",
    idle:    "bg-border text-muted",
    planned: "bg-teal-tint text-primary",
  };
  const labels: Record<AgentStatus, string> = {
    fresh:   "Fresh",
    stale:   "Stale",
    idle:    "Idle",
    planned: "Planned",
  };
  return (
    <span className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function MentorStatusBadge({ status }: { status: "active" | "extracted" | "collecting" }) {
  const styles = {
    active:    "bg-olive-tint text-olive",
    extracted: "bg-gold-tint text-gold",
    collecting:"bg-border text-muted",
  };
  const labels = {
    active:    "Active",
    extracted: "Extracted",
    collecting:"Collecting",
  };
  return (
    <span className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function nextMondayAt8(): string {
  const now = new Date();
  const day = now.getDay();
  const daysUntil = day === 0 ? 1 : 8 - day;
  const d = new Date(now);
  d.setDate(now.getDate() + daysUntil);
  d.setHours(8, 0, 0, 0);
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) + " at 8:00 AM";
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function IntelligencePage() {
  const supabase = createServerClient();
  const [agentStates, mentors, advisorStats, briefsRes] = await Promise.all([
    getAgentStates(AGENTS.map((a) => a.key)),
    getMentors(),
    getAdvisorPanelStats(),
    supabase
      .from("agent_outputs")
      .select("id, title, output_type, created_at, metadata")
      .eq("status", "ready")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);
  const latestBriefs = briefsRes.data ?? [];

  const todayStr = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="max-w-5xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="text-xs text-muted mb-2">
            <Link href="/" className="hover:text-dark transition-colors">Dashboard</Link>
            {" › "}
            <span className="text-dark">Intelligence</span>
          </p>
          <h1 className="text-3xl font-serif text-dark mb-1">Intelligence</h1>
          <p className="text-sm text-muted max-w-lg">
            Research synthesis across all agents. What&apos;s working, what&apos;s coming, what needs to die.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <span className="w-2 h-2 rounded-full bg-olive inline-block" />
            <span className="text-xs text-muted">Last synthesized {todayStr}</span>
            <span className="text-[10px] font-semibold tracking-wider uppercase bg-teal-tint text-primary px-2 py-0.5">
              Weekly review
            </span>
          </div>
        </div>
        <button className="bg-primary text-white text-sm font-medium px-4 py-2 hover:bg-primary-hover transition-colors shrink-0">
          Run new synthesis
        </button>
      </div>

      {/* ── Quick-run strip ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 mb-8">
        {QUICK_RUNS.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            className="text-xs font-medium border border-border px-3 py-1.5 text-dark/70 hover:text-primary hover:border-primary/40 transition-colors"
          >
            {r.label} →
          </Link>
        ))}
      </div>

      {/* ── Latest briefs ───────────────────────────────────────────────────── */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] font-semibold tracking-widest uppercase text-accent mb-1">
              Needs your attention
            </p>
            <h2 className="text-xl font-serif text-dark">Latest research briefs</h2>
          </div>
          <Link href="/review" className="text-xs text-primary hover:underline">
            Open review queue →
          </Link>
        </div>

        {latestBriefs.length === 0 ? (
          <div className="border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted">No briefs pending review.</p>
            <p className="text-xs text-muted mt-1">
              Run a research agent to generate new output.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {latestBriefs.map((brief) => {
              const source =
                typeof brief.metadata?.source === "string"
                  ? (brief.metadata.source as string).replace(/_/g, " ")
                  : "Agent";
              return (
                <Link
                  key={brief.id}
                  href={`/review/${brief.id}`}
                  className="bg-white border border-border p-4 flex items-center gap-4 hover:border-primary/30 transition-colors group"
                >
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 shrink-0 ${
                      brief.output_type === "brief"
                        ? "bg-teal-tint text-primary"
                        : brief.output_type === "research"
                        ? "bg-olive-tint text-olive"
                        : brief.output_type === "analysis"
                        ? "bg-gold-tint text-gold"
                        : "bg-light text-muted"
                    }`}
                  >
                    {brief.output_type}
                  </span>
                  <p className="text-sm font-medium text-dark flex-1 leading-snug line-clamp-1">
                    {brief.title ?? "Untitled"}
                  </p>
                  <span className="text-xs text-muted shrink-0">{source}</span>
                  <span className="text-xs text-muted shrink-0">
                    {fmtRelative(brief.created_at)}
                  </span>
                  <span className="text-xs text-accent group-hover:underline shrink-0">
                    Review →
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Synthesis block ─────────────────────────────────────────────────── */}
      <div className="border border-border bg-gradient-to-br from-white to-light p-6 mb-10">

        {/* Pillars */}
        <p className="text-[10px] font-semibold tracking-widest uppercase text-accent mb-2">
          Content pillars this quarter
        </p>
        <h2 className="text-xl font-serif text-dark mb-5">
          Four themes. Everything maps to one of these.
        </h2>
        <div className="grid grid-cols-4 gap-3 mb-8">
          {PILLARS.map((p) => (
            <div key={p.num} className="bg-white border border-border p-4">
              <p className="font-serif text-2xl text-accent/30 mb-2 leading-none">{p.num}</p>
              <p className="font-serif text-sm text-dark mb-2 leading-snug">{p.name}</p>
              <p className="text-xs text-muted leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>

        {/* Opportunities + What's working */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div>
            <p className="text-[10px] font-semibold tracking-widest uppercase text-accent mb-3">
              Top opportunities this week
            </p>
            <div className="flex flex-col gap-2">
              {OPPORTUNITIES.map((opp, i) => (
                <div key={i} className="bg-white border border-border p-3 flex gap-3">
                  <span className="font-serif text-xl text-accent/30 shrink-0 w-6 text-center leading-none pt-0.5">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-dark leading-snug">{opp.title}</p>
                    <p className="text-xs text-muted mt-0.5">{opp.agent} · {opp.pillar}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-semibold tracking-widest uppercase text-accent mb-3">
              What&apos;s working
            </p>
            <div className="flex flex-col gap-2">
              {WHATS_WORKING.map((w, i) => (
                <div key={i} className="bg-white border border-border p-3 flex gap-3 items-start">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 shrink-0 mt-0.5 ${CHANNEL_COLORS[w.channel] ?? "bg-border text-muted"}`}>
                    {w.channel}
                  </span>
                  <p className="text-sm text-dark">{w.finding}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Kill list */}
        <div className="border border-dashed border-accent/40 p-4">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-accent mb-3">
            What needs to die
          </p>
          <div className="flex flex-col gap-2">
            {KILL_LIST.map((k, i) => (
              <div key={i} className="flex gap-3 items-start">
                <span className="text-accent font-bold text-sm shrink-0 leading-none mt-0.5">×</span>
                <div>
                  <p className="text-sm font-medium text-dark">{k.title}</p>
                  <p className="text-xs text-muted">{k.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Research agents ─────────────────────────────────────────────────── */}
      <div className="mb-10">
        <p className="text-[10px] font-semibold tracking-widest uppercase text-accent mb-1">
          The research layer
        </p>
        <h2 className="text-xl font-serif text-dark mb-1">Agents that feed the synthesis</h2>
        <p className="text-sm text-muted mb-6">
          Click any agent to see its full report. Claude pulls from all of these on Monday mornings.
        </p>

        <div className="grid grid-cols-2 gap-4">
          {AGENTS.map((agent) => {
            const state: AgentState | undefined = agentStates[agent.key];
            const status: AgentStatus = state?.status ?? "idle";

            return (
              <Link
                key={agent.key}
                href={agent.href}
                className="bg-white border border-border p-5 hover:border-primary/30 hover:-translate-y-0.5 transition-all group block"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0 mr-2">
                    <span className="font-serif text-sm font-medium text-dark">{agent.displayName}</span>
                    {" "}
                    <span className="text-xs text-muted italic">({agent.persona})</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {agent.crossPillar && (
                      <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 bg-purple-tint text-purple">
                        {agent.crossPillar}
                      </span>
                    )}
                    <StatusBadge status={status} />
                  </div>
                </div>

                <p className="text-xs text-muted mb-3 leading-relaxed">{agent.desc}</p>

                <div className={`border-l-2 pl-3 mb-3 ${state?.latestTitle ? "border-accent" : "border-border"}`}>
                  <p className={`text-[10px] font-semibold tracking-wider uppercase mb-0.5 ${state?.latestTitle ? "text-accent" : "text-muted"}`}>
                    Latest
                  </p>
                  <p className={`text-xs ${state?.latestTitle ? "text-dark" : "text-muted italic"}`}>
                    {state?.latestTitle ?? "No outputs yet"}
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs text-muted border-t border-border pt-3">
                  <span>
                    {state?.lastRun
                      ? `Last run ${new Date(state.lastRun).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                      : "Never run"}
                    {state?.outputCount ? ` · ${state.outputCount} output${state.outputCount !== 1 ? "s" : ""}` : ""}
                  </span>
                  <span className="text-accent group-hover:underline">View full report →</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── AI Advisors panel ───────────────────────────────────────────────── */}
      <div className="mb-10">
        <p className="text-[10px] font-semibold tracking-widest uppercase text-accent mb-1">
          The advisor layer
        </p>
        <h2 className="text-xl font-serif text-dark mb-6">AI Advisor Panel</h2>

        <div className="bg-white border border-border p-6 flex items-start justify-between gap-8">
          <div className="flex gap-8">
            <div>
              <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-1">
                Advisors
              </p>
              <p className="text-3xl font-serif text-dark">{advisorStats.advisorCount}</p>
              <p className="text-xs text-muted mt-0.5">configured</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-1">
                Last critique
              </p>
              <p className="text-sm font-medium text-dark mt-1.5">
                {advisorStats.lastCritiqueAt
                  ? fmtRelative(advisorStats.lastCritiqueAt)
                  : "Never run"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-1">
                Copy generated
              </p>
              <p className="text-3xl font-serif text-dark">{advisorStats.copyCount}</p>
              <p className="text-xs text-muted mt-0.5">pieces</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            <Link
              href="/intelligence/advisors/run"
              className="bg-primary text-white text-sm font-medium px-4 py-2 hover:bg-primary-hover transition-colors text-center"
            >
              Run critique
            </Link>
            <Link
              href="/intelligence/advisors"
              className="border border-border text-dark text-sm px-4 py-2 hover:border-primary/40 hover:text-primary transition-colors text-center"
            >
              Manage advisors →
            </Link>
          </div>
        </div>
      </div>

      {/* ── Advisory layer ──────────────────────────────────────────────────── */}
      <div className="mb-10">
        <p className="text-[10px] font-semibold tracking-widest uppercase text-accent mb-1">
          The advisory layer
        </p>
        <h2 className="text-xl font-serif text-dark mb-6">
          Mentors that pressure-test your decisions
        </h2>

        {mentors.length === 0 ? (
          <div className="border border-dashed border-border p-10 text-center">
            <p className="text-sm text-dark mb-1 font-medium">No mentors added yet</p>
            <p className="text-xs text-muted">
              Seed the <code className="font-mono text-dark text-[11px]">mentors</code> table in Supabase to populate this section.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {mentors.map((mentor) => (
              <Link
                key={mentor.id}
                href={`/intelligence/mentors/${mentor.slug}`}
                className="bg-white border border-border p-5 hover:border-primary/30 hover:-translate-y-0.5 transition-all group block"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0 mr-2">
                    <span className="font-serif text-sm font-medium text-dark">{mentor.name}</span>
                    {" "}
                    <span className="text-xs text-muted italic">({mentor.agent_name})</span>
                  </div>
                  <MentorStatusBadge status={mentor.status} />
                </div>

                <p className="text-xs text-muted mb-1">{mentor.domain}</p>
                <p className="text-xs text-muted mb-3">
                  {mentor.source_count} source{mentor.source_count !== 1 ? "s" : ""} · {mentor.batches_complete}/{MENTOR_BATCH_TOTAL} batches complete
                </p>

                <div className={`border-l-2 pl-3 mb-3 ${mentor.worldview ? "border-accent" : "border-border"}`}>
                  <p className={`text-xs leading-relaxed ${mentor.worldview ? "text-dark" : "text-muted italic"}`}>
                    {mentor.worldview
                      ? mentor.worldview.slice(0, 150) + (mentor.worldview.length > 150 ? "…" : "")
                      : "Worldview not yet extracted"}
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs text-muted border-t border-border pt-3">
                  <span>
                    Last refreshed {formatMentorDate(mentor.last_updated)} · {mentor.refresh_cadence}
                  </span>
                  <span className="text-accent group-hover:underline">View profile →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── Next run banner ─────────────────────────────────────────────────── */}
      <div className="bg-navy p-6 flex items-center justify-between">
        <p className="text-sm text-white/80">
          Next weekly synthesis:{" "}
          <span className="text-white font-medium">{nextMondayAt8()}.</span>
          {" "}Claude will re-run all agents and refresh this page.
        </p>
        <button className="border border-white/30 text-white text-sm px-4 py-2 hover:bg-white/10 transition-colors shrink-0 ml-6">
          Run now instead →
        </button>
      </div>
    </div>
  );
}
