-- ─────────────────────────────────────────────────────────────────────────────
-- 005_post_scorer_v2.sql
-- Post Scorer rebuild: lane-aware hard-gate/soft-check rubric replaces the
-- old 5-dimension numeric grade. post_scores isn't defined in an earlier
-- tracked migration (it predates this migration folder), so this creates it
-- if missing and otherwise adds the new columns the rebuilt scorer writes.
--
-- Run this after 004_projects.sql
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS post_scores (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_preview  text,
  created_at       timestamptz DEFAULT now()
);

-- Old columns (grade, overall_score, dimensions_json, rewrites_json) are left
-- in place if they already exist on your table — the new scorer no longer
-- writes them, but dropping them isn't necessary and risks losing history.
ALTER TABLE post_scores ADD COLUMN IF NOT EXISTS lane            text;
ALTER TABLE post_scores ADD COLUMN IF NOT EXISTS lane_inferred   boolean;
ALTER TABLE post_scores ADD COLUMN IF NOT EXISTS verdict         text;
ALTER TABLE post_scores ADD COLUMN IF NOT EXISTS hard_gates_json jsonb;
ALTER TABLE post_scores ADD COLUMN IF NOT EXISTS soft_checks_json jsonb;
ALTER TABLE post_scores ADD COLUMN IF NOT EXISTS fixes_json      jsonb;

CREATE INDEX IF NOT EXISTS idx_post_scores_created_at ON post_scores (created_at DESC);
