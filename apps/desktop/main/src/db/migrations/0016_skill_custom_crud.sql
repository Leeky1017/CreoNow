-- P2: custom skill CRUD persistence.
--
-- Why: custom skills must survive restarts and expose deterministic CRUD via IPC.

CREATE TABLE IF NOT EXISTS custom_skills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  prompt_template TEXT NOT NULL,
  input_type TEXT NOT NULL CHECK (input_type IN ('selection', 'document')),
  context_rules TEXT NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('global', 'project')),
  project_id TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_custom_skills_scope_project
  ON custom_skills(scope, project_id, updated_at);
