import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { extractJsonFromClaude } from "@/lib/research/api-clients";
import { BUSINESS_CONTEXT } from "@/lib/research/context";

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const FORMAT_INSTRUCTIONS: Record<string, string> = {
  Rally: `A rallying cry around a shared belief or frustration. Gets people nodding and fired up. Structure: name the belief → validate the reader's experience → issue a call to action or reframe. Ends with momentum, not a question. First-person or direct address. No bullet points.`,

  "Contrarian Take": `Challenges a popular assumption your audience holds or has heard. Creates productive tension. Structure: state the common belief → flip it with a specific counter-claim → back it with a quick reason or proof point. Sharp, confident, not angry. No hedging. Under 200 characters preferred.`,

  "Quick Win": `One specific, immediately actionable tip. No preamble. Delivers the win in the first sentence, then adds one sentence of context or proof. Format: lead with the action ("Do X to get Y"), not the insight. Practical over philosophical.`,

  Observation: `A sharp, specific thing you noticed — about the industry, your audience, a pattern, a contradiction. Shows expertise through specificity. Structure: state the observation precisely → add the implication or why it matters. Reads like a smart person thinking out loud. No generic takes.`,
};

export async function POST(request: NextRequest) {
  const { input, format }: { input: string; format: string } = await request.json();

  if (!input?.trim()) {
    return NextResponse.json({ error: "input is required" }, { status: 400 });
  }
  if (!FORMAT_INSTRUCTIONS[format]) {
    return NextResponse.json({ error: "invalid format" }, { status: 400 });
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1200,
      system: `You are a Substack Notes ghostwriter. You write in the voice of the business owner described below.

${BUSINESS_CONTEXT}

Voice rules:
- Direct and specific. No fluff, no throat-clearing.
- Sounds like a smart practitioner, not a marketer.
- Never starts with "I" as the first word.
- No em dashes (—). No bullet points inside notes.
- Substack Notes have a 280-character soft limit but can run longer. Aim for 180–280 characters unless the idea genuinely needs more space.
- Each variation takes a different angle on the same core idea.

Format to write: ${format}
Format instructions: ${FORMAT_INSTRUCTIONS[format]}

Return ONLY valid JSON, no other text:
{
  "variations": [
    { "note": "the note text", "angle": "one phrase describing the angle (e.g. 'Opens with the frustration')" },
    { "note": "the note text", "angle": "one phrase describing the angle" },
    { "note": "the note text", "angle": "one phrase describing the angle" }
  ]
}`,
      messages: [
        {
          role: "user",
          content: `Write 3 ${format} note variations based on this input:\n\n${input.slice(0, 3000)}`,
        },
      ],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    const data = extractJsonFromClaude(raw) as {
      variations?: Array<{ note: string; angle: string }>;
    } | null;

    if (!data?.variations?.length) {
      return NextResponse.json({ error: "Failed to generate notes" }, { status: 500 });
    }

    return NextResponse.json({ success: true, variations: data.variations });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
