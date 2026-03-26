-- Add aliases support for KG entities used by Codex detected-entity matching.
ALTER TABLE kg_entities
  ADD COLUMN aliases TEXT NOT NULL DEFAULT '[]';
