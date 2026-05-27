# AI Business Hub — Shell

A forkable starting point for building your own AI-powered business command center.

This is not a SaaS tool you subscribe to. It's a codebase you own — a Next.js app that runs AI agents, manages content, and surfaces intelligence about your business. You customize it, you deploy it, you keep it.

---

## What This Is

An AI Business Hub is a personal command center where your AI agents do research, write content, score drafts, and surface the things you need to pay attention to. Everything flows through a five-layer pipeline:

```
Layer 1: Research      Agents scan the web — trends, competitors, keywords, audience conversations
Layer 2: Synthesis     One agent reads all L1 output and writes unified intelligence briefs
Layer 3: Human Review  YOU read the briefs, approve or redirect, before anything gets published
Layer 4: Content       Agents write, score, and verify content from approved briefs
Layer 5: Distribution  Automation handles publishing and cross-posting
```

The key design principle: **humans stay in the loop at Layer 3.** Nothing from the research pipeline touches publishing without your review. The hub surfaces AI-generated intelligence — you make the decisions.

---

## Tech Stack

| Layer | Tool | Why |
|-------|------|-----|
| Framework | Next.js 14 (App Router) | Full-stack, deploys free on Vercel |
| Database | Supabase | Postgres + real-time + auth, free tier available |
| AI | Claude API (Anthropic) | Best reasoning for content work |
| Research | Firecrawl | Web scraping for competitor/trend research |
| Research | Perplexity API | Real-time web search with citations |
| Styling | Tailwind CSS | Fast, tokens map to your brand |
| Deployment | Vercel | Free tier handles hobby traffic |

---

## Prerequisites

Before you start:

