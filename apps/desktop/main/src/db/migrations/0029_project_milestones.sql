-- 0029_project_milestones.sql
-- Why: Persist one-time engagement milestone triggers with deterministic replay.
-- Invariants: INV-8 post-writing hooks can emit milestone events; persistence
-- must be migration-managed, not runtime DDL in services.

CREATE TABLE IF NOT EXISTS project_milestones (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL,
  metric      TEXT NOT NULL,
  threshold   INTEGER NOT NULL,
  value       INTEGER NOT NULL,
  reached_at  INTEGER NOT NULL,
  created_at  INTEGER NOT NULL,
  UNIQUE(project_id, metric, threshold)
);

CREATE INDEX IF NOT EXISTS idx_project_milestones_project_reached
  ON project_milestones(project_id, reached_at ASC);
