import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = createServerClient();

  const now = new Date();
  const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
  const twoWeeksAgo = new Date(now); twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [metricsRes, growthRes, bestRes] = await Promise.all([
    // All metrics from the last 14 days (two weeks for trend comparison)
    supabase
      .from("content_metrics")
      .select("*")
      .gte("recorded_at", twoWeeksAgo.toISOString())
      .order("recorded_at", { ascending: false }),

    // Most recent growth snapshot per platform (last 90 days)
    supabase
      .from("growth_snapshots")
      .select("*")
      .order("recorded_at", { ascending: false })
      .limit(200),

    // Best content this month by metric value
    supabase
      .from("content_metrics")
      .select("*")
      .gte("recorded_at", monthStart.toISOString())
      .order("value", { ascending: false })
      .limit(20),
  ]);

  const metrics = metricsRes.data ?? [];
  const growth = growthRes.data ?? [];
  const bestContent = bestRes.data ?? [];

  // Latest snapshot per platform
  const latestGrowth: Record<string, (typeof growth)[0]> = {};
  const prevGrowth: Record<string, (typeof growth)[0]> = {};
  for (const snap of growth) {
    const p = snap.platform;
    if (!latestGrowth[p]) latestGrowth[p] = snap;
    else if (!prevGrowth[p]) prevGrowth[p] = snap;
  }

  // For each platform+metric_type, compute this week vs last week latest value
  type MetricSummary = {
    platform: string;
    metric_type: string;
    current_value: number;
    prev_value: number | null;
  };

  const metricMap: Record<string, MetricSummary> = {};
  for (const m of metrics) {
    const key = `${m.platform}::${m.metric_type}`;
    const isThisWeek = new Date(m.recorded_at) >= weekAgo;

    if (!metricMap[key]) {
      metricMap[key] = {
        platform: m.platform,
        metric_type: m.metric_type,
        current_value: 0,
        prev_value: null,
      };
    }

    const entry = metricMap[key];
    if (isThisWeek) {
      if (entry.current_value === 0) entry.current_value = m.value;
    } else {
      if (entry.prev_value === null) entry.prev_value = m.value;
    }
  }

  return NextResponse.json({
    metrics: Object.values(metricMap),
    latestGrowth: Object.values(latestGrowth),
    prevGrowth: Object.values(prevGrowth),
    bestContent: bestContent.slice(0, 5),
  });
}
