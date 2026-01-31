CREATE TABLE IF NOT EXISTS stats_daily (
  date TEXT PRIMARY KEY,
  words_written INTEGER NOT NULL,
  writing_seconds INTEGER NOT NULL,
  skills_used INTEGER NOT NULL,
  documents_created INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
