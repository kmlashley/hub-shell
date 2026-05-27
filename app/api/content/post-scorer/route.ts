import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase-server";
import { extractJsonFromClaude } from "@/lib/research/api-clients";
import { BUSINESS_CONTEXT, AUDIENCE_CONTEXT } from "@/lib/research/context";

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  const { post_id, content, title }: { post_id?: string; content: string; title?: string } = await request.json();

  if (!content) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: `You are a content quality scorer for a content creator.

${BUSINESS_CONTEXT}

Target audience: ${AUDIENCE_CONTEXT}

Score this post across 5 dimensions (0-20 each, 100 total):

1. **Voice Match** (0-20): Does it sound like the person described in the business context? Conversational? Personal stories? Or generic and corporate?
2. **Audience Fit** (0-20): Will the target audience recognize themselves? Does it speak to their real pain?
3. **Substance** (0-20): Does it provide real value, specific examples, actionable steps? Or is it vague and generic?
4. **SEO Structure** (0-20): Keyword use, heading hierarchy, scannability, meta description quality.
5. **Differentiation** (0-20): Does it have a unique angle? Or is it the same article everyone else would write?

Return JSON:
{
  "total_score": number,
  "breakdown": {
    "voice_match": { "score": number, "feedback": "string" },
    "audience_fit": { "score": number, "feedback": "string" },
    "substance": { "score": number, "feedback": "string" },
    "seo_structure": { "score": number, "feedback": "string" },
    "differentiation": { "score": number, "feedback": "string" }
  },
  "top_strength": "string",
  "top_weakness": "string",
  "priority_edits": ["string — specific, actionable edit suggestions"],
  "publish_ready": true | false
}

Return ONLY valid JSON.`,
      messages: [
        {
          role: "user",
          content: `Title: ${title ?? "Untitled"}\n\n${content.slice(0, 8000)}`,
        },
      ],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    const scoreData = extractJsonFromClaude(raw) as {
      total_score?: number;
      publish_ready?: boolean;
    } | null;

    if (!scoreData) {
      return NextResponse.json({ error: "Failed to parse score" }, { status: 500 });
    }

    // Update post record if post_id provided
    if (post_id) {
      const supabase = createServerClient();
      await supabase
        .from("blog_posts")
        .update({
          score: scoreData.total_score,
          score_breakdown: scoreData,
          status: scoreData.publish_ready ? "approved" : "review",
          updated_at: new Date().toISOString(),
        })
        .eq("id", post_id);
    }

    return NextResponse.json({ success: true, score: scoreData });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
