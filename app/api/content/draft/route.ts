import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase-server";
import { BUSINESS_CONTEXT } from "@/lib/research/context";

export const maxDuration = 120;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface WritingBrief {
  primary_keyword?: string;
  secondary_keywords?: string[];
  content_format?: string;
  target_word_count?: number;
  h2_headings?: string[];
  faq_questions?: string[];
  differentiation_angle?: string;
  opening_hook?: string;
  cta_suggestion?: string;
}

export async function POST(request: NextRequest) {
  const { brief_id, brief }: { brief_id?: string; brief: WritingBrief } = await request.json();

  if (!brief) {
    return NextResponse.json({ error: "brief is required" }, { status: 400 });
  }

  const supabase = createServerClient();

  try {
    const response = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 8000,
      system: `You are a content writer for this business.

${BUSINESS_CONTEXT}

Write a complete blog post based on the writing brief provided. The post should:
- Match the voice and perspective described in the business context
- Lead with a story or concrete observation, not a generic intro
- Use the exact primary keyword naturally throughout
- Answer the FAQ questions within the content (don't use them as subheadings)
- End with the suggested CTA, adapted to feel natural
- Hit approximately the target word count

Write the full post in markdown. Include all H2 headings from the brief.

After the post, on a new line, add a JSON block wrapped in \`\`\`json fences with:
{
  "word_count": number,
  "primary_keyword": "string",
  "excerpt": "1-2 sentence excerpt for email/social previews",
  "seo_meta_description": "155-160 character meta description",
  "suggested_slug": "url-friendly-slug"
}`,
      messages: [
        {
          role: "user",
          content: `Writing brief:\n${JSON.stringify(brief, null, 2)}\n\nWrite the full post now.`,
        },
      ],
    });

    const fullText = response.content[0].type === "text" ? response.content[0].text : "";

    // Split post content from metadata JSON
    const jsonFenceIdx = fullText.lastIndexOf("```json");
    const postContent = jsonFenceIdx > -1 ? fullText.slice(0, jsonFenceIdx).trim() : fullText.trim();
    let metadata: Record<string, unknown> = {};

    if (jsonFenceIdx > -1) {
      const jsonStr = fullText.slice(jsonFenceIdx).replace(/```json\s*/, "").replace(/```$/, "").trim();
      try { metadata = JSON.parse(jsonStr); } catch { /* metadata optional */ }
    }

    // Extract title from the first H1 heading
    const titleMatch = postContent.match(/^#\s+(.+)$/m);
    const title = titleMatch?.[1] ?? brief.primary_keyword ?? "Untitled Post";

    // Save to blog_posts as draft
    const { data: post, error } = await supabase
      .from("blog_posts")
      .insert({
        title,
        content: postContent,
        status: "draft",
        primary_keyword: brief.primary_keyword,
        excerpt: (metadata.excerpt as string) ?? null,
        seo_meta_description: (metadata.seo_meta_description as string) ?? null,
        tags: brief.secondary_keywords ?? [],
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Mark the brief as approved if brief_id provided
    if (brief_id) {
      await supabase
        .from("agent_outputs")
        .update({ status: "approved", updated_at: new Date().toISOString() })
        .eq("id", brief_id);
    }

    return NextResponse.json({ success: true, post_id: (post as { id: string }).id, title, metadata });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
