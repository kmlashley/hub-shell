# Hub Pages — Build Guide

This document describes every page in the full hub, organized into build phases. Each phase is designed to be one Claude Code session. Work through them in order — earlier phases establish patterns and database tables later phases depend on.

---

## How to Use This With Claude Code

Open your hub project in VS Code with Claude Code active. At the start of each phase, paste this prompt (swap in the phase number):

```
I'm building out my AI Business Hub using this project as the base. I want to build Phase [N] from PAGES.md. 

Read PAGES.md for the full spec. Read DESIGN.md for my brand colors and hub name. Then build each page in this phase one at a time, using the same component patterns already in this codebase. Ask me before creating any new Supabase tables.
```

After each page is built, test it in the browser before moving to the next. Claude Code can run `npm run dev` to preview.

---

## What the Shell Already Has

These pages exist and work. Don't rebuild them — use them as reference for component patterns:

| Route | What it is |
|-------|-----------|
| `/` | Home dashboard — recent activity, quick stats |
| `/login` | Password auth page |
| `/agents` | Agent status grid — shows which agents are active/idle |
| `/content` | Content hub overview |
| `/intelligence` | Intelligence hub overview |
| `/notes` | General notes — create, tag, browse |
| `/projects` | Projects list |
| `/review` | Basic content review queue |

---

## Phase 1 — Foundation Upgrade

Upgrade the shell's home dashboard and navigation before adding new pages. This sets the visual patterns everything else will follow.

### `/` — Home Dashboard (upgrade)

**What it does:** The command center. Shows what needs your attention today across all pillars.

**Key UI:**
- 4–6 stat cards at the top: active agents, items in review queue, notes this week, content published this month
- Recent activity feed: last 10 items across the whole hub (notes created, reviews completed, content published)
- Quick-action buttons: "Run research," "New note," "Review queue"
- Each stat card links to the relevant section

**Supabase tables:** Reads from multiple tables — query counts, don't load full rows. Use `{ count: 'exact', head: true }` on each table.

**Notes:** Keep this page fast. No heavy queries. Surface counts and the last 5–10 items max.

---

### `/settings` — Hub Settings

**What it does:** Configure your hub — AI API keys, brand name, connected accounts, agent defaults.

**Key UI:**
- Tabs: General, Integrations, Agent Defaults
- General: hub name, hub tagline, timezone
- Integrations: API key fields (Claude, Firecrawl, Perplexity) — stored as env vars, show masked values
- Agent Defaults: default voice/tone preset, default audience description (pre-fills agent forms)

**Supabase tables:** Optional `hub_settings` table (single row, key-value pairs). Many people store settings in `.env.local` only.

**Notes:** API keys should never be stored in the database. Show the env var name, not the value.

---

### `/quick-links` — Quick Links

**What it does:** A personal link hub — your most-used URLs, tools, docs, dashboards, all in one place.

**Key UI:**
- Grid of link cards with icon, title, URL, optional category
- Add/edit/delete links inline
- Filter by category
- One-click open in new tab

**Supabase tables:** `quick_links (id, title, url, icon, category, sort_order, created_at)`

---

## Phase 2 — Content Intelligence: Research Tools

These are the tools you run when you have a specific question about your content strategy. Each one calls an AI agent with your input and returns structured intelligence. Build them inside `/content/` as sub-pages.

Before building this phase: add a sidebar sub-nav under "Content" in your navigation component. These pages live at `/content/[tool-name]`.

---

### `/content/post-scorer` — Post Scorer

**What it does:** Paste any piece of content. Get back a scored analysis across 5 dimensions with specific fixes.

**Key UI:**
- Large textarea: paste your content
- "Score this post" button
- Results panel:
  - Overall grade (A/B/C/D/F) in a large badge
  - 5 dimension scores (0–5) with progress bars: Clarity, Hook, Value, Authenticity, CTA
  - Top 3 specific fixes (not vague suggestions — "Change your opening line to lead with the outcome, not the process")
  - Rewrite suggestions: original excerpt → suggested rewrite → reason
- Save score to history (optional)

