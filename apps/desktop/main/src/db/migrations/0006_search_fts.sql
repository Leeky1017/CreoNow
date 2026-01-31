-- P0-012: Full-text search (FTS5) schema + backfill.
--
-- Why: existing DBs may already be on schema_version >= 4; we must create and
-- backfill the FTS index without requiring a reset.

CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
  title,
  content_text,
  document_id UNINDEXED,
  project_id UNINDEXED
);

CREATE TRIGGER IF NOT EXISTS documents_ai_fts AFTER INSERT ON documents BEGIN
  INSERT INTO documents_fts(rowid, title, content_text, document_id, project_id)
  VALUES (new.rowid, new.title, new.content_text, new.document_id, new.project_id);
END;

CREATE TRIGGER IF NOT EXISTS documents_au_fts AFTER UPDATE ON documents BEGIN
  DELETE FROM documents_fts WHERE rowid = old.rowid;
  INSERT INTO documents_fts(rowid, title, content_text, document_id, project_id)
  VALUES (new.rowid, new.title, new.content_text, new.document_id, new.project_id);
END;

CREATE TRIGGER IF NOT EXISTS documents_ad_fts AFTER DELETE ON documents BEGIN
  DELETE FROM documents_fts WHERE rowid = old.rowid;
END;

-- Backfill (idempotent).
INSERT OR REPLACE INTO documents_fts(rowid, title, content_text, document_id, project_id)
SELECT rowid, title, content_text, document_id, project_id
FROM documents;
