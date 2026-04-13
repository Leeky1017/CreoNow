-- L1 Memory: per-session context memory (INV-4 Layer 1).
--
-- Why: L1 stores session-scoped writing context — style preferences, entity
-- references, formatting preferences, and user notes — so the SkillOrchestrator
-- can selectively inject relevant context without Layer 2 retrieval overhead.
-- FTS5 virtual table enables keyword-boosted relevance scoring.

CREATE TABLE IF NOT EXISTS session_memory (
  id             TEXT    PRIMARY KEY,
  session_id     TEXT    NOT NULL,
  project_id     TEXT    NOT NULL,
  category       TEXT    NOT NULL CHECK(category IN ('style', 'reference', 'preference', 'note')),
  content        TEXT    NOT NULL,
  relevance_score REAL   NOT NULL DEFAULT 1.0,
  created_at     INTEGER NOT NULL,
  expires_at     INTEGER,
  deleted_at     INTEGER
);

-- Primary lookup: fetch items for a session within a project, newest first.
CREATE INDEX IF NOT EXISTS idx_session_memory_session
  ON session_memory(session_id, project_id, category, created_at DESC);

-- Cross-session lookup: all items for a project, newest first.
CREATE INDEX IF NOT EXISTS idx_session_memory_project
  ON session_memory(project_id, created_at DESC);

-- Expired-item cleanup index: find rows where deleted_at IS NULL and expires_at
-- has passed, without full-table scan.
CREATE INDEX IF NOT EXISTS idx_session_memory_expiry
  ON session_memory(expires_at) WHERE deleted_at IS NULL AND expires_at IS NOT NULL;

-- FTS5 external-content table for keyword-boosted relevance scoring.
-- content='session_memory' (external-content mode) — FTS5 references the source
-- table for content retrieval; sync triggers keep the index up to date.
-- Avoids doubling storage compared to a standalone FTS5 table.
-- tokenize='trigram' enables CJK substring matching (INV-3): the default
-- unicode61 tokenizer does not segment Chinese characters, so MATCH queries
-- like "林黛玉" would fail against content like "林黛玉是贾宝玉的表妹".
-- Trigram indexing trades a slightly larger index for correct CJK recall —
-- acceptable for session memory tables which remain small (dozens of rows).
CREATE VIRTUAL TABLE IF NOT EXISTS session_memory_fts USING fts5(
  content,
  content='session_memory',
  content_rowid='rowid',
  tokenize='trigram'
);

-- Triggers to keep FTS5 index in sync with session_memory writes.
-- Pattern mirrors 0006_search_fts.sql and entities_fts triggers.

CREATE TRIGGER IF NOT EXISTS session_memory_ai AFTER INSERT ON session_memory BEGIN
  INSERT INTO session_memory_fts(rowid, content) VALUES (new.rowid, new.content);
END;

CREATE TRIGGER IF NOT EXISTS session_memory_ad AFTER DELETE ON session_memory BEGIN
  INSERT INTO session_memory_fts(session_memory_fts, rowid, content) VALUES('delete', old.rowid, old.content);
END;

CREATE TRIGGER IF NOT EXISTS session_memory_au AFTER UPDATE ON session_memory BEGIN
  INSERT INTO session_memory_fts(session_memory_fts, rowid, content) VALUES('delete', old.rowid, old.content);
  -- Only re-insert into FTS if the row is still active (not soft-deleted).
  -- Soft-delete sets deleted_at, so FTS should no longer index the content.
  INSERT INTO session_memory_fts(rowid, content)
    SELECT new.rowid, new.content WHERE new.deleted_at IS NULL;
END;
