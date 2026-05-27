-- ─────────────────────────────────────────────────────────────────────────────
-- 004_projects.sql
-- Project and task management
--
-- Run this after 003_agent_state.sql
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS projects (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text,
  status      text DEFAULT 'active',  -- 'active', 'paused', 'completed', 'archived'
  color       text,                   -- hex color for UI display
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid REFERENCES projects(id) ON DELETE CASCADE,
  title       text NOT NULL,
  description text,
  status      text DEFAULT 'todo',    -- 'todo', 'in_progress', 'done'
  priority    text DEFAULT 'medium',  -- 'low', 'medium', 'high'
  due_date    date,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_items_project
  ON project_items (project_id, status);
