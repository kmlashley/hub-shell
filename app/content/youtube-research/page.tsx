"use client";

import { useState } from "react";

type Mode = "channel" | "topic";

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

interface ChannelResult {
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

interface TopicResult {
  mode: "topic";
  topic_summary: string;
  audience_intent: string;
  top_videos: TopTopicVideo[];
  what_is_missing: MissingAngle[];
  recommended_video: RecommendedVideo;
}

type YoutubeResult = ChannelResult | TopicResult;

export default function YouTubeResearchPage() {
  const [mode, setMode] = useState<Mode>("channel");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<YoutubeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  function handleModeChange(next: Mode) {
    setMode(next);
    setQuery("");
    setResult(null);
    setError(null);
    setSaved(false);
  }

  async function handleResearch() {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSaved(false);

    try {
      const res = await fetch("/api/content/youtube-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, query }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "Research failed");
      setResult(data.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!result) return;
    setSaving(true);
    try {
      await fetch("/api/content/youtube-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, query, results: result, save: true }),
      });
      setSaved(true);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-serif text-dark mb-1">YouTube Research</h1>
        <p className="text-sm text-muted">
          Research a channel to find what&apos;s working and where the gaps are, or research a topic to find the right angle for your next video.
        </p>
      </div>

      {/* Mode toggle + input */}
      <div className="bg-white border border-border p-5 mb-4">
        {/* Mode tabs */}
        <div className="flex gap-0 border border-border mb-5 w-fit">
          {(["channel", "topic"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => handleModeChange(m)}
              className={`px-5 py-2 text-sm transition-colors ${
                mode === m
                  ? "bg-primary text-white"
                  : "text-muted hover:text-dark hover:bg-light"
              }`}
            >
              {m === "channel" ? "Channel Research" : "Topic Research"}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-[10px] font-semibold tracking-widest uppercase text-muted block mb-1.5">
              {mode === "channel" ? "YouTube Channel URL" : "Topic or Search Term"}
            </label>
            <input
              type="text"
              className="w-full text-sm text-dark placeholder:text-muted bg-transparent outline-none border border-border px-3 py-2 focus:border-primary/50 transition-colors"
              placeholder={
                mode === "channel"
                  ? "https://youtube.com/@channelname"
                  : "e.g. AI productivity for solopreneurs"
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleResearch()}
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleResearch}
              disabled={loading || !query.trim()}
              className="bg-primary text-white text-sm px-5 py-2 hover:bg-primary-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading
                ? "Researching…"
                : mode === "channel"
                ? "Research channel"
                : "Research topic"}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rust-tint border border-accent/30 text-accent text-sm px-4 py-3 mb-4">
          {error}
        </div>
      )}

      {loading && (
        <div className="bg-white border border-border p-8 text-center mb-4">
          <p className="text-sm text-muted">
            {mode === "channel" ? "Scraping channel and analyzing…" : "Researching topic landscape…"}
          </p>
          <p className="text-xs text-muted mt-1.5">Takes 20–40 seconds.</p>
        </div>
      )}

      {result && result.mode === "channel" && <ChannelResults result={result} onSave={handleSave} saving={saving} saved={saved} />}
      {result && result.mode === "topic" && <TopicResults result={result} onSave={handleSave} saving={saving} saved={saved} />}
    </div>
  );
}

function ChannelResults({
  result,
  onSave,
  saving,
  saved,
}: {
  result: ChannelResult;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Channel overview */}
      <div className="bg-white border border-border p-5">
        <div className="mb-4">
          <h2 className="text-lg font-serif text-dark mb-0.5">{result.channel_name}</h2>
          <p className="text-xs text-muted">{result.posting_cadence}</p>
        </div>
        <p className="text-sm text-dark leading-relaxed mb-4">{result.channel_summary}</p>
        <div className="bg-light px-3 py-2.5">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-1">Content Focus</p>
          <p className="text-xs text-dark leading-snug">{result.content_focus}</p>
        </div>
      </div>

      {/* Top videos */}
      <div className="bg-white border border-border p-5">
        <SectionHeader label="Top Performing Content" />
        <div className="flex flex-col gap-2">
          {result.top_videos.map((v, i) => (
            <div key={i} className="border border-border px-4 py-3 flex items-start gap-3">
              <span className="text-xs font-bold text-primary w-5 h-5 bg-teal-tint flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-dark mb-0.5">{v.title}</p>
                <p className="text-xs text-muted mb-1">{v.topic}</p>
                <p className="text-xs text-dark/70 leading-snug italic">{v.why_it_performed}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Comment sentiment */}
      <div className="bg-white border border-border p-5">
        <SectionHeader label="Audience & Comment Sentiment" />
        <p className="text-sm text-dark leading-relaxed">{result.comment_sentiment}</p>
      </div>

      {/* Content gaps */}
      <div className="bg-white border border-border p-5">
        <SectionHeader label="Content Gaps" />
        <div className="flex flex-col gap-3">
          {result.content_gaps.map((gap, i) => (
            <div key={i} className="border border-border p-4">
              <p className="text-sm font-medium text-dark mb-2">{gap.gap}</p>
              <p className="text-xs text-muted leading-snug mb-3">
                <span className="font-medium text-dark/70">Audience need: </span>
                {gap.audience_need}
              </p>
              <div className="bg-rust-tint px-3 py-2.5">
                <p className="text-[10px] font-semibold tracking-widest uppercase text-accent mb-1">
                  Your opportunity
                </p>
                <p className="text-sm text-dark leading-snug">{gap.opportunity}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommended angle */}
      <div className="bg-teal-tint border border-primary/20 p-5">
        <p className="text-[10px] font-semibold tracking-widest uppercase text-primary mb-2">
          Recommended video to make
        </p>
        <p className="text-sm text-dark leading-relaxed">{result.recommended_angle}</p>
      </div>

      <SaveRow onSave={onSave} saving={saving} saved={saved} label="Add to content calendar" />
    </div>
  );
}

function TopicResults({
  result,
  onSave,
  saving,
  saved,
}: {
  result: TopicResult;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Topic overview */}
      <div className="bg-white border border-border p-5">
        <SectionHeader label="Topic Landscape" />
        <p className="text-sm text-dark leading-relaxed mb-4">{result.topic_summary}</p>
        <div className="bg-light px-3 py-2.5">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-1">Audience Intent</p>
          <p className="text-xs text-dark leading-snug">{result.audience_intent}</p>
        </div>
      </div>

      {/* Top videos */}
      <div className="bg-white border border-border p-5">
        <SectionHeader label="Top Videos on This Topic" />
        <div className="flex flex-col gap-2">
          {result.top_videos.map((v, i) => (
            <div key={i} className="border border-border px-4 py-3 flex items-start gap-3">
              <span className="text-xs font-bold text-primary w-5 h-5 bg-teal-tint flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-dark mb-0.5">{v.title}</p>
                <p className="text-xs text-muted mb-1">{v.channel}</p>
                <p className="text-xs text-dark/70 leading-snug italic">{v.why_it_performs}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* What's missing */}
      <div className="bg-white border border-border p-5">
        <SectionHeader label="What Nobody Is Covering Well" />
        <div className="flex flex-col gap-3">
          {result.what_is_missing.map((item, i) => (
            <div key={i} className="border border-border px-4 py-3">
              <p className="text-sm font-medium text-dark mb-1">{item.what}</p>
              <p className="text-xs text-muted leading-snug">{item.why_missing}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recommended video */}
      <div className="bg-white border border-border p-5">
        <SectionHeader label="Recommended Video to Make" />
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-1">Working Title</p>
            <p className="text-base font-medium text-dark">&ldquo;{result.recommended_video.title}&rdquo;</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-light px-3 py-2.5">
              <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-1">Angle</p>
              <p className="text-xs text-dark leading-snug">{result.recommended_video.angle}</p>
            </div>
            <div className="bg-light px-3 py-2.5">
              <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-1">Opening Hook</p>
              <p className="text-xs text-dark leading-snug">{result.recommended_video.hook}</p>
            </div>
          </div>
          <div className="bg-teal-tint px-3 py-2.5">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-primary mb-1">Why this wins</p>
            <p className="text-sm text-dark leading-snug">{result.recommended_video.rationale}</p>
          </div>
        </div>
      </div>

      <SaveRow onSave={onSave} saving={saving} saved={saved} label="Add to content calendar" />
    </div>
  );
}

function SaveRow({
  onSave,
  saving,
  saved,
  label,
}: {
  onSave: () => void;
  saving: boolean;
  saved: boolean;
  label: string;
}) {
  return (
    <div className="flex justify-end pb-4">
      <button
        onClick={onSave}
        disabled={saving || saved}
        className="text-sm border border-border px-4 py-2 text-muted hover:text-dark hover:border-dark/20 transition-colors disabled:opacity-40"
      >
        {saved ? "Saved ✓" : saving ? "Saving…" : label}
      </button>
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-4">
      {label}
    </p>
  );
}
