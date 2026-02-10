import type Database from "better-sqlite3";
import type { IpcMain } from "electron";

import type { Logger } from "../../../main/src/logging/logger";

export type Handler = (event: unknown, payload: unknown) => Promise<unknown>;

export type FakeIpcMain = {
  handle: (channel: string, handler: Handler) => void;
};

type FtsRow = {
  projectId: string;
  documentId: string;
  documentTitle: string;
  documentType: string;
  snippet: string;
  score: number;
  updatedAt: number;
};

export function createLogger(): Logger {
  return {
    logPath: "<test>",
    info: () => {},
    error: () => {},
  };
}

export function createIpcHarness(): {
  ipcMain: FakeIpcMain;
  handlers: Map<string, Handler>;
} {
  const handlers = new Map<string, Handler>();
  const ipcMain: FakeIpcMain = {
    handle: (channel, handler) => {
      handlers.set(channel, handler);
    },
  };
  return { ipcMain, handlers };
}

export function asIpcMain(ipcMain: FakeIpcMain): IpcMain {
  return ipcMain as unknown as IpcMain;
}

export function createFtsDbStub(args: {
  projectId: string;
  rows: Array<{
    documentId: string;
    title: string;
    snippet: string;
    score: number;
    updatedAt: number;
  }>;
}): Database.Database {
  const normalizedRows: FtsRow[] = args.rows.map((row) => ({
    projectId: args.projectId,
    documentId: row.documentId,
    documentTitle: row.title,
    documentType: "chapter",
    snippet: row.snippet,
    score: row.score,
    updatedAt: row.updatedAt,
  }));

  const prepare = (sql: string) => {
    if (sql.includes("COUNT(")) {
      return {
        get: (projectId: string) => ({
          total: normalizedRows.filter((row) => row.projectId === projectId)
            .length,
        }),
      };
    }

    if (sql.includes("FROM documents_fts")) {
      return {
        all: (
          projectId: string,
          _query: string,
          limit: number,
          offset: number,
        ) =>
          normalizedRows
            .filter((row) => row.projectId === projectId)
            .slice(offset, offset + limit),
      };
    }

    if (
      sql.includes("FROM documents") &&
      sql.includes("content_text") &&
      sql.includes("project_id")
    ) {
      return {
        all: () => [],
      };
    }

    return {
      all: () => [],
      get: () => ({ total: 0 }),
    };
  };

  return { prepare } as unknown as Database.Database;
}
