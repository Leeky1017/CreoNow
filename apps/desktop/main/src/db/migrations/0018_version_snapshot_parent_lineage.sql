-- Adds parent lineage for P1 linear snapshot chains.

ALTER TABLE document_versions
  ADD COLUMN parent_version_id TEXT;

CREATE INDEX IF NOT EXISTS idx_document_versions_document_parent
  ON document_versions (document_id, parent_version_id);
