import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { extractJsonFromClaude } from "@/lib/research/api-clients";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  const { title, key_points, cta } = await request.json();

  if (!title?.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: `You write YouTube video hooks — the first 30 seconds that make someone stay or leave. Great hooks establish a problem, promise, or curiosity gap immediately.

Hook types to generate one of each:
1. "Pattern interrupt" — opens with a surprising or counterintuitive statement
2. "Problem agitation" — opens by naming the exact frustration the viewer has right now
3. "Bold promise" — opens with a specific, concrete outcome the video delivers

Each hook should be 2–3 sentences max. Write them to be spoken aloud — punchy, no jargon, no throat-clearing.

Return ONLY a JSON array of 3 hook objects, no other text:
[
  { "type": "Pattern Interrupt", "hook": "..." },
  { "type": "Problem Agitation", "hook": "..." },
  { "type": "Bold Promise", "hook": "..." }
]`,
      messages: [
        {
          role: "user",
          content: `Video title: "${title}"
${key_points?.length ? `Key points:\n${(key_points as string[]).map((p: string) => `- ${p}`).join("\n")}` : ""}
${cta ? `CTA / outcome: ${cta}` : ""}`,
        },
      ],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "[]";
    const hooks = extractJsonFromClaude(raw) as Array<{ type: string; hook: string }> | null;

    if (!Array.isArray(hooks)) {
      return NextResponse.json({ error: "Failed to generate hooks" }, { status: 500 });
    }

    return NextResponse.json({ success: true, hooks });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
