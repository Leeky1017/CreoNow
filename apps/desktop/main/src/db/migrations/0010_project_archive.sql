-- P0-005: Add archived_at column to projects table for archive functionality.
--
-- Why: Dashboard needs to support archiving projects. Archived projects are hidden
-- from the default list but can be restored. Using nullable timestamp allows
-- both archive and unarchive operations.
ALTER TABLE projects ADD COLUMN archived_at INTEGER;

-- Index for efficient filtering of non-archived projects
CREATE INDEX IF NOT EXISTS idx_projects_archived
  ON projects(archived_at, updated_at DESC, project_id ASC);
