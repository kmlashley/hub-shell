import Link from "next/link";

// ─── Data ──────────────────────────────────────────────────────────────────────
// Update these arrays as you add agents, tables, or integrations.

const AGENTS = [
  {
    name: "Keyword Research",
    route: "/api/research/keyword",
    trigger: "On demand",
    produces: "Keyword clusters with intent, difficulty, and content angles",
    output: "research_reports",
  },
  {
    name: "Competitive Research",
    route: "/api/research/competitive",
    trigger: "On demand",
    produces: "Competitor positioning, content gaps, and differentiation opportunities",
    output: "research_reports",
  },
  {
    name: "Content Trends",
    route: "/api/research/content-trends",
    trigger: "On demand",
    produces: "Trending topics, emerging angles, and content timing signals",
    output: "research_reports",
  },
  {
    name: "Audience Research",
    route: "/api/research/audience",
    trigger: "On demand",
    produces: "Audience pain points, language patterns, and desire map",
    output: "research_reports",
  },
  {
    name: "Research Orchestrator",
    route: "/api/research/run-all",
    trigger: "On demand / Vercel cron",
    produces: "Runs all 4 research agents then synthesizes into review queue",
    output: "agent_outputs",
  },
  {
    name: "Post Scorer",
    route: "/api/content/post-scorer",
    trigger: "On demand",
    produces: "Grade + 5 dimension scores + top 3 fixes + rewrite suggestions",
    output: "post_scores",
  },
  {
    name: "SEO Research",
    route: "/api/content/seo-research",
    trigger: "On demand",
    produces: "Top-ranking content, keyword opportunities, quick wins",
    output: "seo_research_runs",
  },
  {
    name: "AI Visibility Audit",
    route: "/api/content/aeo-geo-audit",
    trigger: "On demand",
    produces: "Visibility scores per AI engine, gaps, fix list",
    output: "aeo_audit_runs",
  },
  {
    name: "Substack Researcher",
    route: "/api/content/substack-research",
    trigger: "On demand",
    produces: "Publication summary, content patterns, gaps, Notes analysis",
    output: "substack_research_runs",
  },
  {
    name: "YouTube Researcher",
    route: "/api/content/youtube-research",
    trigger: "On demand",
    produces: "Channel/topic analysis, top videos, content gaps",
    output: "youtube_research_runs",
  },
  {
    name: "Competitive Research (Content)",
    route: "/api/content/competitive-research",
    trigger: "On demand",
    produces: "Competitor brief: positioning, themes, gaps, recommended moves",
    output: "competitive_research_runs",
  },
  {
    name: "Offer Intelligence",
    route: "/api/content/offer-intel",
    trigger: "On demand",
    produces: "Offer landscape map, positioning patterns, differentiation angles",
    output: "offer_intel_runs",
  },
  {
    name: "Technical Verifier",
    route: "/api/content/technical-verifier",
    trigger: "On demand",
    produces: "Fact-check report: verified claims, flagged claims, corrections",
    output: "verification_runs",
  },
  {
    name: "Internal Linker",
    route: "/api/content/internal-linker",
    trigger: "On demand",
    produces: "Internal link suggestions mapped to your published content",
    output: "None (returned inline)",
  },
  {
    name: "Social Post Generator",
    route: "/api/distribution/social-post",
    trigger: "On demand",
    produces: "Platform-native social variants (LinkedIn, X, Instagram, Substack Note)",
    output: "social_queue_posts",
  },
  {
    name: "AI Chat",
    route: "/api/chat",
    trigger: "On demand (streaming)",
    produces: "Contextual business advice, content help, analysis",
    output: "chat_messages",
  },
];

const INTEGRATIONS = [
  {
    name: "Anthropic API",
    env: "ANTHROPIC_API_KEY",
    purpose: "Powers all AI agents. Research agents use claude-sonnet-4-6; synthesis uses claude-opus-4-8.",
    required: true,
  },
  {
    name: "Supabase",
    env: "NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY",
    purpose: "Primary database. Stores all hub data. Server routes use the service role key.",
    required: true,
  },
  {
    name: "Firecrawl",
    env: "FIRECRAWL_API_KEY",
    purpose: "Web scraping for competitor pages, Substack publications, landing pages.",
    required: false,
  },
  {
    name: "Tavily",
    env: "TAVILY_API_KEY",
    purpose: "Real-time web search for research agents. 1,000 free searches/month.",
    required: false,
  },
  {
    name: "YouTube Data API",
    env: "YOUTUBE_API_KEY + YOUTUBE_CHANNEL_ID",
    purpose: "Channel stats and video data for YouTube Research agent.",
    required: false,
  },
  {
    name: "LinkedIn API",
    env: "LINKEDIN_ACCESS_TOKEN",
    purpose: "Social publishing via the Distribution layer.",
    required: false,
  },
  {
    name: "Stripe",
    env: "STRIPE_SECRET_KEY",
    purpose: "Revenue tracking and payment data for Financial pages.",
    required: false,
  },
  {
    name: "Email Platform (Bento / Kit)",
    env: "BENTO_SITE_UUID or CONVERTKIT_API_KEY",
    purpose: "Subscriber data, sequence stats, and broadcast metrics.",
    required: false,
  },
];

