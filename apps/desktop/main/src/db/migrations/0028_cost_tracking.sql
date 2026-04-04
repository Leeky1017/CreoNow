CREATE TABLE IF NOT EXISTS cost_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cached_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd REAL NOT NULL DEFAULT 0,
  warning TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_cost_records_skill_created
  ON cost_records (skill_id, created_at);

CREATE INDEX IF NOT EXISTS idx_cost_records_request
  ON cost_records (request_id);

CREATE INDEX IF NOT EXISTS idx_cost_records_created_at
  ON cost_records (created_at);
