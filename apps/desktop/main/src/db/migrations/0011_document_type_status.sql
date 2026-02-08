-- Adds document metadata fields required by Document Management P0 baseline.

ALTER TABLE documents
  ADD COLUMN type TEXT NOT NULL DEFAULT 'chapter';

ALTER TABLE documents
  ADD COLUMN status TEXT NOT NULL DEFAULT 'draft';

ALTER TABLE documents
  ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

ALTER TABLE documents
  ADD COLUMN parent_id TEXT;

-- Backfill stable ordering for existing rows.
UPDATE documents
SET sort_order = rowid
WHERE sort_order = 0;

CREATE INDEX IF NOT EXISTS idx_documents_project_sort
  ON documents (project_id, sort_order ASC, updated_at DESC, document_id ASC);
