import { createServerClient } from "@/lib/supabase-server";
import Link from "next/link";
import { fmtRelative } from "@/lib/fmt-date";

export const dynamic = "force-dynamic";

// ─── Data fetching ─────────────────────────────────────────────────────────────

async function getStats() {
  const supabase = createServerClient();
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [
    { count: pendingReview },
    { count: researchReports },
    { count: notesThisWeek },
    { count: publishedThisMonth },
    { count: drafts },
  ] = await Promise.all([
    supabase.from("agent_outputs").select("*", { count: "exact", head: true }).eq("status", "ready"),
    supabase.from("research_reports").select("*", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo),
    supabase.from("notes").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
    supabase
      .from("blog_posts")
      .select("*", { count: "exact", head: true })
      .eq("status", "published")
      .gte("created_at", startOfMonth),
    supabase.from("blog_posts").select("*", { count: "exact", head: true }).eq("status", "draft"),
  ]);

  return {
    pendingReview: pendingReview ?? 0,
    researchReports: researchReports ?? 0,
    notesThisWeek: notesThisWeek ?? 0,
    publishedThisMonth: publishedThisMonth ?? 0,
    drafts: drafts ?? 0,
  };
}

interface ActivityItem {
  id: string;
  label: string;
  type: "note" | "agent-output";
  href: string;
  created_at: string;
  meta?: string;
}

async function getRecentActivity(): Promise<ActivityItem[]> {
  const supabase = createServerClient();
  const [notesRes, outputsRes] = await Promise.all([
    supabase
      .from("notes")
      .select("id, content, created_at")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("agent_outputs")
      .select("id, title, output_type, created_at")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const items: ActivityItem[] = [
    ...(notesRes.data ?? []).map((n) => ({
      id: `note-${n.id}`,
      label:
        String(n.content).slice(0, 100) + (String(n.content).length > 100 ? "…" : ""),
      type: "note" as const,
      href: "/notes",
      created_at: String(n.created_at),
    })),
    ...(outputsRes.data ?? []).map((o) => ({
      id: `output-${o.id}`,
      label: o.title ? String(o.title) : `${String(o.output_type)} output`,
      type: "agent-output" as const,
      href: "/review",
      created_at: String(o.created_at),
      meta: String(o.output_type),
    })),
  ];

  return items.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 10);
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const [stats, activity] = await Promise.all([getStats(), getRecentActivity()]);

  return (
    <div className="max-w-5xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-serif text-dark mb-1">Dashboard</h1>
        <p className="text-sm text-muted">Your business intelligence command center.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-5 gap-3 mb-8">
        <StatCard label="In Review" value={stats.pendingReview} href="/review" color="primary" />
        <StatCard label="Research (30d)" value={stats.researchReports} href="/intelligence" color="accent" />
        <StatCard label="Notes This Week" value={stats.notesThisWeek} href="/notes" color="purple" />
        <StatCard label="Published (30d)" value={stats.publishedThisMonth} href="/content" color="olive" />
        <StatCard label="Drafts" value={stats.drafts} href="/content/posts" color="gold" />
      </div>

      {/* Activity feed + Quick actions */}
      <div className="grid grid-cols-3 gap-6">

        {/* Recent activity */}
        <div className="col-span-2 bg-white border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium text-dark">Recent Activity</h2>
            <span className="text-xs text-muted">Last 10 items</span>
          </div>

          {activity.length === 0 ? (
            <p className="text-sm text-muted py-8 text-center">
              No activity yet. Run a research sweep to get started.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {activity.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 py-3 hover:bg-light -mx-5 px-5 transition-colors group"
                  >
                    <TypeBadge type={item.type} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-dark truncate group-hover:text-primary transition-colors">
                        {item.label}
                      </p>
                      {item.meta && (
                        <p className="text-xs text-muted mt-0.5 capitalize">{item.meta}</p>
                      )}
                    </div>
                    <span className="text-xs text-muted shrink-0">
                      {fmtRelative(item.created_at)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">

          {/* Quick actions */}
          <div className="bg-white border border-border p-5">
            <h2 className="font-medium text-dark mb-4">Quick Actions</h2>
            <div className="flex flex-col gap-2">
              <ActionButton
                label="Run research"
                desc="Start a sweep across all agents"
                href="/agents"
              />
              <ActionButton
                label="New note"
                desc="Capture an idea or observation"
                href="/notes"
              />
              <ActionButton
                label="Review queue"
                desc="Clear pending agent outputs"
                href="/review"
              />
            </div>
          </div>

          {/* Hub nav shortcuts */}
          <div className="bg-white border border-border p-5">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-3">
              Workspaces
            </p>
            <div className="flex flex-col gap-1">
              {[
                { label: "Intelligence", href: "/intelligence" },
                { label: "Content", href: "/content" },
                { label: "Agents", href: "/agents" },
                { label: "Quick Links", href: "/quick-links" },
                { label: "Settings", href: "/settings" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-dark/70 hover:text-primary py-1 transition-colors"
                >
                  {link.label} →
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

type StatColor = "primary" | "accent" | "gold" | "purple" | "olive";

const COLOR_TEXT: Record<StatColor, string> = {
  primary: "text-primary",
  accent: "text-accent",
  gold: "text-gold",
  purple: "text-purple",
  olive: "text-olive",
};

function StatCard({
  label,
  value,
  href,
  color,
}: {
  label: string;
  value: number;
  href: string;
  color: StatColor;
}) {
  return (
    <Link
      href={href}
      className="bg-white border border-border p-5 hover:border-primary/30 transition-colors block"
    >
      <p className={`text-3xl font-bold ${COLOR_TEXT[color]} mb-1`}>{value}</p>
      <p className="text-xs text-muted leading-snug">{label}</p>
    </Link>
  );
}

const TYPE_BADGE_CONFIG: Record<
  ActivityItem["type"],
  { label: string; className: string }
> = {
  note: { label: "Note", className: "bg-gold-tint text-gold" },
  "agent-output": { label: "Output", className: "bg-teal-tint text-primary" },
};

function TypeBadge({ type }: { type: ActivityItem["type"] }) {
  const { label, className } = TYPE_BADGE_CONFIG[type];
  return (
    <span
      className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 shrink-0 ${className}`}
    >
      {label}
    </span>
  );
}

function ActionButton({
  label,
  desc,
  href,
}: {
  label: string;
  desc: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="border border-border px-4 py-3 hover:border-primary/40 hover:bg-light transition-colors block"
    >
      <p className="text-sm font-medium text-dark">{label}</p>
      <p className="text-xs text-muted mt-0.5">{desc}</p>
    </Link>
  );
}
