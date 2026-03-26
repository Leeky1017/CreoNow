import assert from "node:assert/strict";

import Database from "better-sqlite3";

import type { Logger } from "../../../logging/logger";
import { createSqliteTraceStore } from "../traceStore";

function createLogger(): Logger {
  return {
    logPath: "<test>",
    info: () => {},
    error: () => {},
  };
}

function createTraceDb(): Database.Database {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE generation_traces (
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

    CREATE TABLE trace_feedback (
      feedback_id TEXT PRIMARY KEY,
      trace_id TEXT NOT NULL,
      run_id TEXT NOT NULL,
      action TEXT NOT NULL,
      evidence_ref TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (trace_id) REFERENCES generation_traces(trace_id) ON DELETE CASCADE
    );
  `);
  return db;
}

// S3-TRACE-S2: stores feedback with valid trace linkage
{
  const db = createTraceDb();
  const store = createSqliteTraceStore({
    db,
    logger: createLogger(),
    now: () => 1_702_000_000_000,
  });

  const persisted = store.persistGenerationTrace({
    traceId: "trace-s2",
    runId: "run-s2",
    executionId: "exec-s2",
    skillId: "builtin:polish",
    mode: "ask",
    model: "gpt-5.2",
    inputText: "input-s2",
    outputText: "output-s2",
    context: {
      projectId: "project-s2",
      documentId: "doc-s2",
    },
    startedAt: 1_702_000_000_001,
    completedAt: 1_702_000_000_002,
  });

  assert.equal(persisted.ok, true);
  if (!persisted.ok) {
    throw new Error("persistGenerationTrace should succeed");
  }

  const feedback = store.recordTraceFeedback({
    runId: "run-s2",
    action: "accept",
    evidenceRef: "feedback-s2",
    ts: 1_702_000_000_003,
  });

  assert.equal(
    feedback.ok,
    true,
    "S3-TRACE-S2: feedback should be recorded with trace linkage",
  );

  if (!feedback.ok) {
    throw new Error("recordTraceFeedback should return ok result");
  }

  const linked = db
    .prepare(
      `
        SELECT
          tf.feedback_id AS feedbackId,
          tf.trace_id AS feedbackTraceId,
          tf.run_id AS runId,
          tf.action AS action,
          tf.evidence_ref AS evidenceRef,
          gt.trace_id AS traceId,
          gt.run_id AS generationRunId
        FROM trace_feedback tf
        JOIN generation_traces gt ON gt.trace_id = tf.trace_id
        WHERE tf.feedback_id = ?
      `,
    )
    .get(feedback.data.feedbackId) as
    | {
        feedbackId: string;
        feedbackTraceId: string;
        runId: string;
        action: string;
        evidenceRef: string;
        traceId: string;
        generationRunId: string;
      }
    | undefined;

  assert.ok(linked, "S3-TRACE-S2: feedback row should join back to trace row");
  assert.equal(linked?.feedbackTraceId, "trace-s2");
  assert.equal(linked?.traceId, "trace-s2");
  assert.equal(linked?.runId, "run-s2");
  assert.equal(linked?.generationRunId, "run-s2");
  assert.equal(linked?.action, "accept");
  assert.equal(linked?.evidenceRef, "feedback-s2");

  db.close();
}
