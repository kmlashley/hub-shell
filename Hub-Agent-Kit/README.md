# Hub Agent Kit

A complete AI agent system for content creators and entrepreneurs. Runs in Claude Code. Every agent reads your business context before it works — that's what makes this different from generic research.

---

## What You Get

### Core Research & Content Agents (9 agents)

| Agent | What It Does | When To Run |
|-------|-------------|-------------|
| **Content Researcher** | Deep topic research before writing — competitor gaps, data, recommended angles | Before any blog post or piece of content |
| **Competitive Analyzer** | Monitors what competitors are publishing, finds your gaps | Weekly + before writing on a topic |
| **Content Gap Analyzer** | Finds topics with audience demand that nobody covers well | Monthly landscape report |
| **Content Intelligence** | Generates content calendar, hook library, and platform plans for your Hub | Monthly refresh or after strategy shifts |
| **Offer Intel** | Maps what competitors are selling, finds offer whitespace, writes positioning | Before building or launching any offer |
| **SEO/AEO Researcher** | Real keyword data + Answer Engine Optimization for AI citations | Before writing any blog post |
| **Substack Researcher** | Competitor newsletter analysis, white space, Notes performance | Before planning content; weekly audits |
| **Technical Verifier** | Catches outdated info, wrong pricing, broken claims before publish | Before publishing technical content |
| **YouTube Researcher** | Video topic research, competitor channel audits, trending analysis | Before planning any video |

### Paid Ads Agents (4 agents — optional module)

| Agent | What It Does |
|-------|-------------|
| **Ad Intelligence Researcher** | Finds competitors running Meta ads, analyzes messaging, finds whitespace |
| **Ad Strategist** | Turns intelligence into executable Meta testing plans |
| **Ad Copywriter** | Writes ad copy in your voice for each angle in the testing matrix |
| **Campaign QA Agent** | Reviews all creative before launch — catches policy issues, voice drift, tracking errors |

### Content Grader Skill

Scores any blog post, newsletter, or article across 6 dimensions: Answer Engine Readiness, Structure, Voice, E-E-A-T, SEO Fundamentals, and GEO. Returns honest grades + specific fixes.

---

## How the System Works

Each agent **loads your business context first** before doing anything. That means research comes back filtered through your audience, your positioning, and your competitive landscape — not generic industry takes.

The three files that power everything:
- `research-profiles/business-context.md` — who you are, who you serve, what you're building
- `research-profiles/content-strategy.md` — your content pillars, voice, publishing rhythm
- `research-profiles/competitor-watchlist.md` — the 5-7 people whose audiences overlap with yours

Fill these out once. Update them when your business shifts. Every agent uses them.

---

## Quick Start

1. **[INSTALL.md](INSTALL.md)** — Set up Claude Code + API keys (30-45 min)
2. **[ONBOARDING.md](ONBOARDING.md)** — Answer questions to generate your context files (30-60 min)
3. Drop the `.claude/` folder into your project root
4. Run your first agent

---

## What Goes Where

```
your-project/
├── .claude/
│   ├── agents/              ← Copy from Hub-Agent-Kit/.claude/agents/
│   │   ├── content-researcher.md
│   │   ├── competitive-analyzer.md
│   │   ├── content-gap-analyzer.md
│   │   ├── content-intelligence.md
│   │   ├── offer-intel.md
│   │   ├── seo-aeo-researcher.md
│   │   ├── substack-researcher.md
│   │   ├── technical-verifier.md
│   │   ├── youtube-researcher.md
│   │   └── paid-ads/        ← Optional — only if running Meta ads
│   │       ├── ad-copywriter.md
│   │       ├── ad-intelligence-researcher.md
│   │       ├── ad-strategist.md
│   │       └── campaign-qa-agent.md
│   └── commands/            ← Copy from Hub-Agent-Kit/.claude/commands/
│       └── [8 slash commands]
├── research-profiles/       ← Fill in these templates
│   ├── business-context.md
│   ├── content-strategy.md
│   └── competitor-watchlist.md
└── skills/
    └── content-grader/      ← Copy from Hub-Agent-Kit/skills/
        └── SKILL.md
```

---

## Slash Commands (Quick Reference)

Once installed, run these in Claude Code:

| Command | Agent | Cost |
|---------|-------|------|
| `/research "topic"` | Content Researcher | ~$0.15 |
| `/competitive-check` | Competitive Analyzer | ~$0.30 |
| `/competitive-check --topic "topic"` | Competitive Analyzer | ~$0.10 |
| `/gap-analysis monthly` | Content Gap Analyzer | ~$0.20 |
| `/gap-analysis pillar "pillar name"` | Content Gap Analyzer | ~$0.10 |
| `/offer-intel` | Offer Intel | ~$0.25 |
| `/offer-intel --craft "offer concept"` | Offer Intel | ~$0.15 |
| `/seo-research --discover "topic"` | SEO/AEO Researcher | ~$0.05 |
| `/seo-research --topic "topic"` | SEO/AEO Researcher | ~$0.15 |
| `/substack-research` | Substack Researcher | ~$0.15 |
| `/verify path/to/draft.md` | Technical Verifier | ~$0.20 |
| `/youtube-research "topic"` | YouTube Researcher | ~$0.10 |
| `/youtube-research --audit` | YouTube Researcher | ~$0.05 |

---

## Suggested Workflows

**Before writing a new post:**
1. `/seo-research --topic "your topic"` — keyword + SERP data
2. `/competitive-check --topic "your topic"` — what competitors covered
3. `/research "your topic"` — deep research + recommended angle
4. Write your draft
5. `/verify path/to/draft.md` — catch outdated claims before publishing

**Weekly:**
- `/competitive-check` — what did competitors publish this week?

**Monthly:**
- `/gap-analysis monthly` — what should you cover next?
- Update `research-profiles/` if anything changed in your business

**Before planning videos:**
- `/youtube-research --discover "topic"` — find what people are actually searching for

---

## MCP Servers Required

| Server | What It Powers | Required? |
|--------|---------------|-----------|
| Perplexity | All real-time search + research | Required for most agents |
| Firecrawl | Web scraping + competitor analysis | Required for most agents |
| YouTube Data API | YouTube-specific research | Only for YouTube Researcher |
| Apify | Deep channel audits + transcript analysis | Optional, only for YouTube Researcher |
| Tavily | Additional search for paid ads research | Only for Ad Intelligence Researcher |

See [INSTALL.md](INSTALL.md) for setup instructions.

---

## Before Customizing

The agents in this kit work out of the box once your research profiles are filled in. But every agent has a section marked `## Customize This Agent` that shows what to update for your specific business.

See [CUSTOMIZE.md](CUSTOMIZE.md) for agent-by-agent customization notes.

---

*Built with Claude Code. Based on Kim Doyal's AI Business OS.*
