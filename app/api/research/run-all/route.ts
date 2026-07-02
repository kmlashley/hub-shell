import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase-server";
import { extractJsonFromClaude } from "@/lib/research/api-clients";
import { createResearchRun, completeResearchRun, todaySlug } from "@/lib/research/run-helpers";
import { BUSINESS_CONTEXT, CONTENT_STRATEGY } from "@/lib/research/context";
import { headers } from "next/headers";

export const maxDuration = 300;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const RESEARCH_AGENTS = [
  { name: "Keyword Research Agent", endpoint: "/api/research/keyword" },
  { name: "Competitive Research Agent", endpoint: "/api/research/competitive" },
  { name: "Content Trends Agent", endpoint: "/api/research/content-trends" },
  { name: "Audience Research Agent", endpoint: "/api/research/audience" },
];

// ─── Synthesis: reads all L1 reports → writes briefs → queues to review ─────

async function synthesizeAndQueue(supabase: ReturnType<typeof createServerClient>) {
  const reportTypes = ["keyword", "competitive", "content-trends", "audience"];
  const reports = await Promise.all(
    reportTypes.map((type) =>
      supabase
        .from("research_reports")
        .select("type, data, created_at")
        .eq("type", type)
        .order("created_at", { ascending: false })
        .limit(2)
    )
  );

  const allReports = reports.flatMap((r) => r.data ?? []);
  if (allReports.length === 0) return { synthesized: false, briefsQueued: 0 };

  const summary = allReports
    .map((r) => `### ${r.type}\n${JSON.stringify(r.data).slice(0, 20000)}`)
    .join("\n\n");

  const res = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8000,
    system: `You are a content intelligence synthesizer. You read all research outputs and generate the top content opportunities with complete writing briefs.

${BUSINESS_CONTEXT}
${CONTENT_STRATEGY}

Each research report above is broken down by audience segment (see "segments" in each report's data). Analyze the research data and produce the top 5 content opportunities, ranked by potential impact. This business serves multiple audience segments — your 5 opportunities MUST include at least 1-2 for EACH segment described in the business context above. Do not let one segment dominate all 5 slots just because its research data happens to be more extensive; if a segment has no strong opportunity in the data, say so in the summary rather than silently omitting it. For each opportunity, create a writing_brief.

Return JSON:
{
  "generated_date": "YYYY-MM-DD",
  "opportunities": [
    {
      "rank": 1,
      "topic": "string",
      "audience_segment": "string — which audience segment this targets",
      "score": "High|Medium|Low",
      "platform": "blog|youtube|newsletter|social",
      "rationale": "string — why this opportunity, why now",
      "writing_brief": {
        "primary_keyword": "string",
        "secondary_keywords": ["string"],
        "content_format": "string",
        "target_word_count": 1500,
        "h2_headings": ["string"],
        "faq_questions": ["string"],
        "differentiation_angle": "string — what makes this different from what competitors cover",
        "opening_hook": "string — first sentence of the post",
        "cta_suggestion": "string"
      }
    }
  ],
  "summary": "string"
}

Return ONLY valid JSON.`,
    messages: [
      { role: "user", content: `Research data:\n\n${summary}\n\nDate: ${todaySlug()}` },
    ],
  });

  const raw = res.content[0].type === "text" ? res.content[0].text : "";
  const intelligence = extractJsonFromClaude(raw) as {
    opportunities?: Array<{
      rank: number;
      topic: string;
      audience_segment?: string;
      score: string;
      writing_brief: Record<string, unknown>;
    }>;
  } | null;

  if (!intelligence) return { synthesized: false, briefsQueued: 0 };

  // Save synthesis overview
  const { data: existing } = await supabase
    .from("hub_data")
    .select("id")
    .eq("key", "content-intelligence-overview")
    .limit(1);

  if (existing && existing.length > 0) {
    await supabase.from("hub_data").update({ data: intelligence }).eq("key", "content-intelligence-overview");
  } else {
    await supabase.from("hub_data").insert({ key: "content-intelligence-overview", data: intelligence });
  }

  // Queue top 3 briefs for human review
  const topBriefs = (intelligence.opportunities ?? []).slice(0, 3);
  let briefsQueued = 0;

  for (const opp of topBriefs) {
    const { data: existing } = await supabase
      .from("agent_outputs")
      .select("id")
      .eq("title", `Writing Brief — ${opp.topic}`)
      .eq("status", "ready")
      .limit(1);

    if (existing && existing.length > 0) continue;

    await supabase.from("agent_outputs").insert({
      output_type: "brief",
      title: `Writing Brief — ${opp.topic}`,
      payload: opp.writing_brief,
      status: "ready",
      priority_score: opp.score === "High" ? 90 : opp.score === "Medium" ? 60 : 30,
      metadata: { source: "research_sweep", triggered_by: "orchestrator", audience_segment: opp.audience_segment ?? null },
    });
    briefsQueued++;
  }

  return { synthesized: true, briefsQueued };
}

// ─── Main Orchestrator ────────────────────────────────────────────────────────

async function runSweep(triggeredBy: "vercel_cron" | "manual") {
  const startTime = Date.now();
  const supabase = createServerClient();

  // Skip if a sweep already ran in the last 30 minutes
  const { data: recent } = await supabase
    .from("agent_workflow_runs")
    .select("id, status, started_at")
    .eq("workflow_name", "research_sweep")
    .gte("started_at", new Date(Date.now() - 30 * 60 * 1000).toISOString())
    .order("started_at", { ascending: false })
    .limit(1);

  if (recent && recent.length > 0) {
    const r = recent[0] as { status: string; started_at: string };
    if (r.status === "running" || r.status === "completed") {
      return NextResponse.json({ skipped: true, reason: `Recent ${r.status} run found` });
    }
  }

  const masterRunId = await createResearchRun(supabase, "research_sweep", triggeredBy);

  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  // Run all 4 agents staggered by 3s to avoid rate limits
  const results = await Promise.allSettled(
    RESEARCH_AGENTS.map(async (agent, i) => {
      if (i > 0) await new Promise((r) => setTimeout(r, i * 3000));
      const t = Date.now();
      try {
        const res = await fetch(`${baseUrl}${agent.endpoint}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-secret": process.env.CRON_SECRET ?? "",
          },
          body: JSON.stringify({ triggered_by: triggeredBy }),
        });
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          throw new Error(`${res.status}: ${body.slice(0, 200)}`);
        }
        return { agent: agent.name, success: true, duration_ms: Date.now() - t };
      } catch (err) {
        return { agent: agent.name, success: false, duration_ms: Date.now() - t, error: String(err) };
      }
    })
  );

  const agentResults = results.map((r) =>
    r.status === "fulfilled" ? r.value : { agent: "unknown", success: false, duration_ms: 0 }
  );

  const successCount = agentResults.filter((r) => r.success).length;
  const synthesisResult = successCount > 0 ? await synthesizeAndQueue(supabase) : { synthesized: false, briefsQueued: 0 };

  const totalMs = Date.now() - startTime;
  await completeResearchRun(
    supabase, masterRunId,
    successCount === 0 ? "failed" : "completed",
    totalMs,
    agentResults.map((r) => `${r.agent}: ${r.success ? "✓" : "✗"}`).join(", ")
  );

  return NextResponse.json({
    success: successCount > 0,
    duration_ms: totalMs,
    agents: agentResults,
    synthesis: synthesisResult,
  });
}

// GET — Vercel cron (authenticated via CRON_SECRET)
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runSweep("vercel_cron");
}

// POST — manual trigger from the Agents page
export async function POST() {
  return runSweep("manual");
}
