# Paid Ads Agents — Optional Module

These four agents work together as a Meta ads intelligence and execution system.

**Only install these if you're running (or actively planning) Meta ads.**

---

## What's Here

| Agent | Role in the Pipeline |
|-------|---------------------|
| `ad-intelligence-researcher.md` | Monthly: find competitors running ads, analyze their messaging, identify whitespace |
| `ad-strategist.md` | Takes intelligence → produces executable testing plan |
| `ad-copywriter.md` | Takes testing plan → writes ad copy for each angle |
| `campaign-qa-agent.md` | Reviews all creative before launch — catches issues before they cost money |

## The Pipeline

```
Ad Intelligence Researcher (monthly)
    ↓ produces: competitor snapshot + messaging map + positioning brief
Ad Strategist
    ↓ produces: campaign testing matrix + budget allocation + kill rules
Ad Copywriter
    ↓ produces: primary text (3 lengths) + headlines + CTAs for each angle
Campaign QA Agent
    ↓ produces: pre-launch checklist + flagged issues
    ↓
Meta Ads Manager
```

## Customization Required

These agents require more customization than the research agents because they're funnel-specific. Before using them:

1. **Update your funnel** in each agent — what's your lead gen offer? What URL does the ad point to?
2. **Replace the avatar name** throughout — all references to the audience avatar should match your business context
3. **Update the competitor discovery criteria** in the intelligence researcher — the demographic specifics and niche qualifiers need to match your space
4. **Set your constraints** in the ad strategist — your budget, platform preferences, and campaign rules
5. **Update the voice guide path** in the ad copywriter — point it to your actual voice skill

## Installation

```bash
# Copy these agents into your .claude/agents/ directory
cp Hub-Agent-Kit/.claude/agents/paid-ads/*.md .claude/agents/paid-ads/
```

Or copy them into your root `.claude/agents/` if you prefer flat structure.

---

*See [CUSTOMIZE.md](../../../../CUSTOMIZE.md) for detailed customization instructions for each agent.*
