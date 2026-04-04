import { describe, expect, expectTypeOf, it } from "vitest";
import type Database from "better-sqlite3";

import type { IpcRequest, IpcResponseData } from "@shared/types/ipc-generated";
import {
  createDocumentService,
  type VersionSnapshotReason,
} from "../../services/documents/documentService";
import type { Logger } from "../../logging/logger";

const P1_VERSION_SNAPSHOT_REASONS = [
  "manual-save",
  "autosave",
  "ai-accept",
  "ai-partial-accept",
  "pre-write",
  "pre-rollback",
  "rollback",
  "status-change",
] as const satisfies readonly VersionSnapshotReason[];

function createNoopLogger(): Logger {
  return {
    logPath: "<test>",
    info: () => {},
    error: () => {},
  };
}

function createSnapshotDb(reason: string): Database.Database {
  return {
    prepare(sql: string) {
      if (
        sql.includes("WHERE project_id = ? AND document_id = ? ORDER BY") &&
        sql.includes("created_at DESC")
      ) {
        return {
          all() {
            return [
              {
                versionId: "version-1",
                actor: "user",
                reason,
                contentHash: "hash-1",
                wordCount: 42,
                createdAt: 1710000000000,
              },
            ];
          },
        };
      }

      if (sql.includes("WHERE project_id = ? AND document_id = ? AND version_id = ?")) {
        return {
          get() {
            return {
              documentId: "doc-1",
              projectId: "project-1",
              versionId: "version-1",
              actor: "user",
              reason,
              contentJson: "{\"type\":\"doc\"}",
              contentText: "text",
              contentMd: "text",
              contentHash: "hash-1",
              wordCount: 42,
              createdAt: 1710000000000,
            };
          },
        };
      }

      return {
        get() {
          return undefined;
        },
        all() {
          return [];
        },
      };
    },
    transaction(run: () => void) {
      return () => run();
    },
  } as unknown as Database.Database;
}

describe("Version snapshot reason P1 contract", () => {
  it("keeps document service and IPC snapshot reasons aligned", () => {
    type SnapshotCreateReason = IpcRequest<"version:snapshot:create">["reason"];
    type FileSaveReason = IpcRequest<"file:document:save">["reason"];
    type SnapshotListReason =
      IpcResponseData<"version:snapshot:list">["items"][number]["reason"];
    type SnapshotReadReason = IpcResponseData<"version:snapshot:read">["reason"];

    expectTypeOf<SnapshotCreateReason>().toEqualTypeOf<VersionSnapshotReason>();
    expectTypeOf<FileSaveReason>().toEqualTypeOf<VersionSnapshotReason>();
    expectTypeOf<SnapshotListReason>().toEqualTypeOf<VersionSnapshotReason>();
    expectTypeOf<SnapshotReadReason>().toEqualTypeOf<VersionSnapshotReason>();

    const snapshotReasons: SnapshotCreateReason[] = [
      ...P1_VERSION_SNAPSHOT_REASONS,
    ];
    const fileSaveReasons: FileSaveReason[] = [...P1_VERSION_SNAPSHOT_REASONS];

    expect(snapshotReasons).toContain("pre-write");
    expect(snapshotReasons).toContain("pre-rollback");
    expect(snapshotReasons).toContain("rollback");
    expect(snapshotReasons).toContain("ai-partial-accept");
    expect(fileSaveReasons).toContain("pre-write");
    expect(fileSaveReasons).toContain("pre-rollback");
    expect(fileSaveReasons).toContain("rollback");
    expect(fileSaveReasons).toContain("ai-partial-accept");
  });

  it("normalizes legacy branch-merge reasons off the public read/list surface", () => {
    const service = createDocumentService({
      db: createSnapshotDb("branch-merge"),
      logger: createNoopLogger(),
    });

    const listed = service.listVersions({ projectId: "project-1", documentId: "doc-1" });
    expect(listed.ok).toBe(true);
    if (!listed.ok) {
      throw new Error("expected listVersions to succeed");
    }
    expect(listed.data.items[0]?.reason).toBe("manual-save");

    const read = service.readVersion({
      projectId: "project-1",
      documentId: "doc-1",
      versionId: "version-1",
    });
    expect(read.ok).toBe(true);
    if (!read.ok) {
      throw new Error("expected readVersion to succeed");
    }
    expect(read.data.reason).toBe("manual-save");
  });
});
