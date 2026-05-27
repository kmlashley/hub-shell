import { createServerClient } from "@/lib/supabase-server";
import { fmtDate } from "@/lib/fmt-date";

const REPORT_TYPES = ["keyword", "competitive", "content-trends", "audience"] as const;
type ReportType = (typeof REPORT_TYPES)[number];

const REPORT_LABELS: Record<ReportType, string> = {
  keyword: "Keyword Research",
  competitive: "Competitive Analysis",
  "content-trends": "Content Trends",
  audience: "Audience Intelligence",
};

async function getLatestReports() {
  const supabase = createServerClient();
  const results = await Promise.all(
    REPORT_TYPES.map((type) =>
      supabase
        .from("research_reports")
        .select("id, type, slug, created_at, data")
        .eq("type", type)
        .order("created_at", { ascending: false })
        .limit(1)
        .single()
    )
  );
  return results.map((r, i) => ({
    type: REPORT_TYPES[i],
    report: r.data ?? null,
  }));
}

async function getOpportunities() {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("hub_data")
    .select("data")
    .eq("key", "content-intelligence-overview")
    .single();
  return (data as { data: { opportunities?: Array<{ rank: number; topic: string; score: string; platform: string; rationale: string }> } } | null)?.data ?? null;
}

export default async function IntelligencePage() {
  const [reports, opportunities] = await Promise.all([getLatestReports(), getOpportunities()]);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-serif text-dark mb-1">Intelligence</h1>
          <p className="text-sm text-muted">Latest research reports and content opportunities.</p>
        </div>
        <a
          href="/agents"
          className="text-sm text-primary hover:underline"
        >
          Run research sweep →
        </a>
      </div>

      {/* Opportunities */}
      {opportunities?.opportunities && opportunities.opportunities.length > 0 && (
        <div className="mb-8">
          <h2 className="font-medium text-dark mb-4">Top Content Opportunities</h2>
          <div className="grid grid-cols-1 gap-3">
            {opportunities.opportunities.slice(0, 5).map((opp) => (
              <div key={opp.rank} className="bg-white border border-border rounded-xl p-4 flex gap-4">
                <div className={`text-xl font-bold shrink-0 w-8 text-center ${
                  opp.score === "High" ? "text-accent" : opp.score === "Medium" ? "text-gold" : "text-muted"
                }`}>
                  {opp.rank}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-dark text-sm">{opp.topic}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      opp.score === "High" ? "bg-accent/10 text-accent" : "bg-gold/10 text-gold"
                    }`}>{opp.score}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-border text-muted capitalize">{opp.platform}</span>
                  </div>
                  <p className="text-xs text-muted">{opp.rationale}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Research reports grid */}
      <h2 className="font-medium text-dark mb-4">Latest Research Reports</h2>
      <div className="grid grid-cols-2 gap-4">
        {reports.map(({ type, report }) => (
          <div key={type} className="bg-white border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-sm text-dark">{REPORT_LABELS[type]}</h3>
              {report && (
                <span className="text-xs text-muted">{fmtDate(report.created_at)}</span>
              )}
            </div>
            {report ? (
              <div className="text-xs text-muted space-y-1">
                <p className="text-dark text-sm font-mono truncate">
                  {(report.data as { summary?: string })?.summary ?? "Report available — no summary field."}
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted">No report yet. Run the research sweep to generate one.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
