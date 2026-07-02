import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase-server";
import {
  searchWithTavily,
  scrapeWithFirecrawl,
  extractJsonFromClaude,
} from "@/lib/research/api-clients";
import { BUSINESS_CONTEXT } from "@/lib/research/context";

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Channel mode types ────────────────────────────────────────────────────────

interface TopVideo {
  title: string;
  topic: string;
  why_it_performed: string;
}

interface ContentGap {
  gap: string;
  audience_need: string;
  opportunity: string;
}

export interface ChannelResult {
  mode: "channel";
  channel_name: string;
  channel_summary: string;
  posting_cadence: string;
  content_focus: string;
  top_videos: TopVideo[];
  comment_sentiment: string;
  content_gaps: ContentGap[];
  recommended_angle: string;
}

// ── Topic mode types ──────────────────────────────────────────────────────────

interface TopTopicVideo {
  title: string;
  channel: string;
  why_it_performs: string;
}

interface MissingAngle {
  what: string;
  why_missing: string;
}

interface RecommendedVideo {
  title: string;
  angle: string;
  hook: string;
  rationale: string;
}

export interface TopicResult {
  mode: "topic";
  topic_summary: string;
  audience_intent: string;
  top_videos: TopTopicVideo[];
  what_is_missing: MissingAngle[];
  recommended_video: RecommendedVideo;
}

export type YoutubeResult = ChannelResult | TopicResult;

