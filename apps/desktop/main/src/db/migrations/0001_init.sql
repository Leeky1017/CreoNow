CREATE TABLE IF NOT EXISTS projects (
  project_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  root_path TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS documents (
  document_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content_json TEXT NOT NULL,
  content_text TEXT NOT NULL,
  content_md TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(project_id) ON DELETE CASCADE
);

-- P0-012: Full-text search index (FTS5).
--
-- Why: CNWB-REQ-100 requires deterministic full-text search; write-path triggers
-- keep the index consistent with `documents.content_text` (SSOT derived text).
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

CREATE TABLE IF NOT EXISTS document_versions (
  version_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  actor TEXT NOT NULL,
  content_json TEXT NOT NULL,
  content_text TEXT NOT NULL,
  content_md TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
  FOREIGN KEY(document_id) REFERENCES documents(document_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
  scope TEXT NOT NULL,
  key TEXT NOT NULL,
  value_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (scope, key)
);

CREATE TABLE IF NOT EXISTS skills (
  skill_id TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL,
  valid INTEGER NOT NULL,
  error_code TEXT,
  error_message TEXT,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS user_memory (
  memory_id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  scope TEXT NOT NULL,
  project_id TEXT,
  origin TEXT NOT NULL,
  source_ref TEXT,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  FOREIGN KEY(project_id) REFERENCES projects(project_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_memory_scope_type_updated
  ON user_memory(scope, type, updated_at DESC, memory_id ASC);

CREATE INDEX IF NOT EXISTS idx_user_memory_project
  ON user_memory(project_id, updated_at DESC, memory_id ASC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_memory_learned_source
  ON user_memory(origin, scope, project_id, source_ref)
  WHERE origin = 'learned' AND source_ref IS NOT NULL;

CREATE TABLE IF NOT EXISTS skill_feedback (
  feedback_id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  action TEXT NOT NULL,
  evidence_ref TEXT,
  ignored INTEGER NOT NULL,
  ignored_reason TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_skill_feedback_evidence_action
  ON skill_feedback(evidence_ref, action, created_at DESC);

CREATE TABLE IF NOT EXISTS kg_entities (
  entity_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  entity_type TEXT,
  description TEXT,
  metadata_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(project_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_kg_entities_project_updated
  ON kg_entities(project_id, updated_at DESC, entity_id ASC);

CREATE TABLE IF NOT EXISTS kg_relations (
  relation_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  from_entity_id TEXT NOT NULL,
  to_entity_id TEXT NOT NULL,
  relation_type TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  evidence_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
  FOREIGN KEY(from_entity_id) REFERENCES kg_entities(entity_id) ON DELETE CASCADE,
  FOREIGN KEY(to_entity_id) REFERENCES kg_entities(entity_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_kg_relations_project_updated
  ON kg_relations(project_id, updated_at DESC, relation_id ASC);

CREATE INDEX IF NOT EXISTS idx_kg_relations_project_from
  ON kg_relations(project_id, from_entity_id, relation_id ASC);

CREATE INDEX IF NOT EXISTS idx_kg_relations_project_to
  ON kg_relations(project_id, to_entity_id, relation_id ASC);

-- P0-013: Judge model metadata (minimal baseline).
CREATE TABLE IF NOT EXISTS judge_models (
  model_id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  error_code TEXT,
  error_message TEXT,
  updated_at INTEGER NOT NULL
);
