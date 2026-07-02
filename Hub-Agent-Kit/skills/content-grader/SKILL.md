# Content Grader Skill
## From SPARK Lab — built by Kim Doyal / AI Spark Studios

---

## What this skill does

Scores any blog post, newsletter, or article across 6 dimensions for AEO (Answer Engine Optimization) and SEO performance. Returns honest grades, specific fixes, and rewrite suggestions you can act on immediately.

AEO = how well your content gets cited by AI engines like ChatGPT, Perplexity, and Google AI Overviews. This is where search is going. This skill scores both the traditional SEO fundamentals AND the newer AEO signals that most scoring tools ignore.

---

## How to use

Paste or load your content, then ask:

```
Grade this content for AEO and SEO.
```

Optional context you can add:
- `Focus keyword: [keyword]`
- `Target audience: [who you're writing for]`
- `Content goal: rank_in_search | get_cited_by_ai | convert_readers`

Examples:
```
Grade this content for AEO and SEO. Focus keyword: AI tools for solopreneurs. Target audience: midlife women entrepreneurs.
```
```
Grade this content. Goal: get_cited_by_ai.
```

---

## Scoring dimensions (1–5 scale)

### 1. Answer Engine Readiness (AEO)
Can AI engines extract direct, citable answers from this content?

| Score | What it means |
|-------|--------------|
| 5 | Question-based H2/H3s throughout; direct 1-2 sentence answers follow each heading; every section could stand alone as an AI citation; FAQ section present |
| 4 | Most headings are question-based; most sections have direct answers; near-standalone |
| 3 | Some question headings; answers present but buried or too long |
| 2 | Declarative headings only; answers require reading multiple paragraphs |
| 1 | No structural consideration for AI extraction; wall of text |

### 2. Schema & Structure
Is the content structured for rich results and AI parsing?

| Score | What it means |
|-------|--------------|
| 5 | Clear H1→H2→H3 hierarchy; paragraphs under 60 words; lists used appropriately; strong topic sentences; clean formatting |
| 4 | Good hierarchy; most paragraphs tight; some formatting opportunities missed |
| 3 | Heading hierarchy present but inconsistent; some long paragraphs |
| 2 | Flat structure; long paragraphs dominate; heading hierarchy unclear |
| 1 | No meaningful structure; wall of text |

### 3. Conversational Voice
Does this content read naturally when spoken aloud by an AI assistant?

| Score | What it means |
|-------|--------------|
| 5 | Natural spoken rhythm; question-answer flow; under 50 word avg paragraph; no unexplained jargon; would sound authoritative read aloud |
| 4 | Mostly conversational; occasional stiff phrasing; good flow overall |
| 3 | Mix of conversational and formal; some sections flow well, others don't |
| 2 | Mostly formal or academic tone; complex sentence structures |
| 1 | Dense, formal, or jargon-heavy; clearly written for text, not voice |

### 4. E-E-A-T Signals
Does this content signal Experience, Expertise, Authoritativeness, and Trustworthiness?

| Score | What it means |
|-------|--------------|
| 5 | First-person experience clearly demonstrated; specific credentials or track record referenced; data or sources cited; unique perspective not found elsewhere |
| 4 | Good expertise signals; some personal experience; mostly specific |
| 3 | Some expertise signals; partially generic advice; limited unique perspective |
| 2 | Generic advice that could come from anyone; no personal experience; no sources |
| 1 | No expertise signals; interchangeable with similar content |

### 5. SEO Fundamentals
Traditional on-page SEO signals that still matter.

| Score | What it means |
|-------|--------------|
| 5 | Focus keyword in title, first paragraph, and 2+ headings; natural keyword density; appropriate content depth |
| 4 | Good keyword usage; minor optimization opportunities; solid depth |
| 3 | Keyword present but placement suboptimal; some depth issues |
| 2 | Keyword rarely appears; thin content; significant optimization gaps |
| 1 | No apparent keyword strategy; very thin or off-topic content |

### 6. GEO & Multi-Turn Support
Will generative AI cite this content, and does it support conversation threads?

| Score | What it means |
|-------|--------------|
| 5 | Unique data, insights, or perspective not found elsewhere; highly quotable statements; anticipates follow-up questions; related subtopics covered |
| 4 | Some unique insights; mostly quotable; covers main follow-up questions |
| 3 | Mix of unique and generic content; some follow-up questions addressed |
| 2 | Mostly generic advice; few unique insights; AI has no reason to cite this over other sources |
| 1 | Entirely generic; no unique data or perspective |

---

## Grade scale

| Score | Grade |
|-------|-------|
| 5.0 | A+ |
| 4.5–4.9 | A |
| 4.0–4.4 | A- |
| 3.5–3.9 | B+ |
| 3.0–3.4 | B |
| 2.5–2.9 | B- |
| 2.0–2.4 | C+ |
| 1.5–1.9 | C |
| 1.0–1.4 | D |

---

## Goal calibration

If a content goal is provided, weight scoring accordingly:

- `rank_in_search` → weight SEO Fundamentals and Schema more heavily
- `get_cited_by_ai` → weight Answer Engine Readiness and GEO more heavily
- `convert_readers` → weight E-E-A-T and Conversational Voice more heavily
- No goal → score all dimensions equally

---

## Output format

Return a complete report structured as:

```
OVERALL: [score]/5.0 — Grade [X]
[2-3 sentence honest summary]

AEO QUICK CHECK
Verdict: Yes / Possibly / No — would an AI assistant cite a section of this content?
Reasons: [2-3 specific reasons]
Flip it: [the single most impactful change to flip a No/Possibly to Yes]

DIMENSIONS
[For each of the 6 dimensions:]
[Name]: [score]/5 — [Grade]
[2-3 sentences specific to this piece of content]
Quick wins: [specific fixes, marked ⚡ if doable in under 30 minutes]

TOP 3 FIXES (ranked by impact)
1. [Fix] — [why this one first] — Effort: [quick win / medium / heavy lift]
2. [Fix] — [why] — Effort: [...]
3. [Fix] — [why] — Effort: [...]

REWRITE SUGGESTIONS
[2-4 passages from the actual content that would most benefit from rewriting]
Original: [exact text]
Improved: [rewritten version]
Why better: [one sentence]
```

---

## Rules

- Score honestly. A 2/5 is useful information. Never inflate grades.
- Every piece of feedback must be specific to this content — no generic advice.
- Rewrite suggestions must use actual text from the submitted content. Never invent passages.
- Flag quick wins (⚡) on any fix doable in under 30 minutes that would meaningfully improve the score.
- If target_audience was provided, calibrate: is the tone appropriate? is the depth right? are examples relevant?
- If no focus keyword is provided, infer it from the content and note the inference.

---

## Intelligence layer notes

This skill is calibrated for established entrepreneurs writing content to build authority and attract clients — not developers, not SEO agencies. Feedback should:
- Use plain language (explain what AEO means if you use it)
- Be specific enough to act on without an SEO background
- Assume intelligence, not expertise

The audience has been burned by generic "add more keywords" advice. Give them the real picture.
