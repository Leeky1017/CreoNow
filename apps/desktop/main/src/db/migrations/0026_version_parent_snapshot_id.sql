ALTER TABLE document_versions
  ADD COLUMN parent_snapshot_id TEXT;

CREATE INDEX IF NOT EXISTS idx_document_versions_document_parent
  ON document_versions (document_id, parent_snapshot_id);
