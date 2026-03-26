-- P1-004: user_memory document scope support.
--
-- Why: enable global → project → document memory hierarchy for injection and UX,
-- while keeping schema changes additive and migration-safe in SQLite.

-- New optional document_id column (used only when scope = 'document').
ALTER TABLE user_memory ADD COLUMN document_id TEXT DEFAULT NULL;

-- Query index for document-scoped memories.
CREATE INDEX IF NOT EXISTS idx_user_memory_document
  ON user_memory(document_id, updated_at DESC, memory_id ASC)
  WHERE document_id IS NOT NULL;

-- Extend learned-source uniqueness to include document_id.
DROP INDEX IF EXISTS idx_user_memory_learned_source;
CREATE UNIQUE INDEX idx_user_memory_learned_source
  ON user_memory(origin, scope, project_id, document_id, source_ref)
  WHERE origin = 'learned' AND source_ref IS NOT NULL;

