-- S3 trace persistence foundation.
-- Why: persist AI generation traces and feedback linkage for audit/replay.

CREATE TABLE IF NOT EXISTS generation_traces (
  trace_id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL UNIQUE,
  execution_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  model TEXT NOT NULL,
  input_text TEXT NOT NULL,
  output_text TEXT NOT NULL,
  project_id TEXT,
  document_id TEXT,
  started_at INTEGER NOT NULL,
  completed_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_generation_traces_project_created
  ON generation_traces(project_id, created_at DESC, trace_id ASC);

CREATE INDEX IF NOT EXISTS idx_generation_traces_document_created
  ON generation_traces(document_id, created_at DESC, trace_id ASC);

CREATE TABLE IF NOT EXISTS trace_feedback (
  feedback_id TEXT PRIMARY KEY,
  trace_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('accept', 'reject', 'partial')),
  evidence_ref TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (trace_id) REFERENCES generation_traces(trace_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_trace_feedback_trace_created
  ON trace_feedback(trace_id, created_at DESC, feedback_id ASC);
