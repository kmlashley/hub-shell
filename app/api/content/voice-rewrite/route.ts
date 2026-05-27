import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { BUSINESS_CONTEXT } from "@/lib/research/context";

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  const { content, instructions }: { content: string; instructions?: string } = await request.json();

  if (!content) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 8000,
      system: `You are a voice editor. Your job is to rewrite content so it sounds like the person described below — without changing the substance, information, or structure.

${BUSINESS_CONTEXT}

Voice editing rules:
- Keep all the facts, examples, and structure intact
- Make it sound like a real person talking, not an article
- Vary sentence length dramatically — fragments are fine, long flowing sentences are fine
- Remove corporate-speak and generic filler phrases
- Add the personality that makes this business's voice distinct
- The reader should not be able to tell it was edited — it should feel effortless

${instructions ? `Additional instructions: ${instructions}` : ""}`,
      messages: [
        {
          role: "user",
          content: `Rewrite this content in the authentic voice described:\n\n${content}`,
        },
      ],
    });

    const rewritten = response.content[0].type === "text" ? response.content[0].text : "";
    return NextResponse.json({ success: true, rewritten });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
