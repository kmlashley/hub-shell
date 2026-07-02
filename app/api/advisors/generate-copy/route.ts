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

export async function POST(req: NextRequest) {
  const { critique_id } = await req.json();

  if (!critique_id) {
    return NextResponse.json({ error: "critique_id is required." }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data: critique } = await supabase
    .from("advisor_critiques")
    .select("*, advisors(name, specialty, system_prompt, avatar_color)")
    .eq("id", critique_id)
    .single();

  if (!critique) {
    return NextResponse.json({ error: "Critique not found." }, { status: 404 });
  }

  const advisor = critique.advisors as {
    name: string;
    specialty: string;
    system_prompt: string;
    avatar_color: string;
  } | null;

  if (!advisor) {
    return NextResponse.json({ error: "Advisor not found." }, { status: 404 });
  }

  const contentTypeLabel =
    CONTENT_TYPE_LABELS[critique.subject_type] ?? "content";

  const systemPrompt = `${advisor.system_prompt}

Write copy that is direct and specific to the audience. No placeholder text. No meta-commentary. Write the actual copy.`;

  const critiqueJson = critique.critique_json as Record<string, unknown>;
  const critiqueSummary =
    typeof critiqueJson.overall_assessment === "string"
      ? critiqueJson.overall_assessment
      : JSON.stringify(critiqueJson).slice(0, 400);

  const userMessage = `Based on your critique of "${critique.subject}", write improved ${contentTypeLabel} copy.

Original content:
${critique.input_content}

Your critique summary:
${critiqueSummary}

Now write the improved copy directly. No preamble or explanation — just the copy itself, ready to use.`;

  let copyText = "";
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });
    copyText = message.content[0].type === "text" ? message.content[0].text : "";
  } catch (err) {
    return NextResponse.json(
      { error: `Claude API error: ${(err as Error).message}` },
      { status: 500 }
    );
  }

  const { data: saved, error: saveError } = await supabase
    .from("generated_copy")
    .insert({
      critique_id,
      advisor_id: critique.advisor_id,
      subject: critique.subject,
      subject_type: critique.subject_type,
      full_copy: copyText.trim(),
      applied: false,
    })
    .select()
    .single();

  if (saveError) {
    return NextResponse.json({ error: saveError.message }, { status: 500 });
  }

  return NextResponse.json({ copy: saved });
}
