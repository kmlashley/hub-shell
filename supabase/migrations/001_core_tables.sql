-- ─────────────────────────────────────────────────────────────────────────────
-- 001_core_tables.sql
-- Core hub infrastructure: key-value store, research reports, review queue
--
-- Run this first in your Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────

-- Generic key-value store for hub state (synthesis overviews, config, etc.)
CREATE TABLE IF NOT EXISTS hub_data (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key        text UNIQUE NOT NULL,
  data       jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- L1 research agent outputs (one row per agent per run)
CREATE TABLE IF NOT EXISTS research_reports (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type         text NOT NULL,         -- 'keyword', 'competitive', 'content-trends', 'audience'
  slug         text NOT NULL,         -- YYYY-MM-DD date slug
  data         jsonb,
  triggered_by text,                  -- 'vercel_cron' | 'manual'
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_research_reports_type_date
  ON research_reports (type, created_at DESC);

-- Review queue (L3): briefs, drafts, and other AI outputs awaiting human review
CREATE TABLE IF NOT EXISTS agent_outputs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id       uuid,                -- optional FK to pantheon_agents
  output_type    text NOT NULL,       -- 'brief', 'draft', 'social_post', 'research'
  title          text NOT NULL,
  payload        jsonb,
  status         text DEFAULT 'ready',  -- 'ready', 'approved', 'rejected', 'redirected', 'published'
  priority_score integer DEFAULT 50,
  human_notes    text,
  metadata       jsonb,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_outputs_status
  ON agent_outputs (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_outputs_priority
  ON agent_outputs (priority_score DESC, created_at DESC);

-- Quick notes (personal capture)
CREATE TABLE IF NOT EXISTS notes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title      text,
  content    text NOT NULL,
  tags       text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
