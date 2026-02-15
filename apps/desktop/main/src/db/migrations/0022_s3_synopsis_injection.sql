-- S3 synopsis injection storage foundation.
-- Why: persist chapter-level synopsis records for deterministic continue-writing
-- context injection across chapters.

CREATE TABLE IF NOT EXISTS chapter_synopses (
  synopsis_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  chapter_order INTEGER NOT NULL,
  synopsis_text TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
  FOREIGN KEY (document_id) REFERENCES documents(document_id) ON DELETE CASCADE,
  UNIQUE (project_id, document_id)
);

CREATE INDEX IF NOT EXISTS idx_chapter_synopses_project_order
  ON chapter_synopses(project_id, chapter_order DESC, updated_at DESC, synopsis_id ASC);