**Agent call:** Send content to Claude with a scoring rubric. The rubric should match your voice guide if you have one.

**Supabase tables:** `post_scores (id, content_preview, overall_score, grade, dimensions_json, fixes_json, rewrites_json, created_at)`

---

### `/content/keyword-research` — Keyword Research

**What it does:** Enter a topic or niche. Get back keyword clusters with search intent, difficulty estimate, and content angle recommendations.

**Key UI:**
- Input: topic/niche + optional audience description
- "Research keywords" button
- Results: grouped keyword clusters (informational / commercial / navigational)
- For each keyword: estimated intent, content angle, suggested headline
- Export as JSON or copy to clipboard

**Agent call:** Perplexity API for live search data + Claude for synthesis and content angles.

**Supabase tables:** `keyword_research_runs (id, topic, audience, results_json, created_at)`

---

### `/content/seo-research` — SEO Research

**What it does:** Enter your URL or topic. Get a full SEO analysis — what's ranking, what's missing, where the gaps are.

**Key UI:**
- Input: URL or topic
- Results tabs: Top Ranking Content, Content Gaps, Keyword Opportunities, Quick Wins
- Each finding links to a recommended action
- "Save to intelligence" button to push findings to your Intelligence hub

**Agent call:** Firecrawl to scrape top-ranking pages + Perplexity for SERP data + Claude for synthesis.

**Supabase tables:** `seo_research_runs (id, query, results_json, created_at)`

---

### `/content/aeo-geo-audit` — AI Visibility Audit

**What it does:** The most important tool in the hub. Checks whether AI search engines (ChatGPT, Perplexity, Claude, Google SGE) can find your business and how they describe you.

**Key UI:**
- Inputs: your name/brand, your niche, 3–5 keywords you want to rank for
- "Run audit" button (this takes 30–60 seconds)
- Results:
  - Visibility score per AI engine (0–10)
  - What each engine says about you when asked (verbatim or paraphrased)
  - Gaps: topics where competitors appear but you don't
  - Fix list: specific content to create to improve visibility
- Comparison: run again in 30 days to track improvement

**Agent call:** Perplexity API with queries like "who should I follow for [your niche]" and "best [your niche] experts." Claude synthesizes the pattern.

**Supabase tables:** `aeo_audit_runs (id, brand_name, niche, keywords_json, results_json, visibility_scores_json, created_at)`

---

### `/content/competitive-research` — Competitive Research

**What it does:** Enter a competitor's name, URL, or Substack. Get back a full competitive brief — their positioning, content strategy, gaps, and where you have advantage.

