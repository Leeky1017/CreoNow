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

// S3-TRACE-S1: persists generation trace and returns traceId
{
  const db = createTraceDb();
  const store = createSqliteTraceStore({
    db,
    logger: createLogger(),
    now: () => 1_701_000_000_000,
  });

  const persisted = store.persistGenerationTrace({
    traceId: "trace-s1",
    runId: "run-s1",
    executionId: "exec-s1",
    skillId: "builtin:polish",
    mode: "ask",
    model: "gpt-5.2",
    inputText: "input-s1",
    outputText: "output-s1",
    context: {
      projectId: "project-s1",
      documentId: "doc-s1",
    },
    startedAt: 1_701_000_000_001,
    completedAt: 1_701_000_000_002,
  });

  assert.equal(
    persisted.ok,
    true,
    "S3-TRACE-S1: persistGenerationTrace should succeed",
  );

  if (!persisted.ok) {
    throw new Error("persistGenerationTrace should return ok result");
  }

  assert.equal(persisted.data.traceId, "trace-s1");

  const row = db
    .prepare(
      `
        SELECT
          trace_id AS traceId,
          run_id AS runId,
          execution_id AS executionId,
          skill_id AS skillId,
          mode,
          model,
          input_text AS inputText,
          output_text AS outputText,
          project_id AS projectId,
          document_id AS documentId,
          started_at AS startedAt,
          completed_at AS completedAt,
          created_at AS createdAt
        FROM generation_traces
        WHERE trace_id = ?
      `,
    )
    .get("trace-s1") as
    | {
        traceId: string;
        runId: string;
        executionId: string;
        skillId: string;
        mode: string;
        model: string;
        inputText: string;
        outputText: string;
        projectId: string | null;
        documentId: string | null;
        startedAt: number;
        completedAt: number;
        createdAt: number;
      }
    | undefined;

  assert.ok(row, "S3-TRACE-S1: generation_traces row should exist");

  assert.equal(row?.traceId, "trace-s1");
  assert.equal(row?.runId, "run-s1");
  assert.equal(row?.executionId, "exec-s1");
  assert.equal(row?.skillId, "builtin:polish");
  assert.equal(row?.mode, "ask");
  assert.equal(row?.model, "gpt-5.2");
  assert.equal(row?.inputText, "input-s1");
  assert.equal(row?.outputText, "output-s1");
  assert.equal(row?.projectId, "project-s1");
  assert.equal(row?.documentId, "doc-s1");
  assert.equal(row?.startedAt, 1_701_000_000_001);
  assert.equal(row?.completedAt, 1_701_000_000_002);
  assert.equal(row?.createdAt, 1_701_000_000_000);

  db.close();
}