- [ ] A [Vercel](https://vercel.com) account (free)
- [ ] A [Supabase](https://supabase.com) account (free)
- [ ] An [Anthropic](https://console.anthropic.com) API key
- [ ] A [Firecrawl](https://firecrawl.dev) API key
- [ ] A [Perplexity](https://www.perplexity.ai/api) API key
- [ ] Node.js 18+ installed locally
- [ ] VS Code installed (recommended — this project is built to work with Claude Code)

---

## Getting Started

### 1. Fork and clone

```bash
# Fork this repo on GitHub first, then clone YOUR fork
git clone https://github.com/YOUR_USERNAME/ai-hub-shell.git
cd ai-hub-shell
npm install
```

### 2. Create your Supabase project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Choose a region close to you
3. Save your database password somewhere safe
4. Copy your Project URL and API keys (you'll need these next)

### 3. Set up your environment

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in every value. The file has comments explaining each one.

### 4. Run the database migrations

In your Supabase dashboard → SQL Editor, run each file in `supabase/migrations/` in order:

```
001_core_tables.sql      ← hub_data, research_reports, agent outputs
002_content_tables.sql   ← blog posts, content queue
003_agent_state.sql      ← agent workflow tracking
004_projects.sql         ← projects and project items
```

Copy each file's contents, paste into the SQL editor, and run.

### 5. Fill in your brand and voice

Open `DESIGN.md` and fill in every section — especially **Your Brand Voice**. Then paste those values into `lib/research/context.ts`. This is what gets injected into every agent prompt. The more specific you are, the better the AI output.

### 6. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Log in with the password you set in `HUB_PASSWORD`.

### 7. Deploy to Vercel

```bash
# Install Vercel CLI if you don't have it
npm i -g vercel

vercel
```

Follow the prompts. When asked about environment variables, Vercel will import them from your `.env.local` automatically during the link step, or you can add them manually in the Vercel dashboard under Settings → Environment Variables.

---

## File Structure

```
ai-hub-shell/
├── DESIGN.md                    ← Start here: brand colors, fonts, voice
├── README.md                    ← You're reading it
├── .env.example                 ← Copy to .env.local and fill in
│
├── app/                         ← Next.js App Router pages
│   ├── layout.tsx               ← Root layout (sidebar + auth wrapper)
│   ├── page.tsx                 ← Dashboard
│   ├── login/page.tsx           ← Password login
│   ├── review/page.tsx          ← Layer 3: Human review queue
│   ├── content/page.tsx         ← Content management
│   ├── intelligence/page.tsx    ← Research briefs and reports
│   ├── agents/page.tsx          ← Agent status and manual triggers
│   ├── projects/page.tsx        ← Project management
│   ├── notes/page.tsx           ← Quick notes
│   └── api/                     ← All backend logic lives here
│       ├── chat/route.ts        ← AI assistant endpoint
│       ├── research/            ← Layer 1: Research agents
│       │   ├── run-all/         ← Orchestrator (calls all L1 agents)
│       │   ├── keyword/         ← Keyword research agent
│       │   ├── competitive/     ← Competitor research agent
│       │   ├── content-trends/  ← Content trend scanning
│       │   └── audience/        ← Audience conversation mining
│       ├── synthesis/route.ts   ← Layer 2: Synthesis agent
│       ├── review/              ← Layer 3: Review queue CRUD
│       ├── content/             ← Layer 4: Content creation
│       │   ├── draft/           ← Blog post drafting agent
│       │   ├── post-scorer/     ← Scoring agent
│       │   └── voice-rewrite/   ← Voice consistency editor
│       └── distribution/        ← Layer 5: Publishing hooks
│
├── components/
│   ├── Sidebar.tsx              ← Navigation (edit NAV array to customize)
│   ├── AuthWrapper.tsx          ← Password auth gate
│   ├── GlobalChatBubble.tsx     ← Persistent AI assistant chat
│   └── dashboard/
│       ├── ReviewQueueCard.tsx  ← Shows pending review items
│       └── AskAssistantCard.tsx ← Quick AI chat widget
│
├── lib/
│   ├── supabase.ts              ← Client-side Supabase instance
│   ├── supabase-server.ts       ← Server-side Supabase instance
│   ├── supabase-middleware.ts   ← Auth middleware helper
│   ├── research/
│   │   ├── context.ts           ← YOUR NICHE: paste DESIGN.md voice values here
│   │   ├── api-clients.ts       ← Firecrawl + Perplexity wrappers
│   │   └── run-helpers.ts       ← Create/complete research run records
│   └── review/
│       ├── queries.ts           ← Review queue database queries
│       └── types.ts             ← TypeScript types for review items
│
├── agent-templates/             ← Generic system prompts to start from
│   ├── research-agent.md        ← Keyword / trend research
│   ├── synthesis-agent.md       ← Reads L1, writes briefs
│   ├── content-writer.md        ← Drafts blog posts, newsletters
│   ├── post-scorer.md           ← Scores drafts against criteria
│   ├── fact-checker.md          ← Verifies claims before publishing
│   └── voice-skill-template.md  ← Blank voice skill for your AI agents
│
└── supabase/
    └── migrations/
        ├── 001_core_tables.sql
        ├── 002_content_tables.sql
        ├── 003_agent_state.sql
        └── 004_projects.sql
```

---

## The Five-Layer Pipeline in Detail

### Layer 1: Research Agents

Four agents run on a schedule (or manually): keyword research, competitive research, content trends, and audience conversation mining. Each agent uses Firecrawl + Perplexity to scan the web, then saves a structured JSON report to the `research_reports` table in Supabase.

You configure what they research by editing `lib/research/context.ts` — that's where your niche, audience, and competitors live as constants that get injected into every prompt.

The orchestrator at `/api/research/run-all` calls all four agents with staggered 3-second delays (to avoid API rate limits), then hands off to Layer 2.

### Layer 2: Synthesis Agent

The synthesis agent reads the last 3 reports from each L1 agent, then produces the top 5 content opportunities — each with a complete writing brief (keyword, headings, hook, CTA, word count, FAQ questions). These briefs get saved to the `agent_outputs` table with status `ready`.

### Layer 3: Human Review (Your Job)

The `/review` page is your Layer 3 interface. You see each brief, can read the full rationale, and either approve it (moves to Layer 4), reject it (archived), or redirect it (add notes for revision). Nothing moves to content creation without your explicit approval.

This is intentional. The AI is good at research and structure. You're better at knowing which ideas actually fit your audience and voice.

### Layer 4: Content Creation

Approved briefs appear in the content creation queue. You can trigger the Content Writer agent to draft a post from a brief, then run the Post Scorer to evaluate it against your criteria. The Voice Rewrite agent can clean up anything that sounds too generic before you publish.

### Layer 5: Distribution

This layer is intentionally minimal in the shell — it's a hook, not a full system. The `/api/distribution/social-post` route is a starting point you extend based on where you publish (Substack, LinkedIn, your blog, etc.).

---

## Automated Research (Vercel Cron)

`vercel.json` includes a cron job that triggers the research sweep on the 1st and 15th of each month. You can change the schedule there.

The cron route is authenticated with `CRON_SECRET` — a random string you set in your env vars. Never expose this.

---

## Customizing Your Agents

Every agent system prompt is a constant string in its API route file. To customize an agent:

1. Open the route file (e.g., `app/api/research/keyword/route.ts`)
2. Find the `system:` block in the `anthropic.messages.create()` call
3. Edit the prompt directly

The `agent-templates/` folder has starter versions of each prompt written generically. They're not loaded automatically — they're reference material for when you're writing your own prompts.

---

## Authentication

The shell uses simple password auth (`HUB_PASSWORD` env var). This is intentional — it's a personal tool, not a multi-user product. The password is checked in `middleware.ts` on every request.

If you want Google OAuth (so you don't have to share a password with collaborators), Supabase has built-in OAuth support. See `app/api/auth/` for the callback route stub.

---

## Troubleshooting

**The research agents return empty results.**
Check that `FIRECRAWL_API_KEY` and `PERPLEXITY_API_KEY` are set in your env vars. The Firecrawl free tier has rate limits — if you hit them, the agents will fail silently. Check the Vercel function logs.

**The synthesis agent produces generic output.**
Your `lib/research/context.ts` file needs more specifics. Be more precise about your niche, your audience, and your competitors. Vague context = vague output.

**Supabase connection errors.**
Double-check that `NEXT_PUBLIC_SUPABASE_URL` starts with `https://` and ends with `.supabase.co`. The anon key and service role key are different — make sure you're using each in the right place.

**Deploy works but cron doesn't trigger.**
Vercel cron requires a Pro plan for schedules more frequent than daily. The default schedule in `vercel.json` (1st and 15th) runs once a month — that works on the free Hobby plan.

---

## Questions?

This shell was built by Kim Doyal at [AI Spark Studios](https://kimdoyal.com). If you're part of the build cohort, bring questions to our group calls.

If you found this on GitHub and are building independently: the code is well-commented and the architecture is intentionally simple. Claude Code in VS Code can help you navigate and extend it.
