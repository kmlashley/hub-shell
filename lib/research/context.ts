// ─────────────────────────────────────────────────────────────────────────────
// Business Context — injected into every research and synthesis agent prompt.
//
// HOW TO FILL THIS IN:
// 1. Copy the values you wrote in DESIGN.md (the "Your Brand Voice" section)
// 2. Replace every [PLACEHOLDER] below with your real information
// 3. The more specific you are, the better your AI outputs will be
// 4. Vague context = vague, generic content opportunities
// ─────────────────────────────────────────────────────────────────────────────

export const YOUR_NAME = "[YOUR NAME]";
export const YOUR_BUSINESS_NAME = "[YOUR BUSINESS NAME]";

// Who you serve and what you help them do — 1-2 sentences
export const NICHE_CONTEXT = `
[FILL IN: Describe your niche precisely]
Example: "I help freelance designers build financial systems so they stop living paycheck to paycheck."
`.trim();

// Who your ideal reader/buyer is — be specific about age, career stage, pain point
export const AUDIENCE_CONTEXT = `
[FILL IN: Describe your ideal audience member specifically]
Example: "Creative freelancers, 28-45, earning $60-120k/year, skilled at their craft but overwhelmed by money management and business systems."
`.trim();

// What you want content to accomplish
export const CONTENT_GOALS = `
[FILL IN: What should content do for your business?]
Example: "Build trust with email list, warm people up to the $497 Money Intensive offer, grow YouTube channel to 10k subscribers."
`.trim();

// Your 5-7 core content topics — what you write, teach, and talk about
export const CORE_TOPICS = `
[FILL IN: List your 5-7 core topics, one per line]
Example:
- Freelance finances and pricing strategy
- Tax basics for self-employed creatives
- Building financial systems and automations
- Money mindset for freelancers
- Using AI tools for business systems
`.trim();

// Your main competitors or adjacent creators to track
// These are used by the competitive research agent
export const COMPETITORS = `
[FILL IN: List 3-5 competitors or adjacent creators]
Example:
- Creator A (website: creatorA.com, newsletter: substack.com/creatorA)
- Creator B (YouTube: @creatorb, blog: creatorb.com)
- Creator C (Instagram: @creatorc)
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
