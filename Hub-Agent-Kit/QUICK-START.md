# Quick Start Guide

You have the zip. Here's exactly what to do next, in order.

---

## Step 1 — Deploy the Kit (2 minutes)

Open **Terminal** on your Mac (search "Terminal" in Spotlight — the magnifying glass top right of your screen).

Navigate to your project folder, then paste this entire command and hit Enter:

```bash
unzip Hub-Agent-Kit.zip && mkdir -p .claude/agents .claude/commands .claude/research-profiles skills/content-grader && cp -r Hub-Agent-Kit/.claude/agents/* .claude/agents/ && cp -r Hub-Agent-Kit/.claude/commands/* .claude/commands/ && cp Hub-Agent-Kit/research-profiles/* .claude/research-profiles/ && cp Hub-Agent-Kit/skills/content-grader/SKILL.md skills/content-grader/ && echo "Hub Agent Kit installed!"
```

When you see **"Hub Agent Kit installed!"** — you're done with this step.

> **Note**: The zip file needs to be in your project's root folder before running this. If you downloaded it somewhere else, move it there first.

---

## Step 2 — Tell the Agents About Your Business (30–60 minutes)

This is the most important step. The agents are only as good as the context you give them.

You have three files to fill out. They live at:
- `.claude/research-profiles/business-context.md`
- `.claude/research-profiles/content-strategy.md`
- `.claude/research-profiles/competitor-watchlist.md`

These are hidden files (the folder starts with a dot), so you won't see them in Finder normally. The easiest way to fill them out is with Claude Desktop — here's how:

---

### Option A: Use Claude Desktop to fill them out for you (Recommended)

**Claude Desktop** is the regular Claude app you probably already use for chatting. You can use it to answer questions and have Claude write your context files for you.

1. Open **Claude Desktop** (or go to [claude.ai](https://claude.ai) in your browser)

2. Open the file `Hub-Agent-Kit/ONBOARDING.md` in any text editor (TextEdit, VS Code, anything). Copy the entire contents.

3. Paste it into a new Claude conversation and say:
   > "I'm setting up my Hub Agent Kit. I'm going to answer all these questions so you can generate my three research profile files. Ask me the questions one section at a time."

4. Answer all the questions honestly. Be specific — the more detail you give, the better the agents work.

5. When you've answered everything, say:
   > "Now generate my three files: business-context.md, content-strategy.md, and competitor-watchlist.md. Format each one exactly as a markdown file I can copy and paste."

6. Claude will produce all three files. Copy each one.

7. Open each file in your project (use VS Code, TextEdit, or any editor that can open hidden files) and paste in the content:
   - `.claude/research-profiles/business-context.md`
   - `.claude/research-profiles/content-strategy.md`
   - `.claude/research-profiles/competitor-watchlist.md`

> **To open hidden files in VS Code**: Open VS Code, go to File → Open Folder, select your project, and the files will appear in the sidebar (VS Code shows hidden files by default).

> **To show hidden files in Finder**: Press `Cmd + Shift + .` to toggle them visible.

---

### Option B: Fill them out directly

If you prefer, open each template file and replace the `[placeholder]` text with your real information. The templates have guiding questions throughout to help you.

---

## Step 3 — Get Your API Keys (15 minutes)

The agents use two external services to do real-time research. You need a key for each.

### Perplexity (required — powers all web search)
1. Go to [perplexity.ai/settings/api](https://www.perplexity.ai/settings/api)
2. Sign up if you don't have an account
3. Click **Generate API Key**
4. Copy it — you'll use it in the next step

**Cost**: About $5/month for regular use.

### Firecrawl (required — powers web scraping)
1. Go to [firecrawl.dev](https://www.firecrawl.dev)
2. Sign up for a free account
3. Copy your API key from the dashboard

**Cost**: Free tier (500 scrapes/month) is enough to start.

---

## Step 4 — Install Claude Code (10 minutes)

Claude Code is the command-line tool that actually runs the agents. It's separate from Claude Desktop.

1. You need **Node.js** installed first. Check by opening Terminal and typing:
   ```
   node --version
   ```
   If you see a version number, you have it. If not, download it at [nodejs.org](https://nodejs.org) — click the big green "LTS" button.

2. Install Claude Code:
   ```bash
   npm install -g @anthropic-ai/claude-code
   ```

3. Run `claude` in Terminal and follow the prompts to connect your Claude account.

---

## Step 5 — Add Your API Keys to Claude Code (5 minutes)

Claude Code needs to know your API keys. You'll add them to a settings file.

In your project folder, create a file called `.claude/settings.json` (or open it if it already exists) and add:

```json
{
  "mcpServers": {
    "perplexity": {
      "command": "npx",
      "args": ["-y", "@ppl-ai/mcp"],
      "env": {
        "PERPLEXITY_API_KEY": "paste-your-perplexity-key-here"
      }
    },
    "firecrawl": {
      "command": "npx",
      "args": ["-y", "firecrawl-mcp"],
      "env": {
        "FIRECRAWL_API_KEY": "paste-your-firecrawl-key-here"
      }
    }
  }
}
```

Replace the placeholder text with your actual API keys.

---

## Step 6 — Run Your First Agent (2 minutes)

Open Terminal in your project folder and type:

```bash
claude
```

This opens Claude Code. Now try your first agent:

```
/research "your main topic here"
```

Replace "your main topic here" with something you'd actually write about. If it runs and returns results that feel relevant to your business — you're fully set up.

---

## What to Run and When

Once you're set up, here's the simple workflow:

**Before writing any piece of content:**
```
/seo-research "your topic"
/research "your topic"
```

**Every week:**
```
/competitive-check
```

**Every month:**
```
/gap-analysis monthly
```

**Before publishing technical content:**
```
/verify path/to/your-draft.md
```

---

## Using Claude Desktop to Customize the Agents

You can also use Claude Desktop to help you customize each agent for your business — without touching code.

1. Open the agent file you want to customize (e.g., `.claude/agents/substack-researcher.md`) in any text editor
2. Copy the contents
3. Open Claude Desktop and paste it in with a message like:
   > "This is my Substack researcher agent. My Substack is at [your URL] and my main competitors are [names with URLs]. Update the agent with my specific information — keep all the methodology exactly the same, just replace the placeholder sections."
4. Claude will return an updated version
5. Copy that back into the agent file and save

That's it. Same approach works for any agent in the kit.

---

## Getting Help

If something isn't working:

- **Agent returns generic results** → Your research profiles need more detail. Go back to Step 2 and add more specifics about your audience and positioning.
- **"MCP server not found"** → Your API keys in `.claude/settings.json` may have a typo, or the server packages need a moment to install. Try running the command again.
- **"File not found" errors** → The agent can't find your research profiles. Make sure the three files from Step 2 exist at `.claude/research-profiles/`.
- **Can't see hidden files** → Press `Cmd + Shift + .` in Finder, or open the folder in VS Code which shows all files by default.
