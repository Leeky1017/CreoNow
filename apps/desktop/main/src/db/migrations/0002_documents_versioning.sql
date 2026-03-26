-- Adds document/version fields required by P0-005.

ALTER TABLE documents
  ADD COLUMN content_hash TEXT NOT NULL DEFAULT '';

ALTER TABLE document_versions
  ADD COLUMN reason TEXT NOT NULL DEFAULT '';

ALTER TABLE document_versions
  ADD COLUMN content_hash TEXT NOT NULL DEFAULT '';

ALTER TABLE document_versions
  ADD COLUMN diff_format TEXT NOT NULL DEFAULT '';

ALTER TABLE document_versions
  ADD COLUMN diff_text TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_documents_project_updated
  ON documents (project_id, updated_at DESC, document_id ASC);

CREATE INDEX IF NOT EXISTS idx_document_versions_document_created
  ON document_versions (document_id, created_at DESC, version_id ASC);

