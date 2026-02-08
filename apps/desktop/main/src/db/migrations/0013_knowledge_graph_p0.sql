-- Rebuild Knowledge Graph tables for KG P0 contract baseline.
-- Why: align SQLite schema with knowledge:entity/*, knowledge:relation/*,
-- and query contract requirements from knowledge-graph-p0-entity-relation-query.

DROP TABLE IF EXISTS kg_relations;
DROP TABLE IF EXISTS kg_relation_types;
DROP TABLE IF EXISTS kg_entities;

CREATE TABLE IF NOT EXISTS kg_entities (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('character', 'location', 'event', 'item', 'faction')),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  attributes_json TEXT NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(project_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_kg_entities_project
  ON kg_entities(project_id);

CREATE INDEX IF NOT EXISTS idx_kg_entities_project_type
  ON kg_entities(project_id, type);

CREATE INDEX IF NOT EXISTS idx_kg_entities_project_name
  ON kg_entities(project_id, name);

CREATE UNIQUE INDEX IF NOT EXISTS idx_kg_entities_project_type_name
  ON kg_entities(project_id, type, lower(trim(name)));

CREATE TABLE IF NOT EXISTS kg_relation_types (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  builtin INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(project_id, key),
  FOREIGN KEY(project_id) REFERENCES projects(project_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS kg_relations (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  source_entity_id TEXT NOT NULL,
  target_entity_id TEXT NOT NULL,
  relation_type TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
  FOREIGN KEY(source_entity_id) REFERENCES kg_entities(id) ON DELETE CASCADE,
  FOREIGN KEY(target_entity_id) REFERENCES kg_entities(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_kg_relations_project
  ON kg_relations(project_id);

CREATE INDEX IF NOT EXISTS idx_kg_relations_source
  ON kg_relations(project_id, source_entity_id);

CREATE INDEX IF NOT EXISTS idx_kg_relations_target
  ON kg_relations(project_id, target_entity_id);
