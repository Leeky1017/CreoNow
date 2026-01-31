-- P1-004: user_memory semantic recall vector index (sqlite-vec).
--
-- Why: keep schema creation deterministic when sqlite-vec is available, while
-- allowing the app to degrade gracefully when the extension cannot be loaded.
--
-- Note: this migration is applied only when sqlite-vec loads successfully.

CREATE VIRTUAL TABLE IF NOT EXISTS user_memory_vec USING vec0(
  memory_id TEXT PRIMARY KEY,
  embedding float[64]
);