const DB_TABLES = [
  { name: "notes", description: "General hub notes — tagged, searchable" },
  { name: "research_reports", description: "Raw output from L1 research agents (keyword, competitive, trends, audience)" },
  { name: "agent_outputs", description: "Review queue — everything agents produce lands here before you see it" },
  { name: "post_scores", description: "Post Scorer results with dimension breakdowns and fixes" },
  { name: "keyword_research_runs", description: "Keyword Research tool history" },
  { name: "seo_research_runs", description: "SEO Research tool history" },
  { name: "aeo_audit_runs", description: "AI Visibility Audit history" },
  { name: "substack_research_runs", description: "Substack Researcher history" },
  { name: "youtube_research_runs", description: "YouTube Research history" },
  { name: "competitive_research_runs", description: "Competitive Research (Content) history" },
  { name: "offer_intel_runs", description: "Offer Intelligence history" },
  { name: "verification_runs", description: "Technical Verifier history" },
  { name: "youtube_scripts", description: "YouTube scripts with status pipeline" },
  { name: "published_content", description: "Published content tracker — blog, video, newsletter" },
  { name: "content_metrics", description: "Performance data per published piece" },
  { name: "substack_notes", description: "Substack Notes drafts and publishing tracker" },
  { name: "notes_bank", description: "Saved hooks, one-liners, and observations" },
  { name: "feed_sources", description: "Substack publications tracked in Community Feed" },
  { name: "feed_items", description: "Scraped posts from tracked publications" },
  { name: "clients", description: "Client profiles and contact info" },
  { name: "client_notes", description: "Notes per client" },
  { name: "projects", description: "Projects with status, dates, and client linkage" },
  { name: "calendar_items", description: "Content calendar entries by platform and status" },
  { name: "saved_prompts", description: "Prompt Library — saved Claude prompts with tags" },
  { name: "revenue_entries", description: "Revenue log by stream" },
  { name: "expense_entries", description: "Expense log by category" },
  { name: "offers", description: "Offer portfolio — products, services, memberships" },
  { name: "email_sequences", description: "Email sequence tracker" },
  { name: "sequence_emails", description: "Individual emails within a sequence" },
  { name: "campaigns", description: "Launch and promo campaign tracker" },
  { name: "funnels", description: "Customer journey maps" },
  { name: "funnel_stages", description: "Stages within a funnel" },
  { name: "growth_snapshots", description: "Follower/subscriber count snapshots by platform" },
  { name: "distribution_posts", description: "Social posts queued for distribution" },
  { name: "quick_links", description: "Personal link hub" },
  { name: "chat_conversations", description: "AI Chat conversation list" },
  { name: "chat_messages", description: "AI Chat message history per conversation" },
  { name: "social_queue_posts", description: "AI-generated social posts awaiting approval" },
  { name: "notebooks", description: "NotebookLM and research notebook references" },
];

