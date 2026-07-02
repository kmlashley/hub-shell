import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase-server";
import { searchWithTavily, extractJsonFromClaude } from "@/lib/research/api-clients";

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type ClaimStatus = "accurate" | "outdated" | "incorrect" | "unverified";

interface VerifiedClaim {
  claim: string;
  status: "accurate";
  note: string;
}

interface FlaggedClaim {
  claim: string;
  status: Exclude<ClaimStatus, "accurate">;
  what_is_wrong: string;
  what_is_correct: string;
  source: string;
}

export interface VerificationResult {
  summary: string;
  verified: VerifiedClaim[];
  flagged: FlaggedClaim[];
  corrected_content: string;
}

export async function POST(request: NextRequest) {
  const {
    content,
    save,
    results,
  }: {
    content: string;
    save?: boolean;
    results?: VerificationResult;
  } = await request.json();

  if (!content?.trim()) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  if (save && results) {
    try {
      const supabase = createServerClient();
      await supabase.from("verification_runs").insert({
        content_preview: content.slice(0, 300),
        results_json: results,
        flags_count: results.flagged.length,
        created_at: new Date().toISOString(),
      });
      return NextResponse.json({ success: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
  }

  try {
    // Step 1: Extract verifiable claims from the content
    const extractResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: `Extract all verifiable factual claims from the content. Focus on:
- AI tool names, features, and capabilities
- Pricing and subscription costs
- Model names and version numbers
- Release dates and timelines
- Company names and their products
- Statistics and data points
- Technical specifications

Return ONLY a JSON array of claim strings, no other text:
["claim 1", "claim 2", ...]

Limit to the 8 most important/specific claims. Skip obvious generalities.`,
      messages: [{ role: "user", content: content.trim() }],
    });

    const extractRaw =
      extractResponse.content[0].type === "text" ? extractResponse.content[0].text : "[]";
    let claims: string[] = [];
    try {
      const parsed = extractJsonFromClaude(extractRaw);
      claims = Array.isArray(parsed) ? (parsed as string[]) : [];
    } catch {
      claims = [];
    }

    // Step 2: Search for each claim in parallel (non-fatal)
    const searchResults = await Promise.allSettled(
      claims.map((claim) =>
        searchWithTavily(`fact check: ${claim}`, {
          searchDepth: "advanced",
          maxResults: 3,
          includeAnswer: true,
        })
      )
    );

    const claimContext = claims
      .map((claim, i) => {
        const sr = searchResults[i];
        if (sr.status === "rejected") return `Claim: "${claim}"\nSearch: unavailable`;
        const answer = sr.value.answer ?? "";
        const snippets = sr.value.results
          .slice(0, 2)
          .map((r) => `  - ${r.title}: ${r.content.slice(0, 150)}`)
          .join("\n");
        return `Claim: "${claim}"\nSearch answer: ${answer}\nSources:\n${snippets}`;
      })
      .join("\n\n---\n\n");

    // Step 3: Synthesize into a verification report + corrected content
    const verifyResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      system: `You are a technical fact-checker specializing in AI tools, software, and pricing. Review the claims against the search evidence and produce a verification report.

Be precise:
- "accurate": confirmed by search evidence
- "outdated": was true but is no longer (e.g. old pricing, deprecated feature)
- "incorrect": factually wrong based on evidence
- "unverified": no clear evidence either way — flag with caution note

For the corrected_content: rewrite the original content with all flagged items fixed inline. Keep the tone and structure identical — only change what's factually wrong.

Return ONLY valid JSON, no other text:
{
  "summary": "1–2 sentence overview of the verification results",
  "verified": [
    {
      "claim": "The exact claim from the content",
      "status": "accurate",
      "note": "Brief confirmation of why this is accurate"
    }
  ],
  "flagged": [
    {
      "claim": "The exact claim from the content",
      "status": "outdated",
      "what_is_wrong": "What specifically is wrong or outdated",
      "what_is_correct": "The accurate version of this information",
      "source": "Where this correction comes from (e.g. 'OpenAI pricing page', 'Anthropic docs')"
    }
  ],
  "corrected_content": "Full rewritten content with corrections applied"
}`,
      messages: [
        {
          role: "user",
          content: `Original content:
---
${content.trim()}
---

Claims and search evidence:
${claimContext || "(No claims extracted)"}`,
        },
      ],
    });

    const verifyRaw =
      verifyResponse.content[0].type === "text" ? verifyResponse.content[0].text : "";
    const data = extractJsonFromClaude(verifyRaw) as VerificationResult | null;

    if (!data?.summary) {
      return NextResponse.json({ error: "Failed to verify content" }, { status: 500 });
    }

    return NextResponse.json({ success: true, result: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
