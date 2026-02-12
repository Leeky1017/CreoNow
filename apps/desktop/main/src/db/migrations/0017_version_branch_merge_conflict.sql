CREATE TABLE IF NOT EXISTS document_branches (
  branch_id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  name TEXT NOT NULL,
  base_snapshot_id TEXT NOT NULL,
  head_snapshot_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(document_id, name),
  FOREIGN KEY (document_id) REFERENCES documents(document_id) ON DELETE CASCADE,
  FOREIGN KEY (base_snapshot_id) REFERENCES document_versions(version_id),
  FOREIGN KEY (head_snapshot_id) REFERENCES document_versions(version_id)
);

CREATE INDEX IF NOT EXISTS idx_document_branches_document_created
  ON document_branches (document_id, created_at DESC, branch_id ASC);

CREATE TABLE IF NOT EXISTS document_merge_sessions (
  merge_session_id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  source_branch_name TEXT NOT NULL,
  target_branch_name TEXT NOT NULL,
  merged_template_text TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (document_id) REFERENCES documents(document_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS document_merge_conflicts (
  conflict_id TEXT PRIMARY KEY,
  merge_session_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  source_branch_name TEXT NOT NULL,
  target_branch_name TEXT NOT NULL,
  conflict_index INTEGER NOT NULL,
  base_text TEXT NOT NULL,
  ours_text TEXT NOT NULL,
  theirs_text TEXT NOT NULL,
  selected_resolution TEXT,
  manual_text TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (merge_session_id) REFERENCES document_merge_sessions(merge_session_id) ON DELETE CASCADE,
  FOREIGN KEY (document_id) REFERENCES documents(document_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_document_merge_conflicts_session
  ON document_merge_conflicts (merge_session_id, conflict_index ASC, conflict_id ASC);
