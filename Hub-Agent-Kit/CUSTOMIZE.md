# Customization Guide

The agents in this kit work out of the box once your research profiles are filled in. But each one has places you can tune for your specific setup.

---

## The Most Important Thing

Most customization happens in your research profiles, not the agent files themselves. Before editing any agent, make sure your profiles are complete:

- `research-profiles/business-context.md` — who you are, who you serve
- `research-profiles/content-strategy.md` — your content pillars and voice
- `research-profiles/competitor-watchlist.md` — who to watch

If your agents are returning generic results, the answer is almost always: add more specificity to your profiles.

---

## Content Researcher

**What to customize:**

1. **Content paths** — The agent scans for your existing content to avoid duplication. Update these lines:
   ```
   Use Glob to scan [YOUR_CONTENT_DIR] and [YOUR_DRAFTS_DIR]
   ```
   Replace with your actual content directory paths.

2. **Content pillars** — The agent references "your content pillars from content-strategy.md." Make sure your pillars are clearly defined there.

3. **Output path** — Results save to `.claude/research-outputs/by-post/{slug}/`. Change this if you want them elsewhere.

---

## Competitive Analyzer

**What to customize:**

1. **Competitor watchlist path** — This agent reads from `research-profiles/competitor-watchlist.md`. Make sure that file has real URLs with context.

2. **Weekly schedule** — If you want to run this on a schedule, the agent supports it. Update the trigger section.

3. **Output path** — Results save to `.claude/research-outputs/competitive-reports/`. Change if needed.

---

## Content Gap Analyzer

**Mostly generic — minimal customization needed.** The agent loads your content pillars from context files.

**What to customize:**

1. **Content directory** — The agent audits `ready-to-publish/` and `drafts/`. Update these to match your actual folder names if different.

---

## Content Intelligence

**This agent powers the Hub's Content Intelligence section.** It generates three files your Hub reads programmatically.

**What to customize:**

1. **Output directory** — The agent writes to `content/intelligence/`. If your Hub reads from a different path, update this.

2. **Active platforms** — The agent generates a platform plan. Update the "active platforms" section to match yours. Delete any platforms you're not on.

3. **Voice skill path** — The agent loads your voice skill from `skills/voice/SKILL.md` (or wherever you've placed your voice guide). Update the path.

4. **LinkedIn path** — If you track LinkedIn posts, update the path to your published posts directory.

**Important**: The Hub parses the output files using a specific format (## headers, **Key:** metadata). Don't change the output format.

---

## Offer Intel

**What to customize:**

1. **Your offer ecosystem** — The agent reads your current offers from `business-context.md`. Make sure that file has your actual products, prices, and funnel structure.

2. **Competitor scan scope** — By default, it scans all competitors in your watchlist. You can limit to a subset with `--competitors "name1, name2"`.

---

## SEO/AEO Researcher

**What to customize:**

1. **Content pillars** — The agent filters keyword research through your pillars. More specific pillars = better keyword targeting.

2. **Output path** — Results save to `.claude/research-outputs/`. Update if you organize research differently.

---

## Substack Researcher

**What to customize:**

1. **Your Substack URL** — Update this line near the top of the agent file:
   ```
   Primary URL: https://[YOUR_SUBSTACK_URL].substack.com
   ```

2. **Seed competitor list** — The agent has a default competitor list. Replace these with the Substack publications in your space.

3. **Client context** — If you do work for clients, you can point the agent at a client profile. The agent supports a `clients/{client-slug}/profile.md` file structure.

---

## Technical Verifier

**Mostly generic — no customization needed.** The agent loads context from your business profile and verifies any technical content you give it.

---

## YouTube Researcher

**What to customize:**

1. **Your channel** — If you want the agent to audit your own channel, add your YouTube Channel ID to your environment:
   ```
   YOUTUBE_CHANNEL_ID=UCxxxxxxxxxxxxxxxxx
   ```
   Find your Channel ID in YouTube Studio → Settings → Channel → Advanced settings.

2. **Competitor watchlist** — The YouTube researcher uses a separate watchlist for YouTube-specific competitors (many creators have strong YouTube presence but not a blog). Create `research-profiles/youtube-competitor-watchlist.md` with channels you want to track.

3. **Script path** — The agent uses `youtube-api.mjs` for YouTube Data API calls. Make sure you have that script and the `YOUTUBE_API_KEY` in your `.env.local`.

---

## Paid Ads Agents

**These agents require more customization because they're funnel-specific.**

### Ad Intelligence Researcher

1. **Your funnel** — Update the funnel description at the top to match your actual funnel:
   - What's your lead gen offer? (quiz, free resource, webinar)
   - What's the URL?
   - What's the conversion sequence?

2. **Discovery criteria** — The agent has criteria for what counts as a competitor. Update the gender/demographic specifics to match your actual space.

3. **Seed competitor list** — Replace Kim's seed competitors with people in your space.

4. **Output path** — Results save to `paid-ads/research/`. Change if your ads research lives elsewhere.

### Ad Strategist

1. **Constraints** — The agent has a set of hard constraints (Advantage+ first, no Messenger, etc.). Update these to match your actual campaign preferences and constraints.

2. **Funnel** — Update the funnel description to match yours.

3. **Budget ranges** — Update the budget figures to match your actual starting budget.

### Ad Copywriter

1. **Your voice skill** — The agent loads your voice guide first. Make sure the path to your voice skill is correct.

2. **Your avatar** — Update references to your audience avatar name.

3. **Your conversion goal** — What action does the ad drive to? Update the mission description.

4. **Voice rules** — Add any specific voice rules that are unique to your ad copy (different from your general content voice).

### Campaign QA Agent

1. **Platform** — This agent is set up for Meta (Facebook/Instagram). If you're running ads on other platforms, the policy and spec checks will need updating.

---

## Adding New Agents

Follow the pattern:

1. Create `.claude/agents/your-agent-name.md` with YAML frontmatter:
   ```yaml
   ---
   name: your-agent-name
   description: What this agent does — used in the subagent registry
   tools:
     - Read
     - Write
     - mcp__perplexity__search
     [other tools as needed]
   model: sonnet
   ---
   ```

2. Define: identity, mission, context loading, methodology, output format, cost rules

3. Create a slash command at `.claude/commands/your-command.md`:
   ```
   Read the [Agent Name] definition at `.claude/agents/your-agent-name.md` and follow its instructions.
   
   User request: $ARGUMENTS
   ```

4. Test with a real request before relying on it

---

## Updating Research Profiles

Your profiles should evolve as your business does. Update them:
- When you launch a new offer
- When you add or drop a platform
- When your audience focus shifts
- When new major competitors emerge
- Quarterly at minimum

You don't need to redo the full questionnaire — just edit the relevant sections directly.
