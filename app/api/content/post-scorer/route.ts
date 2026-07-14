import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase-server";
import { extractJsonFromClaude } from "@/lib/research/api-clients";
import { BUSINESS_CONTEXT } from "@/lib/research/context";
import { loadVoiceDna } from "@/lib/voice-dna";

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type Lane = "educator" | "business" | "agency";

interface HardGate {
  name: string;
  status: "PASS" | "FAIL";
  evidence: string;
}

interface SoftCheck {
  name: string;
  status: "✓" | "~" | "✗";
  evidence: string;
}

interface TopFix {
  issue: string;
  suggestion: string;
}

interface ScorerResponse {
  lane?: Lane;
  lane_note?: string;
  hard_gates?: HardGate[];
  soft_checks?: SoftCheck[];
  top_fixes?: TopFix[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Educator-lane hard gates and soft checks. These are NOT printed anywhere in
// docs/Michele_Lashley_Voice_DNA.md as an enumerated checklist (unlike the
// business/agency lanes, which have one in Section 8) — they operationalize
// the opener/confession/closer/banned-word rules from Sections 1-7 into
// pass/fail and scored checks.
// SYNC WITH docs/Michele_Lashley_Voice_DNA.md — if the opener patterns,
// closer shape, confession-beat description, or banned-word list in Sections
// 1-7 change, revisit this list to match.
// ─────────────────────────────────────────────────────────────────────────────
const EDUCATOR_GATES_AND_CHECKS = `
EDUCATOR LANE — HARD GATES (pass/fail; any FAIL → verdict "NOT READY"):
1. One idea: the post makes exactly one argument or teaches one build.
2. Opener: a specific personal scene, story, or confession within the first three paragraphs — never thesis-first, stat-first, or definition-first.
3. Confession beat: Michele appears inside the problem (a mistake, fear, or realization) before the lesson lands.
4. One conversion job: exactly one promotional CTA in the whole post.
5. Ending shape: final section → "Yours in [phrase]," sign-off → P.S. containing a genuine community question (no promo) → optional P.P.S. holding the single promo. Post must NOT end on a button, download, or tip jar.
6. Naming consistency: every framework/tool/concept keeps one name from first mention to last.
7. Nothing invented: flag any quote, testimonial, statistic, or result that isn't verifiable from the draft's own context as "VERIFY: real?" in the evidence field. If nothing needs flagging, PASS.
8. Banned words: zero instances of game-changer, revolutionize, leverage, unlock, harness, dive deep, let's explore.

EDUCATOR LANE — SOFT CHECKS (✓ / ~ / ✗ with one-line evidence each):
9. Length band 900-1,800 words (build stories with results may reach ~2,000).
10. Emphasis budget: bold limited to max two single-line thesis moments; CAPS carries in-sentence emphasis, max two moments; high-energy punctuation max two.
11. Flattened-middle scan: flag any stretch of 3+ consecutive paragraphs with no em-dash aside, parenthetical, confession beat, or short punch sentence.
12. Artifact exit: reader leaves with something usable (prompt, exercise, sorting question, download).
13. Proof beat: at least one named, specific result, reaction, source, or number.
14. Fellow-traveler language: we/us/our present; no stretch where Michele lectures from above.
15. Short-punch rhythm: at least a few 3-6 word landing sentences after longer buildups.
16. Internal link: one or two contextual links to older posts.
`.trim();

const BUSINESS_LANE_INSTRUCTIONS = `
BUSINESS LANE:
Use the "Post Scorer checklist (business content)" printed under Section 8 of the Voice DNA document below (it is numbered 1-10). Quote directly from that section — do not rely on memory of it, and do not invent items beyond what's printed there.
- Items 1-5 of that checklist are HARD GATES. Any FAIL → verdict "NOT READY."
- Items 6-10 of that checklist are SOFT CHECKS.
- Additionally, treat every ban listed under "Business-voice bans" in Section 8a as a HARD GATE failure if violated (ending on a CTA, "Leaders should" paragraphs with no "I" beat, mostly-bold paragraphs, framework name drift, performed certainty).
- Also apply these educator soft checks from the list above, scored the same way: #9 (length band), #11 (flattened-middle scan), #13 (proof beat), #15 (short-punch rhythm).
`.trim();

const AGENCY_LANE_INSTRUCTIONS = `
AGENCY LANE:
Everything in the BUSINESS LANE above, PLUS Section 8b of the Voice DNA document below (items 11-13 of the same numbered checklist).
- Items 11 and 12 are HARD GATES: any FAIL → verdict "NOT READY." Item 11 is the industry-specific confession requirement; item 12 is craft-concern-validated-never-framed-as-resistance plus the "embrace AI" / "adopt or die" / enterprise-transformation-jargon ban.
- Item 13 (vocabulary matches agency vs. in-house address) is a SOFT CHECK.
- Also verify zero instances of the banned Section 8b vocabulary: "digital transformation," "change management," "upskilling journey," "AI adoption roadmap." A hit on any of these is a HARD GATE failure (it falls under item 12's jargon ban).
`.trim();

export async function POST(request: NextRequest) {
  const {
    content,
    lane: requestedLane,
    save,
  }: { content: string; lane?: Lane; save?: boolean } = await request.json();

  if (!content?.trim()) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  try {
    // Fails loudly (throws) if the doc can't be read — no silent fallback
    // to a generic rubric.
    const voiceDna = await loadVoiceDna();

    const laneIsGiven = requestedLane === "educator" || requestedLane === "business" || requestedLane === "agency";

    const system = `You are Michele Lashley's Post Scorer — a strict editor grading a draft against HER specific, documented voice rules, not generic content-marketing conventions.

Business context:
${BUSINESS_CONTEXT}

Below is the full Voice DNA source document. It is the single source of truth for every rule you apply. Quote directly from the draft AND, where relevant, from this document — never invent a rule that isn't grounded in it, and never score from memory instead of what's actually printed below.

<voice_dna_document>
${voiceDna}
</voice_dna_document>

LANE:
${
  laneIsGiven
    ? `The lane is given: "${requestedLane}". Use ONLY that lane's rule block below. Set lane_note to null.`
    : `No lane was given. Infer it from the content — "educator" (teaching an idea or build to a general audience), "business" (Sam-facing: SMB owners, HR/L&D, generalist leaders), or "agency" (Dana-facing: VP-level agency/comms leaders, industry-specific). Use ONLY that inferred lane's rule block below. Set "lane" to the lane you inferred, and set lane_note to a one-sentence justification that explicitly states this was an assumption.`
}

All three rule blocks are below for reference — apply only the one matching the lane (given or inferred), ignore the other two entirely:

${EDUCATOR_GATES_AND_CHECKS}

${BUSINESS_LANE_INSTRUCTIONS}

${AGENCY_LANE_INSTRUCTIONS}

RULES FOR EVERY GATE/CHECK:
- Every entry must include a real quote or specific location from the draft as evidence — no scores without receipts. If a gate/check genuinely has nothing to flag, evidence should say what you looked for and confirm it's present/absent (e.g. "Confession beat present in paragraph 2: '...'").
- Never rewrite the whole draft. You flag and suggest — nothing more.
- Do not invent quotes, testimonials, or statistics that aren't in the draft; if the draft itself contains one that looks unverifiable, flag it per the "nothing invented" rule.

CRITICAL JSON FORMATTING RULE: this output will be parsed with JSON.parse. When you quote the draft (or anything else) inside a string value, you MUST use single quotes or curly/smart quotes ('like this' or 'like this') for the quoted material, NEVER literal straight double quotes ("like this") inside a string value — those will break parsing. If the draft itself contains double-quoted dialogue, either paraphrase it or re-render it with single quotes when you quote it back. Double-check every string value before finalizing: it must contain zero unescaped " characters other than the ones opening and closing the value itself.

Return ONLY valid JSON, no other text, in this exact shape:
{
  "lane": "educator" | "business" | "agency",
  "lane_note": string or null,
  "hard_gates": [
    { "name": "short gate name", "status": "PASS" or "FAIL", "evidence": "quote or location" }
  ],
  "soft_checks": [
    { "name": "short check name", "status": "✓" or "~" or "✗", "evidence": "quote or location, one line" }
  ],
  "top_fixes": [
    { "issue": "the highest-impact problem, named specifically", "suggestion": "a concrete rewrite direction in Michele's actual voice — not generic advice" }
  ]
}
"top_fixes" must have exactly 3 entries, ranked by impact, highest first.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      system,
      messages: [{ role: "user", content: content.slice(0, 20000) }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    const data = extractJsonFromClaude(raw) as ScorerResponse | null;

    if (!data?.hard_gates || !data.lane) {
      return NextResponse.json({ error: "Failed to parse score" }, { status: 500 });
    }

    const hardGates = data.hard_gates;
    const softChecks = data.soft_checks ?? [];
    const topFixes = data.top_fixes ?? [];

    const gateFailureCount = hardGates.filter((g) => g.status === "FAIL").length;
    const verdict = gateFailureCount > 0 ? `NOT READY — ${gateFailureCount} gate failure${gateFailureCount === 1 ? "" : "s"}` : "READY TO PUBLISH";

    const result = {
      lane: data.lane,
      laneInferred: !laneIsGiven,
      laneNote: data.lane_note ?? null,
      verdict,
      gateFailureCount,
      hardGates,
      softChecks,
      topFixes,
    };

    if (save) {
      const supabase = createServerClient();
      await supabase.from("post_scores").insert({
        content_preview: content.slice(0, 300),
        lane: result.lane,
        lane_inferred: result.laneInferred,
        verdict: result.verdict,
        hard_gates_json: hardGates,
        soft_checks_json: softChecks,
        fixes_json: topFixes,
        created_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
