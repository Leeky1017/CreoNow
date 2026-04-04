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
  parentVersionId: string | null;
  contentJson: string;
  contentText: string;
  contentMd: string;
  contentHash: string;
  wordCount: number;
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
  seedVersion: (args: {
    documentId: string;
    actor?: "user" | "auto" | "ai";
    reason: string;
    parentVersionId?: string | null;
  }) => string;
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

      if (sql.startsWith("SELECT version_id as versionId FROM document_versions")) {
        return {
          get: (documentId: string) => {
            const found = [...versions]
              .filter((item) => item.documentId === documentId)
              .sort((left, right) => left.createdAt - right.createdAt || left.versionId.localeCompare(right.versionId))
              .at(-1);
            return found ? { versionId: found.versionId } : undefined;
          },
        };
      }

      if (sql.startsWith("INSERT INTO document_versions")) {
        return {
          run: (...params: unknown[]) => {
            const [
              versionId,
              projectId,
              documentId,
              actor,
              reason,
              parentVersionId,
              contentJson,
              contentText,
              contentMd,
              contentHash,
              wordCount,
              diffFormat,
              diffText,
              createdAt,
            ] = params as [
              string,
              string,
              string,
              "user" | "auto" | "ai",
              string,
              string | null,
              string,
              string,
              string,
              string,
              number,
              string,
              string,
              number,
            ];
            if (params.length !== 14) {
              throw new Error(`Expected 14 params for document_versions insert, received ${params.length}`);
            }
            if (typeof wordCount !== "number" || typeof createdAt !== "number") {
              throw new Error("document_versions insert requires numeric wordCount and createdAt");
            }
            void diffFormat;
            void diffText;
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
              parentVersionId,
              contentJson,
              contentText,
              contentMd,
              contentHash,
              wordCount,
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
    seedVersion: (args: {
      documentId: string;
      actor?: "user" | "auto" | "ai";
      reason: string;
      parentVersionId?: string | null;
    }) => string;
  };

  db.readDocument = (documentId: string) => documents.get(documentId);
  db.listVersions = (documentId: string) =>
    versions.filter((item) => item.documentId === documentId);
  db.seedVersion = ({ documentId, actor = "user", reason, parentVersionId = null }) => {
    const document = documents.get(documentId);
    if (!document) {
      throw new Error(`Unknown document for seedVersion: ${documentId}`);
    }
    const versionId = `seed-${documentId}-${versions.length + 1}`;
    versions.push({
      versionId,
      projectId: document.projectId,
      documentId,
      actor,
      reason,
      parentVersionId,
      contentJson: document.contentJson,
      contentText: document.contentText,
      contentMd: document.contentMd,
      contentHash: document.contentHash,
      wordCount: document.contentText.trim().length === 0
        ? 0
        : document.contentText.trim().split(/\s+/u).length,
      createdAt: now++,
    });
    return versionId;
  };
  return db;
}

export function asIpcMain(ipcMain: FakeIpcMain): IpcMain {
  return ipcMain as unknown as IpcMain;
}
