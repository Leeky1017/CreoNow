import { createHash } from "node:crypto";

import type Database from "better-sqlite3";
import type { IpcMain } from "electron";

import type { Logger } from "../../../main/src/logging/logger";

export type Handler = (event: unknown, payload: unknown) => Promise<unknown>;

export type FakeIpcMain = {
  handle: (channel: string, handler: Handler) => void;
};

type StoredDocument = {
  documentId: string;
  projectId: string;
  title: string;
  contentJson: string;
  contentText: string;
  contentMd: string;
  contentHash: string;
  type: string;
  updatedAt: number;
};

type StoredVersion = {
  versionId: string;
  projectId: string;
  documentId: string;
  actor: "user" | "auto" | "ai";
  reason: string;
  contentJson: string;
  contentText: string;
  contentMd: string;
  contentHash: string;
  createdAt: number;
};

function hashJson(json: string): string {
  return createHash("sha256").update(json, "utf8").digest("hex");
}

function toTipTapDoc(text: string): Record<string, unknown> {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text }],
      },
    ],
  };
}

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

export function createReplaceDbStub(args: {
  projectId: string;
  documents: Array<{
    documentId: string;
    title: string;
    text: string;
  }>;
  failSnapshotForDocumentIds?: string[];
  conflictOnUpdateDocumentIds?: string[];
}): Database.Database & {
  readDocument: (documentId: string) => StoredDocument | undefined;
  listVersions: (documentId: string) => StoredVersion[];
} {
  const failSnapshotSet = new Set(args.failSnapshotForDocumentIds ?? []);
  const conflictOnUpdateSet = new Set(args.conflictOnUpdateDocumentIds ?? []);

  const documents = new Map<string, StoredDocument>();
  const versions: StoredVersion[] = [];

  let now = 1_739_030_400_000;

  for (const source of args.documents) {
    const contentJson = JSON.stringify(toTipTapDoc(source.text));
    documents.set(source.documentId, {
      documentId: source.documentId,
      projectId: args.projectId,
      title: source.title,
      contentJson,
      contentText: source.text,
      contentMd: source.text,
      contentHash: hashJson(contentJson),
      type: "chapter",
      updatedAt: now++,
    });
  }

  const db = {
    prepare: (sql: string) => {
      if (
        sql.includes("FROM documents WHERE project_id = ? AND document_id = ?")
      ) {
        return {
          get: (projectId: string, documentId: string) => {
            const found = documents.get(documentId);
            if (!found || found.projectId !== projectId) {
              return undefined;
            }
            return {
              documentId: found.documentId,
              projectId: found.projectId,
              title: found.title,
              contentJson: found.contentJson,
              contentText: found.contentText,
              contentMd: found.contentMd,
              contentHash: found.contentHash,
              type: found.type,
              updatedAt: found.updatedAt,
            };
          },
        };
      }

      if (sql.includes("FROM documents WHERE project_id = ? ORDER BY")) {
        return {
          all: (projectId: string) =>
            [...documents.values()]
              .filter((doc) => doc.projectId === projectId)
              .map((doc) => ({
                documentId: doc.documentId,
                projectId: doc.projectId,
                title: doc.title,
                contentJson: doc.contentJson,
                contentText: doc.contentText,
                contentMd: doc.contentMd,
                contentHash: doc.contentHash,
                type: doc.type,
                updatedAt: doc.updatedAt,
              })),
        };
      }

      if (sql.startsWith("UPDATE documents SET content_json = ?")) {
        return {
          run: (
            contentJson: string,
            contentText: string,
            contentMd: string,
            contentHash: string,
            updatedAt: number,
            projectId: string,
            documentId: string,
          ) => {
            const found = documents.get(documentId);
            if (!found || found.projectId !== projectId) {
              return { changes: 0 };
            }
            if (conflictOnUpdateSet.has(documentId)) {
              return { changes: 0 };
            }
            found.contentJson = contentJson;
            found.contentText = contentText;
            found.contentMd = contentMd;
            found.contentHash = contentHash;
            found.updatedAt = updatedAt;
            return { changes: 1 };
          },
        };
      }

      if (sql.startsWith("INSERT INTO document_versions")) {
        return {
          run: (
            versionId: string,
            projectId: string,
            documentId: string,
            actor: "user" | "auto" | "ai",
            reason: string,
            contentJson: string,
            contentText: string,
            contentMd: string,
            contentHash: string,
            _diffFormat: string,
            _diffText: string,
            createdAt: number,
          ) => {
            if (
              reason === "pre-search-replace" &&
              failSnapshotSet.has(documentId)
            ) {
              throw new Error(`SNAPSHOT_FAILED:${documentId}`);
            }
            versions.push({
              versionId,
              projectId,
              documentId,
              actor,
              reason,
              contentJson,
              contentText,
              contentMd,
              contentHash,
              createdAt,
            });
            return { changes: 1 };
          },
        };
      }

      throw new Error(`Unsupported SQL in stub: ${sql}`);
    },
    transaction: (fn: () => void) => () => fn(),
  } as unknown as Database.Database & {
    readDocument: (documentId: string) => StoredDocument | undefined;
    listVersions: (documentId: string) => StoredVersion[];
  };

  db.readDocument = (documentId: string) => documents.get(documentId);
  db.listVersions = (documentId: string) =>
    versions.filter((item) => item.documentId === documentId);
  return db;
}

export function asIpcMain(ipcMain: FakeIpcMain): IpcMain {
  return ipcMain as unknown as IpcMain;
}
