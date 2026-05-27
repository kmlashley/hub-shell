-- ─────────────────────────────────────────────────────────────────────────────
-- 003_agent_state.sql
-- Agent registry and workflow run tracking
--
-- Run this after 002_content_tables.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- Agent registry: one row per agent in your pipeline
-- Add rows here for each agent you build so the orchestrator can look them up.
CREATE TABLE IF NOT EXISTS pantheon_agents (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  role        text NOT NULL UNIQUE,  -- used for lookup: 'keyword_researcher', 'synthesis_agent', etc.
  description text,
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- Seed the default 5-layer pipeline agents
INSERT INTO pantheon_agents (name, role, description) VALUES
  ('Keyword Research Agent',   'keyword_researcher',    'L1: Finds keyword opportunities and trending search queries'),
  ('Competitive Research Agent', 'competitive_researcher', 'L1: Monitors competitors and identifies positioning gaps'),
  ('Content Trends Agent',     'content_trends_agent',  'L1: Tracks trending topics and content format signals'),
  ('Audience Research Agent',  'audience_researcher',   'L1: Mines real audience conversations for pain points and language'),
  ('Synthesis Agent',          'synthesis_agent',       'L2: Reads all L1 reports and generates ranked content opportunities'),
  ('Content Writer',           'content_writer',        'L4: Drafts full posts from approved briefs'),
  ('Post Scorer',              'post_scorer',           'L4: Evaluates drafts across voice, substance, SEO, and differentiation'),
  ('Fact Checker',             'fact_checker',          'L4: Flags potentially outdated or unverifiable claims'),
  ('Social Post Agent',        'social_post_agent',     'L5: Adapts posts to platform-native social formats')
ON CONFLICT (role) DO NOTHING;

-- Workflow run log: tracks every agent sweep and individual run
CREATE TABLE IF NOT EXISTS agent_workflow_runs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_name text NOT NULL,
  triggered_by  text,           -- 'vercel_cron' | 'manual'
  status        text DEFAULT 'running',  -- 'running', 'completed', 'failed'
  started_at    timestamptz DEFAULT now(),
  completed_at  timestamptz,
  duration_ms   integer,
  notes         text
);

CREATE INDEX IF NOT EXISTS idx_workflow_runs_name_date
  ON agent_workflow_runs (workflow_name, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_workflow_runs_status
  ON agent_workflow_runs (status, started_at DESC);