const DATA_FLOWS = [
  {
    label: "Research Pipeline",
    flow: "Run All Agents → research_reports → Synthesizer → agent_outputs → Review Queue → Approved → Intelligence Hub",
  },
  {
    label: "Content Creation",
    flow: "Research run → Note or draft → Post Scorer → Review → Published Content Tracker",
  },
  {
    label: "Social Publishing",
    flow: "Source content → Social Post Generator → social_queue_posts → Social Queue (approve) → distribution_posts → Distribution",
  },
  {
    label: "AI Chat",
    flow: "User prompt → /api/chat (stream) → chat_messages → Save to Notes (optional)",
  },
  {
    label: "Substack Notes",
    flow: "Note Generator or manual → substack_notes (Draft) → Ready → Copy/paste to Substack → Mark Posted",
  },
];

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ArchitecturePage() {
  return (
    <div className="max-w-5xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <p className="text-xs text-muted mb-2">
          <Link href="/" className="hover:text-dark transition-colors">Dashboard</Link>
          {" › "}
          <span className="text-dark">Hub Architecture</span>
        </p>
        <h1 className="text-2xl font-serif text-dark mb-1">Hub Architecture</h1>
        <p className="text-sm text-muted">
          A map of your hub&apos;s systems — agents, data flows, integrations, and database tables.
          Update this file as your hub grows.
        </p>
      </div>

      {/* Data Flows */}
      <Section title="Data Flows" description="How information moves through the hub.">
        <div className="flex flex-col gap-3">
          {DATA_FLOWS.map((df) => (
            <div key={df.label} className="bg-white border border-border px-4 py-3">
              <p className="text-xs font-semibold text-dark mb-1.5">{df.label}</p>
              <p className="text-xs text-muted font-mono leading-relaxed">{df.flow}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Agent Registry */}
      <Section
        title="Agent Registry"
        description={`${AGENTS.length} agents across research, content, and distribution.`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-light border-b border-border">
                <th className="text-left px-4 py-2.5 font-semibold text-muted uppercase tracking-wider text-[10px]">Agent</th>
                <th className="text-left px-4 py-2.5 font-semibold text-muted uppercase tracking-wider text-[10px]">Route</th>
                <th className="text-left px-4 py-2.5 font-semibold text-muted uppercase tracking-wider text-[10px]">Trigger</th>
                <th className="text-left px-4 py-2.5 font-semibold text-muted uppercase tracking-wider text-[10px]">Produces</th>
                <th className="text-left px-4 py-2.5 font-semibold text-muted uppercase tracking-wider text-[10px]">Writes to</th>
              </tr>
            </thead>
            <tbody>
              {AGENTS.map((agent, i) => (
                <tr
                  key={agent.name}
                  className={`border-b border-border ${i % 2 === 0 ? "bg-white" : "bg-light/50"}`}
                >
                  <td className="px-4 py-2.5 font-medium text-dark whitespace-nowrap">{agent.name}</td>
                  <td className="px-4 py-2.5 text-muted font-mono text-[11px] whitespace-nowrap">{agent.route}</td>
                  <td className="px-4 py-2.5 text-muted whitespace-nowrap">{agent.trigger}</td>
                  <td className="px-4 py-2.5 text-muted">{agent.produces}</td>
                  <td className="px-4 py-2.5 text-muted font-mono text-[11px] whitespace-nowrap">{agent.output}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* External Integrations */}
      <Section
        title="External Integrations"
        description="APIs connected to this hub. Required integrations must be set to run agents."
      >
        <div className="flex flex-col gap-2">
          {INTEGRATIONS.map((int) => (
            <div key={int.name} className="bg-white border border-border px-4 py-3 flex items-start gap-4">
              <div className="shrink-0 mt-0.5">
                <span className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 ${
                  int.required
                    ? "bg-primary text-white"
                    : "bg-light text-muted border border-border"
                }`}>
                  {int.required ? "Required" : "Optional"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-dark mb-0.5">{int.name}</p>
                <p className="text-[11px] font-mono text-muted mb-1">{int.env}</p>
                <p className="text-xs text-muted">{int.purpose}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Database Tables */}
      <Section
        title="Database Tables"
        description={`${DB_TABLES.length} tables in Supabase. All use UUID primary keys and created_at timestamps.`}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {DB_TABLES.map((table) => (
            <div key={table.name} className="bg-white border border-border px-4 py-2.5 flex items-start gap-3">
              <code className="text-[11px] text-primary font-mono shrink-0 mt-0.5">{table.name}</code>
              <p className="text-[11px] text-muted leading-snug">{table.description}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Cron Jobs */}
      <Section
        title="Scheduled Jobs"
        description="Automations that run on a timer. Configure via Vercel cron in vercel.json."
      >
        <div className="bg-white border border-border p-4">
          <p className="text-xs text-muted mb-3">
            No cron jobs are configured by default. To schedule the Research Orchestrator to run daily:
          </p>
          <pre className="text-[11px] font-mono bg-light border border-border p-3 overflow-x-auto text-dark">{`// vercel.json
{
  "crons": [
    {
      "path": "/api/research/run-all",
      "schedule": "0 7 * * 1"
    }
  ]
}

// Authorization header required (set CRON_SECRET in env vars):
// Authorization: Bearer YOUR_CRON_SECRET`}</pre>
          <p className="text-[11px] text-muted mt-3">
            The schedule above runs every Monday at 7am UTC. Adjust the cron expression for your timezone and cadence.
          </p>
        </div>
      </Section>

      <p className="text-xs text-muted text-center mt-4 pb-4">
        Last updated: July 2026 · Edit <code className="font-mono">app/architecture/page.tsx</code> to keep this current
      </p>
    </div>
  );
}

// ─── Section wrapper ────────────────────────────────────────────────────────────

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-10">
      <div className="mb-4">
        <h2 className="text-base font-serif text-dark mb-0.5">{title}</h2>
        <p className="text-xs text-muted">{description}</p>
      </div>
      {children}
    </div>
  );
}
