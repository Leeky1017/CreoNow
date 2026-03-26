-- P0 Memory System: episodic storage baseline.
--
-- Why: MS-1 requires durable episode rows, indexed mixed recall, and
-- deterministic retention budgets as prerequisite for later distillation phases.

CREATE TABLE IF NOT EXISTS memory_episodes (
  episode_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  scope TEXT NOT NULL,
  version INTEGER NOT NULL,
  chapter_id TEXT NOT NULL,
  scene_type TEXT NOT NULL,
  skill_used TEXT NOT NULL,
  input_context TEXT NOT NULL,
  candidates_json TEXT NOT NULL,
  selected_index INTEGER NOT NULL,
  final_text TEXT NOT NULL,
  explicit_feedback TEXT,
  edit_distance REAL NOT NULL,
  implicit_signal TEXT NOT NULL,
  implicit_weight REAL NOT NULL,
  importance REAL NOT NULL,
  recall_count INTEGER NOT NULL DEFAULT 0,
  last_recalled_at INTEGER,
  compressed INTEGER NOT NULL DEFAULT 0,
  user_confirmed INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(project_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_memory_episodes_project_created
  ON memory_episodes(project_id, created_at DESC, episode_id ASC);

CREATE INDEX IF NOT EXISTS idx_memory_episodes_scene_type
  ON memory_episodes(scene_type, created_at DESC, episode_id ASC);

CREATE INDEX IF NOT EXISTS idx_memory_episodes_last_recalled
  ON memory_episodes(last_recalled_at DESC, episode_id ASC);

CREATE TABLE IF NOT EXISTS memory_semantic_placeholders (
  rule_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  scope TEXT NOT NULL,
  version INTEGER NOT NULL,
  rule_text TEXT NOT NULL,
  confidence REAL NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(project_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_memory_semantic_placeholders_project_updated
  ON memory_semantic_placeholders(project_id, updated_at DESC, rule_id ASC);
