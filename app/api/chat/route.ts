import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { BUSINESS_CONTEXT } from "@/lib/research/context";

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: NextRequest) {
  const { messages }: { messages: ChatMessage[] } = await request.json();

  const stream = await anthropic.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: `You are a helpful AI assistant for this business. You have full context of the business below and can help with strategy, content ideas, research questions, offer development, and any other business task.

${BUSINESS_CONTEXT}

Be direct and specific. You know this business — don't give generic advice. If you need more context to answer well, ask.`,
    messages,
  });

  // Stream the response text directly
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (
          chunk.type === "content_block_delta" &&
          chunk.delta.type === "text_delta"
        ) {
          controller.enqueue(encoder.encode(chunk.delta.text));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
