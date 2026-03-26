-- Adds judge model metadata tables required by P0-013.

CREATE TABLE IF NOT EXISTS judge_models (
  model_id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  error_code TEXT,
  error_message TEXT,
  updated_at INTEGER NOT NULL
);
