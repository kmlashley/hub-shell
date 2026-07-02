// ─────────────────────────────────────────────────────────────────────────────
// Business Context — injected into every research and synthesis agent prompt.
//
// HOW TO FILL THIS IN:
// 1. Copy the values you wrote in DESIGN.md (the "Your Brand Voice" section)
// 2. Replace every [PLACEHOLDER] below with your real information
// 3. The more specific you are, the better your AI outputs will be
// 4. Vague context = vague, generic content opportunities
// ─────────────────────────────────────────────────────────────────────────────

export const YOUR_NAME = "Michele Lashley";
export const YOUR_BUSINESS_NAME = "AI Teaching and Learning Architect (michelelashley.com / aiteachingarchitect.com)";

// Who you serve and what you help them do — 1-2 sentences
export const NICHE_CONTEXT = `
I help educators design AI-integrated learning experiences that build student judgment instead of replacing it, and I help organizations build real AI literacy on their teams — not AI dependency.
One idea runs under both: AI can elevate thinking, but the thinking has to already be there.
`.trim();

// Who your ideal reader/buyer is — be specific about age, career stage, pain point
export const AUDIENCE_CONTEXT = `
Two connected audiences in the messy middle of AI adoption — not skeptics, not evangelists. Educators (professors, instructional designers, faculty developers, 40s-50s, mid-to-senior career) redesigning assignments to protect student thinking.
Corporate and organizational leaders (HR/L&D directors, CLOs, SMB owners) who know AI matters but need a defensible plan, not more hype.
`.trim();

// What you want content to accomplish
export const CONTENT_GOALS = `
Current sprint priority order:
1. Grow the combined email list past baseline
2. Fill Build It Sessions ($150/60 min) with educators via proof-of-concept YouTube builds
3. Seed agency-world Sam on LinkedIn ahead of a dedicated agency-lane push this fall
4. Keep the AI Mapping Session ($500) visible to corporate/SMB Sam as a longer-trust-cycle offer
`.trim();

// Your 5-7 core content topics — what you write, teach, and talk about
export const CORE_TOPICS = `
- Designing assignments AI can't shortcut — evidence of thinking, not just finished product
- Building custom GPTs and classroom AI tools tied to a specific rubric or course
- The line between AI literacy and AI dependency in student work
- What AI can't do — starting there before what it can
- Building organizational AI literacy without productivity-hack hype
- Judgment and oversight — how teams evaluate AI output, not just use tools
- What good AI adoption looks like for knowledge-work and communications teams (agencies, L&D)
`.trim();

// Your main competitors or adjacent creators to track
// These are used by the competitive research agent
export const COMPETITORS = `
- Erika Stanley — AI Queens (aiqueens.substack.com, erikastanley.com)
- Jason Gulya — The AI Edventure (higherai.substack.com)
- Lance Eaton — AI + Education = Simplified (aiedusimplified.substack.com)
- Bryan Alexander — AI, Academia, and the Future (aiandacademia.substack.com)
- Ross Stevenson — L&D-focused AI voice (LinkedIn)
`.trim();


// ─── Combined Context Strings ──────────────────────────────────────────────
// These are what actually get injected into agent prompts.
// They combine the individual pieces above into a coherent brief.

export const BUSINESS_CONTEXT = `
## About This Business
Owner: ${YOUR_NAME}
Business: ${YOUR_BUSINESS_NAME}

### Niche
${NICHE_CONTEXT}

### Target Audience
${AUDIENCE_CONTEXT}

### Content Goals
${CONTENT_GOALS}

### Core Topics
${CORE_TOPICS}
`.trim();

export const CONTENT_STRATEGY = `
## Content Strategy

### Objectives
All content should serve the audience described above.
- Research must prioritize topics that address real audience pain points
- Every content opportunity should tie to a concrete goal (list growth, offer awareness, authority)
- Every brief should have a differentiation angle — something competitors are NOT covering

### Competitors to Monitor
${COMPETITORS}

### Quality Bar
- Substance over flash. No listicle content without depth.
- Real proof and examples over vague claims.
- Stage-appropriate — speaks to where the audience actually is, not where we wish they were.
`.trim();
