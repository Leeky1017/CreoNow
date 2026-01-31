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
  package_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS user_memory (
  memory_id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  tags_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS kg_entities (
  entity_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  data_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS kg_relations (
  relation_id TEXT PRIMARY KEY,
  from_entity_id TEXT NOT NULL,
  to_entity_id TEXT NOT NULL,
  relation_type TEXT NOT NULL,
  data_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(from_entity_id) REFERENCES kg_entities(entity_id) ON DELETE CASCADE,
  FOREIGN KEY(to_entity_id) REFERENCES kg_entities(entity_id) ON DELETE CASCADE
);