**Key UI:**
- Input: competitor name + URL (optional)
- Results sections:
  - Their positioning (how they describe themselves)
  - Content themes (what they publish most)
  - Gaps in their coverage (what they're NOT covering that their audience needs)
  - Your advantage (where you're differentiated)
  - Recommended moves (specific content or offer ideas)

**Agent call:** Firecrawl to scrape their site/Substack + Perplexity for mentions + Claude for synthesis.

**Supabase tables:** `competitive_research_runs (id, competitor_name, competitor_url, results_json, created_at)`

---

## Phase 3 — Content Intelligence: Publishing Tools

More `/content/` sub-pages. These are tools for research that feeds directly into content creation.

---

### `/content/substack-research` — Substack Researcher

**What it does:** Research any Substack publication. Find their content patterns, engagement signals, growth trajectory, and gaps you can exploit.

**Key UI:**
- Input: Substack URL
- Results:
  - Publication summary (topic, tone, cadence)
  - Top performing post types
  - Engagement patterns (what gets notes, what gets shares)
  - Content gaps (what their audience asks about that they don't cover)
  - Notes from their Notes section (if public)
- Option to save as a competitor profile

**Agent call:** Firecrawl to scrape the Substack + Claude to analyze patterns.

**Supabase tables:** `substack_research_runs (id, publication_url, publication_name, results_json, created_at)`

---

### `/content/youtube-research` — YouTube Research

**What it does:** Research YouTube channels and topics. Find what's performing, what gaps exist, and what to create next.

**Key UI:**
- Two modes: Channel Research (enter a channel URL) and Topic Research (enter a topic)
- Channel mode results: top videos, posting cadence, comment sentiment, content gaps
- Topic mode results: top videos on topic, what's missing, recommended angle for your own video
- "Add to content calendar" button

**Agent call:** YouTube Data API for channel/video data + Perplexity for trend context + Claude for synthesis.

**Supabase tables:** `youtube_research_runs (id, mode, query, results_json, created_at)`

---

### `/content/offer-intel` — Offer Intelligence

**What it does:** Research how competitors in your niche are packaging and positioning their offers. Find the gaps.

**Key UI:**
- Input: your niche, your target audience, optional competitor names
- Results:
  - Offer landscape map (what exists at each price point)
  - Positioning patterns (how everyone describes their offer)
  - Gaps (price points or positioning angles not covered)
  - Differentiation opportunities (specific angles you could own)
- Save as a positioning reference

**Agent call:** Firecrawl + Perplexity to research competitor offers + Claude for synthesis.

**Supabase tables:** `offer_intel_runs (id, niche, audience, competitors_json, results_json, created_at)`

---

### `/content/internal-linker` — Internal Linker

**What it does:** Paste a piece of content. Get back internal linking suggestions based on your published content library.

**Key UI:**
- Textarea: paste your draft
- Input: your website URL (used to build link context)
- Results: highlighted phrases in your draft + suggested internal links for each
- One-click to copy updated draft with links inserted

**Agent call:** Claude analyzes the draft and cross-references against a list of your published URLs (either manually entered or pulled from Supabase if you store your content there).

**Supabase tables:** `published_content (id, title, url, excerpt, published_at)` — you build this list manually or via a scrape.

---

### `/content/technical-verifier` — Technical Verifier

**What it does:** Paste content that contains any AI-related claims, tool names, pricing, or technical information. Get back a fact-check report.

**Key UI:**
- Textarea: paste your content
- "Verify" button
- Results:
  - Verified claims (confirmed accurate)
  - Flagged claims (potentially outdated or incorrect)
  - For each flag: what's wrong, what's correct, source
- "Apply corrections" button generates a corrected version

**Agent call:** Perplexity for live fact-checking + Claude for synthesis.

**Supabase tables:** `verification_runs (id, content_preview, results_json, flags_count, created_at)`

---

### `/content/youtube-scripts` — YouTube Scripts

**What it does:** Manage scripts for YouTube videos — draft, organize, and track from idea to recorded.

**Key UI:**
- List view: scripts with status tags (Idea / Drafting / Ready / Recorded)
- Script editor: rich text, with a side panel for hook, key points, CTA
- Generate hook variations button
- Status pipeline: drag or click to advance status
- Link to the research run that inspired it

**Supabase tables:** `youtube_scripts (id, title, status, hook, body, key_points, cta, research_run_id, created_at, updated_at)`

---

### `/content/published` — Published Content Tracker

**What it does:** Track everything you've published — blog posts, newsletters, videos, notes — in one place.

**Key UI:**
- Table view with filters by type, date range, platform
- Columns: title, platform, published date, URL, performance notes
- Add entry manually or import from URL (Firecrawl scrapes title/date automatically)
- Link published pieces to the content that inspired them (research runs, notes)

**Supabase tables:** `published_content (id, title, platform, url, published_at, performance_notes, source_type, created_at)`

---

### `/content/analytics` — Content Analytics

**What it does:** A simple performance dashboard for your content. Not a replacement for platform analytics — a synthesis layer on top.

**Key UI:**
- Input: paste performance data (newsletter open rates, video views, post engagement)
- OR pull from connected platforms if you have API access
- Dashboard: top performers by platform, engagement trends, what to do more of

**Supabase tables:** `content_metrics (id, content_id, platform, metric_type, value, recorded_at)`

---

## Phase 4 — Review Queue

This replaces (or upgrades) the shell's basic `/review` page with a full agent output queue.

---

### `/review` — Agent Output Queue (upgrade)

**What it does:** Everything your AI agents produce lands here first. You review, approve, redirect, or discard before anything moves forward. Humans stay in the loop.

**Key UI:**
- Three columns or tabs: Pending Review / Approved / Completed
- Each item shows: agent name, output type (brief / draft / research / analysis), date created, preview
- Actions on each item: Approve, Request revision, Discard
- Click to expand and read the full output
- Approved items auto-route to the relevant hub page (research → Intelligence, draft → Content, etc.)
- Filter by output type, agent, date

**Supabase tables:** `agent_outputs (id, agent_name, output_type, content, status, review_notes, created_at, reviewed_at)`

**Notes:** This is the most important page in the hub. If your agents are running on a schedule (via Vercel cron or N8N), this is where you come every morning to see what they produced.

---

### `/review/[id]` — Review Detail

**What it does:** Full view of a single agent output with all context and actions.

**Key UI:**
- Full content display (markdown rendered)
- Metadata sidebar: agent, run date, input that triggered it, processing time
- Action buttons: Approve / Request Revision / Discard
- Notes field for your feedback if requesting revision
- "Route to" dropdown if approving (which hub page should this feed into)

**Supabase tables:** Same `agent_outputs` table.

---

## Phase 5 — Business Operations

Day-to-day business management pages.

---

### `/clients` — Clients

**What it does:** Track your active clients — contact info, current projects, status.

**Key UI:**
- Card grid of client profiles: name, company, photo (optional), status badge (Active / Paused / Closed)
- Quick stats per client: active projects, last touchpoint, next deliverable
- Add/edit client form
- Click to go to client detail page

**Supabase tables:** `clients (id, name, company, email, status, notes, created_at)`

---

### `/clients/[id]` — Client Detail

**What it does:** Full profile for a single client. History, projects, notes, communication log.

**Key UI:**
- Header: client name, company, status, key contact info
- Tabs: Overview / Projects / Notes / History
- Overview: quick summary, current deliverables, upcoming dates
- Projects: linked project cards with status
- Notes: free-form notes with timestamps

**Supabase tables:** `clients`, `projects (client_id FK)`, `client_notes (id, client_id, content, created_at)`

---

### `/clients/[id]/projects/[projectId]` — Client Project Detail

**What it does:** Detail page for a specific project within a client relationship.

**Key UI:**
- Project title, status, start/end dates
- Deliverables checklist
- Notes and updates timeline
- Files/links section (paste relevant URLs)

**Supabase tables:** `projects (id, client_id, title, status, start_date, end_date, deliverables_json, created_at)`

---

### `/projects` — Projects (upgrade)

**What it does:** Upgrade the shell's basic projects page to include status filters, client linkage, and deadlines.

**Key UI:**
- List view: project name, client (or "Personal"), status badge, due date
- Filter by status: Active / Paused / Completed
- Add project form (title, client, status, dates)

---

### `/projects/[id]` — Project Detail

**What it does:** Same as client project detail but for personal/internal projects without a client.

---

### `/financial` — Financial

**What it does:** Revenue tracking, expense tracking, P&L summary. Not accounting software — a simple revenue intelligence layer.

**Key UI:**
- Tabs: Overview / Revenue / Expenses / P&L
- Overview: MRR, total revenue this month vs. last month vs. target, top revenue stream
- Revenue: log entries by stream (client work, products, memberships, affiliate), with month filter
- Expenses: log entries by category (tools, contractors, ads), with month filter
- P&L: simple income minus expenses, by month, with a chart

**Supabase tables:**
- `revenue_entries (id, stream, amount, description, date, created_at)`
- `expense_entries (id, category, amount, description, date, recurring, created_at)`

**Notes:** Keep this simple. The goal is "do I know where my money is coming from and going" — not a full accounting system.

---

### `/calendar` — Content Calendar

**What it does:** A visual calendar of what's scheduled, what's published, and what's planned.

**Key UI:**
- Month view with colored dots per platform
- Click a day to see what's scheduled
- Add/edit items inline
- Filter by platform (Newsletter / YouTube / LinkedIn / etc.)
- Status colors: Idea (grey) / Drafting (yellow) / Ready (blue) / Published (green)

**Supabase tables:** `calendar_items (id, title, platform, status, scheduled_date, url, notes, created_at)`

---

### `/prompts` — Prompt Library

**What it does:** Save and organize your best Claude prompts. Tag them, search them, copy them.

**Key UI:**
- Grid or list view of saved prompts
- Each card: title, tags, preview of prompt text, copy button
- Add prompt form: title, tags, full prompt text
- Search/filter by tag
- Organize by category (Research / Content / Analysis / Business)

**Supabase tables:** `saved_prompts (id, title, content, tags, category, created_at)`

---

## Phase 6 — Sales & Marketing

Pages for tracking your offers, email sequences, campaigns, and revenue performance.

---

### `/sales-marketing` — Sales & Marketing Hub

**What it does:** Overview page for your commercial activity. Links to all sub-pages.

**Key UI:**
- 4 quick-stat cards: active offers, sequences running, campaign status, revenue this month
- Navigation cards linking to each sub-page
- Recent activity: last 5 revenue entries, last campaign update

---

### `/sales-marketing/offers` — Offers

**What it does:** Track your current offer portfolio — what you sell, at what price, at what status.

**Key UI:**
- Card per offer: name, price, status badge (Active / Paused / Coming Soon), type (Product / Service / Membership)
- Add/edit offer form
- Link each offer to revenue entries so you can see what's earning

**Supabase tables:** `offers (id, name, price, status, type, description, url, created_at)`

---

### `/sales-marketing/email-sequences` — Email Sequences

**What it does:** Track your email sequences — what triggers them, how many emails, where people drop off.

**Key UI:**
- List of sequences with name, trigger, email count, status
- Click to expand: email-by-email view with subject lines and status
- Notes on what's working / what to improve

**Supabase tables:** `email_sequences (id, name, trigger, status, notes, created_at)`, `sequence_emails (id, sequence_id, position, subject, status)`

---

### `/sales-marketing/campaigns` — Campaigns

**What it does:** Track launches, promos, and paid campaigns with dates, goals, and results.

**Key UI:**
- List of campaigns: name, type, dates, goal, result
- Status: Planning / Active / Complete
- Link to revenue entries tagged to this campaign

**Supabase tables:** `campaigns (id, name, type, status, start_date, end_date, goal, result, notes, created_at)`

---

### `/sales-marketing/funnels` — Funnels

**What it does:** Map your customer journey — from first touch to purchase — visually.

**Key UI:**
- Simple funnel diagram (top-to-bottom flow)
- Each stage: name, entry source, conversion action, exit action
- Edit stages inline
- Notes per stage on what's working

**Supabase tables:** `funnel_stages (id, funnel_id, name, position, source, action, notes)`, `funnels (id, name, created_at)`

---

### `/sales-marketing/revenue` — Revenue Detail

**What it does:** Detailed revenue view — filterable, sortable, with stream breakdown.

**Key UI:**
- Table: date, stream, amount, description, linked offer/campaign
- Filters: date range, stream, offer
- Monthly totals per stream
- Export to CSV

**Supabase tables:** Same `revenue_entries` table from `/financial`.

---

## Phase 7 — Growth & Distribution

Pages for managing audience growth and content distribution.

---

### `/growth` — Growth Hub

**What it does:** Overview of audience growth across all platforms.

**Key UI:**
- Subscriber/follower counts by platform (manually updated or API-pulled)
- Growth trend over the last 90 days (chart)
- Source attribution: where new subscribers are coming from
- Quick links to platform dashboards

**Supabase tables:** `growth_snapshots (id, platform, count, source, recorded_at)`

---

### `/growth/email` — Email Platform

**What it does:** Your email list dashboard. Connects to your email platform (Bento, Kit, etc.) to surface subscriber counts, recent broadcasts, and sequence performance.

**Key UI:**
- Tabs: Overview / Subscribers / Sequences / Broadcasts
- Overview: total subscribers, growth this month, top segments
- Subscribers: recent signups with source attribution
- Sequences: active sequences with stats
- Broadcasts: recent sends with open rates

**Agent call:** Your email platform's API (Bento, Kit, etc.). See their API docs for endpoints.

**Supabase tables:** Cache API responses in `email_snapshots (id, data_json, recorded_at)` to avoid rate limits.

**Notes:** Don't hardcode Bento — use a config variable so this works with any email platform.

---

### `/distribution` — Distribution

**What it does:** Compose and schedule posts across multiple social platforms from one place.

**Key UI:**
- Tabs: Compose / Queue / Calendar / Drafts / Published
- Compose: write once, select platforms to post to, preview per-platform
- Queue: upcoming scheduled posts with edit/delete
- Calendar: visual calendar of what's posting when
- Connect to Nuelink, Buffer, or your scheduling tool of choice via API

**Supabase tables:** `distribution_posts (id, content, platforms_json, scheduled_at, status, external_id, created_at)`

---

### `/analytics` — Analytics Hub

**What it does:** Unified analytics across your platforms. Not a replacement for native analytics — a "what actually matters" summary.

**Key UI:**
- Platform cards: Newsletter, YouTube, Website, Social — each shows top 3 metrics
- Weekly trend: are numbers up or down vs. last week
- Best performing content this month (across all platforms)
- Action recommendations based on data

**Supabase tables:** Reads from `content_metrics`, `growth_snapshots`.

---

### `/analytics/newsletter` — Newsletter Analytics

**What it does:** Deeper dive into newsletter-specific metrics — open rates, click rates, subscriber lifecycle.

**Key UI:**
- Recent broadcasts with open rate, click rate, unsubscribes
- Subscriber lifecycle chart: new vs. churned per month
- Best-performing subject lines
- Segment performance comparison

---

## Phase 8 — Content Publishing

Where you create and manage content that actually gets published.

---

### `/substack` — Substack Hub

**What it does:** Overview of your Substack activity.

**Key UI:**
- Stats: total subscribers, posts this month, notes this week
- Recent posts and notes with engagement
- Quick links to the sub-pages below

---

### `/substack/notes` — Substack Notes Manager

**What it does:** Create, draft, schedule, and track Substack Notes. The main content creation surface for Notes.

**Key UI:**
- List of notes with status: Draft / Ready / Posted
- Click to open note editor: text input, tag selector, status
- "Mark as Posted" button (Notes don't have an official API — copy/paste workflow)
- Filter by status, tag, date
- Notes bank: saved hooks, observations, one-liners to pull from

**Supabase tables:** `substack_notes (id, content, status, tags, category, posted_at, created_at)`, `notes_bank (id, content, tags, created_at)`

---

### `/substack/notes-gen` — Note Generator

**What it does:** Generate Substack Note drafts from a topic, observation, or pasted content.

**Key UI:**
- Input: paste content or describe your idea
- Select format: Rally / Contrarian Take / Quick Win / Observation
- Generate button
- Results: 3 variations with character counts
- Edit inline, then save to Notes Manager

**Agent call:** Claude with your voice guide loaded. Format instructions per note type.

---

### `/substack/community-feed` — Community Feed

**What it does:** Curated feed of Substack publications you follow — surface what's trending in your niche without scrolling the full Substack reader.

**Key UI:**
- List of posts from tracked publications: title, author, date, excerpt
- Filter by publication, date
- "Save as research" button (saves to a research note)
- Mark items as read

**Supabase tables:** `feed_sources (id, publication_url, publication_name, active)`, `feed_items (id, source_id, title, url, excerpt, published_at, read_at)`

**Agent call:** Firecrawl to scrape new posts from each source on a schedule.

---

### `/substack/community-feed/sources` — Feed Sources

**What it does:** Manage which Substack publications appear in your community feed.

**Key UI:**
- List of tracked publications with add/remove
- Status (active/paused)
- Last scraped time

---

### `/youtube` — YouTube Hub

**What it does:** Overview of your YouTube channel — recent videos, growth, what to make next.

**Key UI:**
- Stats: subscriber count, views this month, average watch time
- Recent videos with view counts and click-through rates
- Ideas backlog: list of video concepts with status
- Quick link to scripting page

**Agent call:** YouTube Data API for channel stats.

---

### `/youtube/scripting` — YouTube Scripting

**What it does:** Write and manage YouTube scripts with a structured format for hook, body, and CTA.

**Key UI:**
- List of scripts by status: Idea / Drafting / Ready / Recorded
- Script editor: sections for Hook, Context, Main Content (with timestamps), CTA
- Generate hook variations button
- Character and word count per section
- Export as plain text for teleprompter

**Supabase tables:** Same `youtube_scripts` table from Phase 3.

---

## Phase 9 — AI Systems

The AI-powered layers that run throughout the hub.

---

### `/chat` — AI Chat (formerly "Metis")

**What it does:** A direct AI chat interface, always in the context of your hub. Ask questions, get help, run quick analyses without leaving the hub.

**Key UI:**
- Standard chat interface: message thread, input box, send button
- System context pre-loaded: your business description, voice preset, audience from your settings
- Recent conversations list (sidebar or dropdown)
- "Save response" button to push AI output to notes or review queue
- Optional: show recent agent workflow runs in a sidebar panel

**Agent call:** Claude API with your hub settings as the system prompt.

**Supabase tables:** `chat_conversations (id, title, created_at)`, `chat_messages (id, conversation_id, role, content, created_at)`

---

### `/social-queue` — Social Content Queue (formerly "Pheme")

**What it does:** AI-generated social content waits here for your approval before it goes anywhere. The human review layer for social posts.

**Key UI:**
- Three tabs: Pending / Approved / Published
- Each card: platform badge, content preview, source (what generated it), date
- Actions: Approve / Edit & Approve / Discard
- Approved posts auto-route to Distribution for scheduling
- Batch approve with checkboxes

**Supabase tables:** `social_queue_posts (id, platform, content, source, status, approved_at, published_at, created_at)`

---

### `/notebooks` — Notebooks

**What it does:** Link to your NotebookLM notebooks or manage research notebooks from inside the hub.

**Key UI:**
- List of notebooks with title, description, last updated
- Link out to external tool (NotebookLM, etc.) or embed if API allows
- Notes field per notebook: what it contains, when to use it
- Tag/categorize by topic

**Supabase tables:** `notebooks (id, title, description, external_url, tags, last_updated, created_at)`

---

### `/architecture` — Hub Architecture

**What it does:** Documentation of your hub's systems — which agents run on what schedule, how data flows, what connects to what. A map for yourself and anyone helping you build.

**Key UI:**
- Read-only documentation page (or lightly editable)
- Agent registry: each agent, what it does, what it produces, how often it runs
- Data flow diagram (simple text-based or visual)
- External integrations: what APIs are connected and what they do
- Cron jobs: what runs automatically and when

**Supabase tables:** None required. Can be a static page you update manually.

---

## Phase 10 — Intelligence Hub Upgrade

Upgrade the shell's basic `/intelligence` page into the full intelligence command center, including the AI Advisor panel.

---

### `/intelligence` — Intelligence Hub (upgrade)

**What it does:** The synthesis layer. Shows the latest research output across all agents, surfaces what needs your attention, and links to all intelligence tools.

**Key UI:**
- Agent status grid: each research agent with last run time, last output, status
- Latest briefs: 5 most recent research outputs waiting for review
- Quick-run buttons: "Run content research," "Run competitor analysis," etc.
- AI Advisors panel: status of your advisor panel (how many advisors, last critique run, copy generated)
- "Run new synthesis" button: triggers your synthesis agent to compile recent research into a single brief

**Supabase tables:** Reads from `agent_outputs`, `advisor_critiques`.

---

### `/intelligence/advisors` — AI Advisor Panel

**What it does:** Your personal AI mentor team. Each advisor is a specialist persona (e.g., a positioning expert, a buyer psychology expert, a copywriter) that you consult for copy and strategy feedback. You define who they are.

**Key UI:**
- Grid of advisor cards: name, specialty, avatar/icon, last active
- "Add advisor" button
- "Run critique" button — select an advisor and the content to critique
- Recent critiques list
- Copy log: everything the advisor panel has generated

**Notes:** Advisors are completely customizable. No preset names required. Name them after frameworks you follow, real experts you learn from, or whatever makes sense for your business. Examples: "Positioning Advisor," "Buyer Psychology Advisor," "Email Copywriter." Kim's version uses specific naming conventions that are personal to her — yours can be anything.

**Supabase tables:** `advisors (id, name, specialty, system_prompt, avatar_color, created_at)`, `advisor_critiques (id, advisor_id, subject, subject_type, input_content, critique_json, created_at)`

---

### `/intelligence/advisors/create` — Add Advisor

**What it does:** Form to create a new AI advisor persona.

**Key UI:**
- Fields: Name, Specialty (one-line description), System Prompt (the full persona instructions for this advisor), Avatar color picker
- Preview: "What does this advisor focus on?" — live preview of how Claude will interpret this persona
- Save button

---

### `/intelligence/advisors/[slug]` — Advisor Detail

**What it does:** Profile page for a single advisor — their specialty, run history, critique log.

**Key UI:**
- Advisor header: name, specialty, system prompt summary
- Run history: all critiques this advisor has produced, most recent first
- "Run critique" button for this specific advisor
- Stats: total critiques, most critiqued subject types, copy generated count

---

### `/intelligence/advisors/run` — Run Advisor Critique

**What it does:** Select an advisor (or multiple), provide the content to critique, and run the analysis.

**Key UI:**
- Step 1: Select advisor(s) from your panel
- Step 2: Select content type (landing page / email / social post / offer description)
- Step 3: Paste content or describe what you want written
- Step 4: Select audience temperature (cold / warm / hot)
- Run button
- Results appear inline, with a "Save critique" button and "Generate copy" button

**Agent call:** Claude with each advisor's system prompt as the persona, your content as input.

---

### `/intelligence/advisors/critiques` — All Critiques

**What it does:** Browse every critique your advisor panel has produced.

**Key UI:**
- Table: date, advisor name, subject, subject type, key finding
- Filter by advisor, date, subject type
- Click to expand full critique
- "Generate copy from this critique" button

**Supabase tables:** Same `advisor_critiques` table.

---

### `/intelligence/advisors/copy-log` — Copy Log

**What it does:** Every piece of copy your advisors have generated, in one place. Your AI copy archive.

**Key UI:**
- List: date, subject, type, copy preview
- Filter by type, date, advisor
- Click to expand full copy
- "Applied" checkbox — mark it when you've used the copy somewhere
- Export as text

**Supabase tables:** `generated_copy (id, critique_id, advisor_id, subject, subject_type, full_copy, applied, applied_notes, created_at)`

---

## Build Order Summary

| Phase | Pages | When to build |
|-------|-------|--------------|
| 1 | Foundation upgrade (home, settings, quick-links) | Start here |
| 2 | Content intelligence: research tools | After Phase 1 |
| 3 | Content intelligence: publishing tools | After Phase 2 |
| 4 | Review queue (full upgrade) | After Phase 3 |
| 5 | Business ops (clients, projects, financial, calendar, prompts) | After Phase 4 |
| 6 | Sales & marketing | After Phase 5 |
| 7 | Growth & distribution & analytics | After Phase 6 |
| 8 | Content publishing (Substack, YouTube) | After Phase 7 |
| 9 | AI systems (chat, social queue, notebooks) | After Phase 8 |
| 10 | Intelligence hub upgrade + AI advisors | After Phase 9 |

**Total pages added:** ~55 new pages on top of the shell's 8.

---

## Notes for Every Phase

- **Ask before creating tables.** Some tables span multiple pages. Build the table once, reference it many times.
- **Mobile is optional.** The hub is a desktop tool. Don't spend time on mobile layouts unless you specifically want them.
- **Placeholder data is fine.** If a page needs API data that isn't connected yet, build the UI with a "Not connected" state and hardcoded sample data. Wire the real API later.
- **One page per Claude Code session.** Don't ask Claude to build 5 pages at once. Build one, test it, then build the next.
- **Save your component patterns.** After Phase 1, you have a stat card, a table, and a tab component. Name them clearly — you'll use them everywhere.
