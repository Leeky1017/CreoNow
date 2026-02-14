import assert from "node:assert/strict";

import type Database from "better-sqlite3";

import type { Logger } from "../../../logging/logger";
import { createMemoryService } from "../memoryService";

type MemoryRow = {
  memoryId: string;
  type: string;
  scope: string;
  projectId: string | null;
  documentId: string | null;
  origin: string;
  sourceRef: string | null;
  content: string;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
};

type SettingsRow = {
  scope: string;
  key: string;
  valueJson: string;
};

function createLogger(): Logger {
  return {
    logPath: "<test>",
    info: () => {},
    error: () => {},
  };
}

function createDbStub(args?: {
  memories?: MemoryRow[];
  settings?: SettingsRow[];
}): Database.Database {
  const memories = [...(args?.memories ?? [])];
  const settings = [...(args?.settings ?? [])];

  const db = {
    prepare: (sql: string) => {
      if (sql.includes("FROM settings WHERE scope = ? AND key = ?")) {
        return {
          get: (scope: string, key: string) => {
            const row = settings.find((item) => {
              return item.scope === scope && item.key === key;
            });
            if (!row) {
              return undefined;
            }
            return { valueJson: row.valueJson };
          },
        };
      }

      if (
        sql.includes("FROM user_memory") &&
        sql.includes("deleted_at IS NULL")
      ) {
        return {
          all: (...params: unknown[]) => {
            if (params.length === 0) {
              return memories
                .filter((m) => m.scope === "global")
                .map(cloneMemoryRow);
            }
            if (params.length === 1) {
              const projectId = params[0] as string;
              return memories
                .filter((m) => {
                  return (
                    m.scope === "global" ||
                    (m.scope === "project" && m.projectId === projectId)
                  );
                })
                .map(cloneMemoryRow);
            }

            const projectId = params[0] as string;
            const documentId = params[2] as string;
            return memories
              .filter((m) => {
                return (
                  m.scope === "global" ||
                  (m.scope === "project" && m.projectId === projectId) ||
                  (m.scope === "document" &&
                    m.projectId === projectId &&
                    m.documentId === documentId)
                );
              })
              .map(cloneMemoryRow);
          },
        };
      }

      throw new Error(`Unexpected SQL: ${sql}`);
    },
  } as unknown as Database.Database;

  return db;
}

function cloneMemoryRow(row: MemoryRow): MemoryRow {
  return {
    memoryId: row.memoryId,
    type: row.type,
    scope: row.scope,
    projectId: row.projectId,
    documentId: row.documentId,
    origin: row.origin,
    sourceRef: row.sourceRef,
    content: row.content,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}

// Scenario: MS-S2-MI-S1
// should return preview items that can be injected into settings prompt
{
  const svc = createMemoryService({
    db: createDbStub({
      settings: [
        {
          scope: "app",
          key: "creonow.memory.injectionEnabled",
          valueJson: "true",
        },
      ],
      memories: [
        {
          memoryId: "doc-1",
          type: "preference",
          scope: "document",
          projectId: "proj-1",
          documentId: "d-1",
          origin: "manual",
          sourceRef: null,
          content: "保持第一人称",
          createdAt: 10,
          updatedAt: 100,
          deletedAt: null,
        },
        {
          memoryId: "project-1",
          type: "preference",
          scope: "project",
          projectId: "proj-1",
          documentId: null,
          origin: "learned",
          sourceRef: null,
          content: "动作场景偏好短句",
          createdAt: 11,
          updatedAt: 110,
          deletedAt: null,
        },
      ],
    }),
    logger: createLogger(),
  });

  const result = svc.previewInjection({
    projectId: "proj-1",
    documentId: "d-1",
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.data.mode, "deterministic");
    assert.equal(result.data.items.length, 2);
    assert.equal(result.data.items[0]?.content, "保持第一人称");
    assert.equal(result.data.items[1]?.content, "动作场景偏好短句");
    assert.equal(result.data.items[0]?.reason.kind, "deterministic");
  }
}

console.log("memoryService.previewInjection.test.ts: all assertions passed");