export async function POST(request: NextRequest) {
  const {
    mode,
    query,
    results,
    save,
  }: {
    mode: "channel" | "topic";
    query: string;
    results?: YoutubeResult;
    save?: boolean;
  } = await request.json();

  if (!mode || !query?.trim()) {
    return NextResponse.json({ error: "mode and query are required" }, { status: 400 });
  }

  if (save && results) {
    try {
      const supabase = createServerClient();
      await supabase.from("youtube_research_runs").insert({
        mode,
        query: query.trim(),
        results_json: results,
        created_at: new Date().toISOString(),
      });
      return NextResponse.json({ success: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
  }

  try {
    if (mode === "channel") {
      return await handleChannelResearch(query.trim());
    } else {
      return await handleTopicResearch(query.trim());
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

async function handleChannelResearch(channelUrl: string) {
  const cleanUrl = channelUrl.replace(/\/$/, "");

  // Scrape channel page (non-fatal) + search in parallel
  const channelHandle = cleanUrl
    .replace(/https?:\/\/(www\.)?youtube\.com\/(channel\/|c\/|@)?/, "")
    .split("/")[0];

  const [scrapeResult, videosData, sentimentData] = await Promise.allSettled([
    scrapeWithFirecrawl(cleanUrl),
    searchWithTavily(`"${channelHandle}" YouTube most popular videos topics`, {
      searchDepth: "advanced",
      maxResults: 8,
      includeAnswer: true,
    }),
    searchWithTavily(`"${channelHandle}" YouTube comments audience reaction`, {
      maxResults: 4,
      includeAnswer: true,
    }),
  ]);

  const scraped =
    scrapeResult.status === "fulfilled" ? scrapeResult.value.slice(0, 3000) : "";

  const searchContext = [
    videosData.status === "fulfilled" && videosData.value.answer
      ? `Videos and content:\n${videosData.value.answer}`
      : "",
    videosData.status === "fulfilled"
      ? videosData.value.results
          .slice(0, 5)
          .map((r) => `- ${r.title}: ${r.content.slice(0, 200)}`)
          .join("\n")
      : "",
    sentimentData.status === "fulfilled" && sentimentData.value.answer
      ? `Audience reaction:\n${sentimentData.value.answer}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 3000,
    system: `You are a YouTube content strategist. Analyze this YouTube channel and produce a research brief with specific, actionable intelligence.

${BUSINESS_CONTEXT}

Return ONLY valid JSON, no other text:
{
  "mode": "channel",
  "channel_name": "Name of the channel",
  "channel_summary": "2–3 sentence overview of the channel — topic, audience, style, what makes them distinctive",
  "posting_cadence": "How often they post (e.g. '2x per week, mixes long-form and Shorts')",
  "content_focus": "The core topic or niche they own (1 sentence)",
  "top_videos": [
    {
      "title": "Video title or type (e.g. 'Beginner tutorials', 'Tool comparisons')",
      "topic": "What this video/type covers",
      "why_it_performed": "Specific reason this resonates with their audience"
    }
  ],
  "comment_sentiment": "What their audience says, asks about, and feels — based on comment patterns and audience signals (2–3 sentences)",
  "content_gaps": [
    {
      "gap": "Topic or format they don't cover",
      "audience_need": "Why their audience actually wants this",
      "opportunity": "Specific video angle you could own"
    }
  ],
  "recommended_angle": "One specific video concept you should create based on this channel's gaps — include a working title"
}

Aim for: 4–6 top videos, 3–4 content gaps.`,
    messages: [
      {
        role: "user",
        content: `Channel URL: ${channelUrl}\n\nScraped content:\n${scraped || "(not available)"}\n\nSearch data:\n${searchContext || "(not available)"}`,
      },
    ],
  });

  const raw = response.content[0].type === "text" ? response.content[0].text : "";
  const data = extractJsonFromClaude(raw) as ChannelResult | null;

  if (!data?.channel_summary) {
    return NextResponse.json({ error: "Failed to analyze channel" }, { status: 500 });
  }

  return NextResponse.json({ success: true, result: data });
}

async function handleTopicResearch(topic: string) {
  const [topVideosData, gapData, trendData] = await Promise.all([
    searchWithTavily(`best YouTube videos about "${topic}" most viewed`, {
      searchDepth: "advanced",
      maxResults: 8,
      includeAnswer: true,
    }),
    searchWithTavily(`"${topic}" YouTube missing underrated angle what nobody covers`, {
      maxResults: 5,
      includeAnswer: true,
    }),
    searchWithTavily(`"${topic}" trending 2024 2025 what people want to learn`, {
      maxResults: 4,
      includeAnswer: true,
    }),
  ]);

  const searchContext = [
    topVideosData.answer && `Top content:\n${topVideosData.answer}`,
    topVideosData.results
      .slice(0, 5)
      .map((r) => `- ${r.title}: ${r.content.slice(0, 200)}`)
      .join("\n"),
    gapData.answer && `Gaps and missing angles:\n${gapData.answer}`,
    trendData.answer && `Trends:\n${trendData.answer}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 3000,
    system: `You are a YouTube content strategist. Research this topic on YouTube and produce a brief with the competitive landscape and a specific recommended video angle.

${BUSINESS_CONTEXT}

Return ONLY valid JSON, no other text:
{
  "mode": "topic",
  "topic_summary": "Overview of how this topic is currently covered on YouTube — who dominates, what approach they take, what the audience expects (2–3 sentences)",
  "audience_intent": "What someone searching this topic actually wants to learn or do (1–2 sentences)",
  "top_videos": [
    {
      "title": "A top-performing video or video type on this topic",
      "channel": "Channel name or type (e.g. 'Large creator', 'Niche expert')",
      "why_it_performs": "Why this video resonates — format, angle, or promise"
    }
  ],
  "what_is_missing": [
    {
      "what": "A specific angle, format, or subtopic no one is covering well",
      "why_missing": "Why the gap exists (too niche, too advanced, requires specific expertise, etc.)"
    }
  ],
  "recommended_video": {
    "title": "A working title for a video you should create",
    "angle": "The specific angle that differentiates this from existing content",
    "hook": "Opening hook — the first 30 seconds setup (1–2 sentences)",
    "rationale": "Why this specific angle will outperform what's already out there"
  }
}

Aim for: 4–6 top videos, 3–4 missing angles.`,
    messages: [
      {
        role: "user",
        content: `Topic: "${topic}"\n\nSearch data:\n${searchContext}`,
      },
    ],
  });

  const raw = response.content[0].type === "text" ? response.content[0].text : "";
  const data = extractJsonFromClaude(raw) as TopicResult | null;

  if (!data?.topic_summary) {
    return NextResponse.json({ error: "Failed to research topic" }, { status: 500 });
  }

  return NextResponse.json({ success: true, result: data });
}
