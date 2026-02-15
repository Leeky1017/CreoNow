-- Add optional last-seen state for KG entities.
-- Why: Sprint 3 entity status extraction needs a stable write-back field.
ALTER TABLE kg_entities
  ADD COLUMN last_seen_state TEXT;
