import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase-server";

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CONTENT_TYPE_LABELS: Record<string, string> = {
  landing_page: "landing page",
  email: "email",
  social_post: "social post",
  offer_description: "offer description",
  other: "content",
};

const AUDIENCE_LABELS: Record<string, string> = {
  cold: "cold (never heard of you)",
  warm: "warm (aware of you, not yet a buyer)",
  hot: "hot (ready to buy, just needs the right push)",
};

export async function POST(req: NextRequest) {
  const { advisor_id, subject, subject_type, input_content, audience_temperature } =
    await req.json();

  if (!advisor_id || !subject || !subject_type || !input_content) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data: advisor } = await supabase
    .from("advisors")
    .select("id, name, specialty, system_prompt, avatar_color")
    .eq("id", advisor_id)
    .single();

  if (!advisor) {
    return NextResponse.json({ error: "Advisor not found." }, { status: 404 });
  }

  const contentTypeLabel = CONTENT_TYPE_LABELS[subject_type] ?? "content";
  const audienceLabel = AUDIENCE_LABELS[audience_temperature] ?? audience_temperature;

  const systemPrompt = `${advisor.system_prompt}

When giving feedback, be direct and specific. Name the exact problem and the exact fix. No vague suggestions.`;

  const userMessage = `Please critique the following ${contentTypeLabel} aimed at a ${audienceLabel} audience.

Subject: ${subject}

---
${input_content}
---

Return your critique as valid JSON with this exact structure:
{
  "key_finding": "Your single most important observation in one sentence",
  "overall_assessment": "2–3 sentence overall take on this piece",
  "strengths": ["specific strength", "specific strength"],
  "weaknesses": ["specific weakness", "specific weakness"],
  "recommendations": [
    { "issue": "what's wrong", "fix": "exactly what to change" }
  ],
  "audience_fit": "How well does this land with a ${audience_temperature} audience and what would tighten it?"
}

Return only the JSON object. No preamble, no markdown fences.`;

  let critiqueText = "";
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });
    critiqueText =
      message.content[0].type === "text" ? message.content[0].text : "";
  } catch (err) {
    return NextResponse.json(
      { error: `Claude API error: ${(err as Error).message}` },
      { status: 500 }
    );
  }

  // Parse JSON — strip markdown fences if Claude added them
  let critiqueJson: Record<string, unknown> = {};
  try {
    const cleaned = critiqueText.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    critiqueJson = JSON.parse(cleaned);
  } catch {
    // Store raw text if JSON parse fails
    critiqueJson = { raw: critiqueText };
  }

  // Save to DB
  const { data: saved, error: saveError } = await supabase
    .from("advisor_critiques")
    .insert({
      advisor_id,
      subject: subject.trim(),
      subject_type,
      input_content: input_content.trim(),
      critique_json: critiqueJson,
    })
    .select()
    .single();

  if (saveError) {
    return NextResponse.json({ error: saveError.message }, { status: 500 });
  }

  return NextResponse.json({
    critique: saved,
    advisor_name: advisor.name,
    advisor_color: advisor.avatar_color,
  });
}
