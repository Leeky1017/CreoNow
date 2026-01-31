-- P0-010: Skills table schema upgrade (enabled/valid/error_code/error_message).
--
-- Why: earlier schema stored `package_json`; V1 requires diagnosable enabled/valid/error_* state.

CREATE TABLE IF NOT EXISTS skills_v2 (
  skill_id TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL,
  valid INTEGER NOT NULL,
  error_code TEXT,
  error_message TEXT,
  updated_at INTEGER NOT NULL
);

INSERT INTO skills_v2 (skill_id, enabled, valid, error_code, error_message, updated_at)
SELECT
  skill_id,
  enabled,
  1 as valid,
  NULL as error_code,
  NULL as error_message,
  updated_at
FROM skills;

DROP TABLE skills;
ALTER TABLE skills_v2 RENAME TO skills;

