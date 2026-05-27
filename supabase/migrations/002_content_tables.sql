-- ─────────────────────────────────────────────────────────────────────────────
-- 002_content_tables.sql
-- Blog posts and content pipeline
--
-- Run this after 001_core_tables.sql
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS blog_posts (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title                text NOT NULL,
  slug                 text,
  content              text,
  excerpt              text,
  seo_meta_description text,
  primary_keyword      text,
  tags                 text[],
  status               text DEFAULT 'draft',  -- 'draft', 'review', 'approved', 'published'
  score                integer,
  score_breakdown      jsonb,                 -- full breakdown from post scorer
  published_at         timestamptz,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_status
  ON blog_posts (status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_blog_posts_keyword
  ON blog_posts (primary_keyword);
