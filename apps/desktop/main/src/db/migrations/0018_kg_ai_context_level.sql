-- Add ai_context_level to Knowledge Graph entities.
-- Why: phase-2 context assembly must filter entities by injection policy.

ALTER TABLE kg_entities
  ADD COLUMN ai_context_level TEXT NOT NULL DEFAULT 'when_detected';

CREATE INDEX IF NOT EXISTS idx_kg_entities_project_context_level
  ON kg_entities(project_id, ai_context_level);
