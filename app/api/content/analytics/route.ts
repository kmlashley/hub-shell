import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase-server";
import { extractJsonFromClaude } from "@/lib/research/api-clients";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface ParsedMetric {
  platform: string;
  content_title: string;
  metric_type: string;
  value: number;
  unit: string;
}

interface PlatformSummary {
  platform: string;
  highlights: string;
  metrics: ParsedMetric[];
}

export interface AnalyticsParseResult {
  platform_summaries: PlatformSummary[];
  top_performers: ParsedMetric[];
  what_is_working: string;
  recommendations: string[];
  parsed_metrics: ParsedMetric[];
}

export async function GET() {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("content_metrics")
      .select(`
        id,
        platform,
        metric_type,
        value,
        recorded_at,
        content_id,
        published_content ( title, url )
      `)
      .order("recorded_at", { ascending: false })
      .limit(200);

    if (error) throw error;
    return NextResponse.json({ success: true, metrics: data ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { raw_data, save, metrics } = await request.json();

  // Save pre-parsed metrics to DB
  if (save && Array.isArray(metrics) && metrics.length > 0) {
    try {
      const supabase = createServerClient();
      const rows = (metrics as ParsedMetric[]).map((m) => ({
        platform: m.platform,
        metric_type: m.metric_type,
        value: m.value,
        recorded_at: new Date().toISOString(),
      }));
      const { error } = await supabase.from("content_metrics").insert(rows);
      if (error) throw error;
      return NextResponse.json({ success: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
  }

  // Parse + synthesize raw pasted data
  if (!raw_data?.trim()) {
    return NextResponse.json({ error: "raw_data is required" }, { status: 400 });
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2500,
      system: `You are a content analytics assistant. Parse raw performance data pasted by a content creator and synthesize it into a structured analytics brief.

Extract every metric you can find. Common types:
- open_rate (%), click_rate (%), unsubscribe_rate (%)
- views, impressions, reach
- likes, comments, shares, saves
- subscribers_gained, followers_gained
- revenue, conversions

Return ONLY valid JSON, no other text:
{
  "parsed_metrics": [
    {
      "platform": "Newsletter",
      "content_title": "What the metric is for (issue name, video title, post topic, etc.)",
      "metric_type": "open_rate",
      "value": 48.2,
      "unit": "%"
    }
  ],
  "platform_summaries": [
    {
      "platform": "Newsletter",
      "highlights": "1 sentence summary of how this platform performed",
      "metrics": []
    }
  ],
  "top_performers": [
    {
      "platform": "Newsletter",
      "content_title": "Best performing piece on this platform",
      "metric_type": "open_rate",
      "value": 52,
      "unit": "%"
    }
  ],
  "what_is_working": "2–3 sentence synthesis across ALL platforms: what content types, topics, or formats are clearly outperforming",
  "recommendations": [
    "Specific action to take based on the data (3–5 recommendations, each starting with a verb)"
  ]
}`,
      messages: [{ role: "user", content: raw_data.trim() }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    const data = extractJsonFromClaude(raw) as AnalyticsParseResult | null;

    if (!data?.parsed_metrics) {
      return NextResponse.json({ error: "Failed to parse analytics data" }, { status: 500 });
    }

    return NextResponse.json({ success: true, result: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
