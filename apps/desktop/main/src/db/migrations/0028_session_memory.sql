-- 0028_session_memory.sql — L1 session-aware context memory table
--
-- Layer 1 of the three-layer memory architecture (ARCHITECTURE.md INV-4).
-- Stores per-session writing style signals, reference names, layout preferences,
-- and temporary user notes. Injected selectively into SkillOrchestrator Stage 3
-- context assembly at up to 15% of the total context budget.
--
-- FTS5 on content enables INV-4-compliant keyword retrieval without an extra
-- vector store (KG+FTS5 is the mandated primary retrieval path).
--
-- @rollback: DROP TABLE session_memory; DROP TABLE session_memory_fts;

CREATE TABLE IF NOT EXISTS session_memory (
  id               TEXT PRIMARY KEY,
  session_id       TEXT NOT NULL,
  project_id       TEXT NOT NULL,
  category         TEXT NOT NULL CHECK(category IN ('style', 'reference', 'preference', 'note')),
  content          TEXT NOT NULL,
  relevance_score  REAL NOT NULL DEFAULT 0.5,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at       TEXT
);

CREATE INDEX IF NOT EXISTS idx_session_memory_session_id
  ON session_memory (session_id);

CREATE INDEX IF NOT EXISTS idx_session_memory_project_id
  ON session_memory (project_id);

CREATE INDEX IF NOT EXISTS idx_session_memory_category
  ON session_memory (category);

CREATE INDEX IF NOT EXISTS idx_session_memory_created_at
  ON session_memory (created_at DESC);

-- FTS5 virtual table for keyword-based retrieval (INV-4: KG+FTS5 primary path).
-- content=session_memory keeps the FTS index in sync via triggers below.
CREATE VIRTUAL TABLE IF NOT EXISTS session_memory_fts
  USING fts5(content, content=session_memory, content_rowid=rowid);

-- Triggers to keep FTS5 index in sync with base table.
CREATE TRIGGER IF NOT EXISTS session_memory_fts_ai
  AFTER INSERT ON session_memory BEGIN
    INSERT INTO session_memory_fts(rowid, content) VALUES (new.rowid, new.content);
  END;

CREATE TRIGGER IF NOT EXISTS session_memory_fts_au
  AFTER UPDATE ON session_memory BEGIN
    INSERT INTO session_memory_fts(session_memory_fts, rowid, content)
      VALUES ('delete', old.rowid, old.content);
    INSERT INTO session_memory_fts(rowid, content) VALUES (new.rowid, new.content);
  END;

CREATE TRIGGER IF NOT EXISTS session_memory_fts_ad
  AFTER DELETE ON session_memory BEGIN
    INSERT INTO session_memory_fts(session_memory_fts, rowid, content)
      VALUES ('delete', old.rowid, old.content);
  END;
