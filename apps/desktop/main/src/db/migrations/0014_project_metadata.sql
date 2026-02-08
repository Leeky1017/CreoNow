ALTER TABLE projects
  ADD COLUMN type TEXT NOT NULL DEFAULT 'novel';

ALTER TABLE projects
  ADD COLUMN description TEXT NOT NULL DEFAULT '';

ALTER TABLE projects
  ADD COLUMN stage TEXT NOT NULL DEFAULT 'outline';

ALTER TABLE projects
  ADD COLUMN target_word_count INTEGER;

ALTER TABLE projects
  ADD COLUMN target_chapter_count INTEGER;

ALTER TABLE projects
  ADD COLUMN narrative_person TEXT NOT NULL DEFAULT 'first';

ALTER TABLE projects
  ADD COLUMN language_style TEXT NOT NULL DEFAULT '';

ALTER TABLE projects
  ADD COLUMN target_audience TEXT NOT NULL DEFAULT '';

ALTER TABLE projects
  ADD COLUMN default_skill_set_id TEXT;

ALTER TABLE projects
  ADD COLUMN knowledge_graph_id TEXT;
