DROP TABLE IF EXISTS kg_relations;
DROP TABLE IF EXISTS kg_entities;

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

