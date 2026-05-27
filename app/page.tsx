import { createServerClient } from "@/lib/supabase-server";
import ReviewQueueCard from "@/components/dashboard/ReviewQueueCard";
import AskAssistantCard from "@/components/dashboard/AskAssistantCard";
import Link from "next/link";

async function getStats() {
  const supabase = createServerClient();
  const [{ count: pending }, { count: reports }, { count: drafts }] = await Promise.all([
    supabase.from("agent_outputs").select("*", { count: "exact", head: true }).eq("status", "ready"),
    supabase.from("research_reports").select("*", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    supabase.from("blog_posts").select("*", { count: "exact", head: true }).eq("status", "draft"),
  ]);
  return { pending: pending ?? 0, reports: reports ?? 0, drafts: drafts ?? 0 };
}

export default async function DashboardPage() {
  const stats = await getStats();

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-serif text-dark mb-1">Dashboard</h1>
        <p className="text-sm text-muted">Your business intelligence command center.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Pending Review"
          value={stats.pending}
          href="/review"
          color="primary"
        />
        <StatCard
          label="Research Reports (30d)"
          value={stats.reports}
          href="/intelligence"
          color="accent"
        />
        <StatCard
          label="Drafts in Progress"
          value={stats.drafts}
          href="/content/posts"
          color="gold"
        />
      </div>

      {/* Main cards */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <ReviewQueueCard />
        <AskAssistantCard />
      </div>

      {/* Quick actions */}
      <div className="bg-white border border-border rounded-xl p-5">
        <h2 className="font-medium text-dark mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <TriggerButton
            label="Run Research Sweep"
            description="Runs all 4 research agents + synthesis"
            href="/agents"
          />
          <TriggerButton
            label="Score a Draft"
            description="Evaluate a blog post against your criteria"
            href="/content/post-scorer"
          />
          <TriggerButton
            label="Write a Post"
            description="Draft from a brief in the review queue"
            href="/content/posts"
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
  color,
}: {
  label: string;
  value: number;
  href: string;
  color: "primary" | "accent" | "gold";
}) {
  const colorMap = {
    primary: "text-primary",
    accent: "text-accent",
    gold: "text-gold",
  };
  return (
    <Link
      href={href}
      className="bg-white border border-border rounded-xl p-5 hover:border-primary/30 transition-colors"
    >
      <p className={`text-3xl font-bold ${colorMap[color]} mb-1`}>{value}</p>
      <p className="text-sm text-muted">{label}</p>
    </Link>
  );
}

function TriggerButton({
  label,
  description,
  href,
}: {
  label: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="border border-border rounded-lg px-4 py-3 hover:border-primary/40 hover:bg-light transition-colors"
    >
      <p className="text-sm font-medium text-dark">{label}</p>
      <p className="text-xs text-muted mt-0.5">{description}</p>
    </Link>
  );
}
