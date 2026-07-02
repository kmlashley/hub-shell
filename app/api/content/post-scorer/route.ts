import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase-server";
import { extractJsonFromClaude } from "@/lib/research/api-clients";
import { BUSINESS_CONTEXT } from "@/lib/research/context";

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function calcGrade(total: number): "A" | "B" | "C" | "D" | "F" {
  const pct = (total / 25) * 100;
  if (pct >= 90) return "A";
  if (pct >= 80) return "B";
  if (pct >= 70) return "C";
  if (pct >= 60) return "D";
  return "F";
}

export async function POST(request: NextRequest) {
  const { content, save }: { content: string; save?: boolean } = await request.json();

  if (!content?.trim()) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: `You are a content scoring expert. Score the post on 5 dimensions (0–5 each) against this writer's Voice DNA — not generic content-marketing conventions.

Business context:
${BUSINESS_CONTEXT}

VOICE DNA RULES (the standard every dimension is measured against):
- Em dashes as the primary punctuation — not colons, not semicolons.
- ALL CAPS for emphasis. Never bold, never italics for emphasis.
- Short. Punch sentences. After long setups.
- Fragment triplets. Three beats. Like this.
- Parenthetical asides (dropped in mid-thought, not saved for the end).
- Confession-before-lesson structure: admit the mistake or the mess before teaching the takeaway.
- Opens from a specific lived experience or moment — never from an abstract thesis statement.
- Closes forward (a next thought, a question, a beat left open) — never a tidy "in summary" wrap-up.
- Newsletter pieces close with a sign-off plus a P.S.

BANNED WORDS — presence of any of these should actively LOWER the relevant score: leverage, game-changer, revolutionize, unlock, harness, dive deep, let's explore.

Dimensions:
1. Clarity (0–5): Is the main point immediately obvious, delivered the way this writer delivers points — through a concrete moment or fragment, not a thesis sentence? Can a reader state the takeaway in one sentence after reading?
2. Hook (0–5): Does the opening drop into a specific experience (not a general claim)? Does the first line or two use the short-sentence/fragment rhythm to create tension, rather than a generic scroll-stopping question or stat?
3. Value (0–5): Does it deliver real, specific insight, structured as confession-before-lesson? Or is it vague, generic advice that could've come from anyone?
4. Authenticity (0–5): Does this piece actually sound like THIS writer's Voice DNA? Score down for: bolded emphasis instead of ALL CAPS, missing em dashes where a colon/semicolon was used instead, no fragment triplets or short punch sentences after setups, no parenthetical asides, an opening that states a thesis instead of a specific experience, a tidy summary close instead of a forward-leaning one, a newsletter piece missing its sign-off/P.S., or any banned word. Score up for pieces that hit multiple of these markers naturally.
5. CTA (0–5): Is there a clear next step that closes forward (not a tidy summary)? Does it match what the content just promised, and does it read like this writer's voice rather than a generic CTA?

Return ONLY valid JSON, no other text:
{
  "dimensions": {
    "clarity": { "score": number, "note": "one specific observation (1-2 sentences)" },
    "hook": { "score": number, "note": "one specific observation (1-2 sentences)" },
    "value": { "score": number, "note": "one specific observation (1-2 sentences)" },
    "authenticity": { "score": number, "note": "one specific observation (1-2 sentences)" },
    "cta": { "score": number, "note": "one specific observation (1-2 sentences)" }
  },
  "fixes": [
    "Specific, actionable fix #1 — quote the problem text, tell them exactly what to change",
    "Specific, actionable fix #2",
    "Specific, actionable fix #3"
  ],
  "rewrites": [
    {
      "original": "exact excerpt from the post (15–40 words)",
      "suggested": "your improved version of that same excerpt",
      "reason": "why this version is stronger (1 sentence)"
    },
    {
      "original": "another excerpt",
      "suggested": "improved version",
      "reason": "reason"
    }
  ]
}`,
      messages: [{ role: "user", content: content.slice(0, 8000) }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    const data = extractJsonFromClaude(raw) as {
      dimensions?: Record<string, { score: number; note: string }>;
      fixes?: string[];
      rewrites?: Array<{ original: string; suggested: string; reason: string }>;
    } | null;

    if (!data?.dimensions) {
      return NextResponse.json({ error: "Failed to parse score" }, { status: 500 });
    }

    const dims = data.dimensions;
    const total = Object.values(dims).reduce((sum, d) => sum + (d.score ?? 0), 0);
    const grade = calcGrade(total);

    const result = {
      grade,
      overall_score: total,
      dimensions: dims,
      fixes: data.fixes ?? [],
      rewrites: data.rewrites ?? [],
    };

    if (save) {
      const supabase = createServerClient();
      await supabase.from("post_scores").insert({
        content_preview: content.slice(0, 300),
        overall_score: total,
        grade,
        dimensions_json: dims,
        fixes_json: data.fixes ?? [],
        rewrites_json: data.rewrites ?? [],
        created_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
