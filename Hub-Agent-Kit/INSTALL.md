# Installation Guide

Set up the full agent system from scratch. This takes about 30-45 minutes if you're starting from zero.

---

## Prerequisites

- A computer (Mac or Windows)
- A Claude Pro subscription ($20/month) — [claude.ai](https://claude.ai)
- Terminal / command line comfort (basic — you don't need to be a developer)

---

## Step 1: Install Claude Code (5 minutes)

Claude Code is the CLI tool that runs these agents.

```bash
# Option A: via npm (recommended)
npm install -g @anthropic-ai/claude-code

# Option B: via Homebrew (Mac)
brew install claude-code
```

After installing, run `claude` in your terminal and follow the auth prompts to connect your Claude account.

To verify it's working:
```bash
claude --version
```

---

## Step 2: Get Your API Keys (15-20 minutes)

The agents use external tools via MCP (Model Context Protocol). You need API keys for the services below.

### Perplexity (Required — powers all real-time search)

1. Go to [perplexity.ai/settings/api](https://www.perplexity.ai/settings/api)
2. Create an API key
3. Save it somewhere secure — you'll paste it into your MCP config in Step 3

**Cost**: ~$5/month for active content creator usage

### Firecrawl (Required — powers web scraping + competitor analysis)

1. Go to [firecrawl.dev](https://www.firecrawl.dev/)
2. Sign up (free tier: 500 scrapes/month — enough to start)
3. Get your API key from the dashboard
4. Save it

**Cost**: Free tier is fine for most users. Paid plans start at $16/month.

### YouTube Data API (Optional — only needed for the YouTube Researcher)

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (name it anything — "Content Tools" works)
3. Go to **APIs & Services → Library**
4. Search for **YouTube Data API v3** and click **Enable**
5. Go to **APIs & Services → Credentials**
6. Click **Create Credentials → API Key**
7. Save the key

**Cost**: Free within quota limits (10,000 units/day — more than enough)

### Apify (Optional — deep YouTube audits and transcript analysis)

Only needed if you want full competitor channel audits with transcript analysis.

1. Go to [apify.com](https://apify.com)
2. Create an account
3. Get your API token from Settings → Integrations

**Cost**: Free tier is enough for occasional use. ~$5/month for regular audits.

### Tavily (Optional — only for the Ad Intelligence Researcher)

Only needed if you're running the paid ads agents.

1. Go to [tavily.com](https://tavily.com)
2. Create an account and get an API key

**Cost**: Free tier available.

---

## Step 3: Configure MCP Servers (10 minutes)

MCP servers connect Claude Code to these external tools. You configure them in a settings file.

Create or edit your Claude Code settings file. The file location:
- **Project level** (just for this project): `.claude/settings.json` in your project root
- **Global level** (works everywhere): `~/.claude/settings.json`

For the Hub, project-level is recommended so each project has its own API context.

Add this to your settings.json:

```json
{
  "mcpServers": {
    "perplexity": {
      "command": "npx",
      "args": ["-y", "@ppl-ai/mcp"],
      "env": {
        "PERPLEXITY_API_KEY": "YOUR_PERPLEXITY_KEY_HERE"
      }
    },
    "firecrawl": {
      "command": "npx",
      "args": ["-y", "firecrawl-mcp"],
      "env": {
        "FIRECRAWL_API_KEY": "YOUR_FIRECRAWL_KEY_HERE"
      }
    }
  }
}
```

If you're also using YouTube (optional), add your key to `.env.local` in your project root:
```
YOUTUBE_API_KEY=your-youtube-key-here
```

> **Note**: MCP server package names can change as the ecosystem evolves. If a server name above doesn't install correctly, check the Claude Code documentation for the latest package names for Perplexity and Firecrawl MCP servers.

---

## Step 4: Install the Agent Files (5 minutes)

Copy the agent files into your project's `.claude/` directory.

### Core agents (copy all of these):
```bash
cp -r Hub-Agent-Kit/.claude/agents/ .claude/agents/
cp -r Hub-Agent-Kit/.claude/commands/ .claude/commands/
```

### Research profiles (copy the templates):
```bash
mkdir -p .claude/research-profiles
cp Hub-Agent-Kit/research-profiles/business-context-template.md .claude/research-profiles/business-context.md
cp Hub-Agent-Kit/research-profiles/content-strategy-template.md .claude/research-profiles/content-strategy.md
cp Hub-Agent-Kit/research-profiles/competitor-watchlist-template.md .claude/research-profiles/competitor-watchlist.md
```

### Content Grader skill (optional but recommended):
```bash
mkdir -p skills/content-grader
cp Hub-Agent-Kit/skills/content-grader/SKILL.md skills/content-grader/SKILL.md
```

### Paid ads agents (only if you're running Meta ads):
```bash
# Already copied above — the paid-ads/ subfolder is included automatically
# To skip them: delete the paid-ads/ subfolder from .claude/agents/
```

---

## Step 5: Fill In Your Research Profiles (30-60 minutes)

**This is the most important step.** The agents are only as good as the context you give them.

You have two options:

### Option A: Answer the questionnaire, let Claude generate the profiles (Recommended)

1. Open [ONBOARDING.md](ONBOARDING.md)
2. Answer all the questions — be specific and honest
3. Save the file
4. Open Claude Code in your project directory
5. Run: `claude` then ask Claude to "read my ONBOARDING.md and generate my three research profiles"
6. Claude will create `business-context.md`, `content-strategy.md`, and `competitor-watchlist.md`
7. Review the generated files — tweak anything that doesn't feel right

### Option B: Edit the templates directly

1. Open `.claude/research-profiles/business-context.md` (which is your copy of `business-context-template.md`)
2. Replace all `[PLACEHOLDER]` text with your actual business information
3. Do the same for `content-strategy.md` and `competitor-watchlist.md`

Either path works. Option A is faster if you're not sure how to structure your information. Option B is better if you already have clear positioning and want precise control.

---

## Step 6: Update Content Paths in Agent Files (5 minutes)

The agents reference directories where your content lives. These default to common hub structure paths, but you may need to update them.

Search for these placeholders in the agent files and replace:

| Placeholder | Replace With |
|-------------|-------------|
| `[YOUR_CONTENT_DIR]` | Your published content folder (e.g., `content/blog-posts/`) |
| `[YOUR_DRAFTS_DIR]` | Your drafts folder (e.g., `drafts/`) |
| `[YOUR_LINKEDIN_PUBLISHED_DIR]` | Your LinkedIn published posts folder |

Most agents default to sensible paths. If they're not finding your content, check the agent file for a `## Customize This Agent` section.

---

## Step 7: Test It (5 minutes)

```bash
# Open Claude Code in your project
claude

# Try a quick topic research
/research "your main topic here"
```

If it runs, loads your business context, and returns results that feel relevant to your specific audience — you're set.

**Common issues:**
- `MCP server not found` → Check that your settings.json is correctly formatted and the API keys are valid
- `File not found` when running agents → The agent can't find your research profiles. Make sure the files exist at `.claude/research-profiles/`
- Generic results that don't feel relevant → Your research profiles need more specificity. Go back and add more detail, especially in the audience section.

---

## Quick Start After Install

Run these to verify each major agent works:

```bash
# Content research
/research "your main topic"

# Competitive check
/competitive-check

# Monthly gap analysis
/gap-analysis monthly
```

If all three return relevant, personalized results — you're good to go.

---

## Updating the Kit

When new agents or improvements are released, you can update individual agent files without redoing the whole setup. Just replace the specific file in `.claude/agents/` and run it.

Your research profiles carry forward — you don't need to redo those.
