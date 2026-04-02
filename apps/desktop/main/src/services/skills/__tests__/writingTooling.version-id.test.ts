import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Database from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Logger } from "../../../logging/logger";
import { computeSelectionTextHash } from "../../editor/prosemirrorSchema";

const ids = ["doc-fixed", "z-manual", "a-prewrite", "m-ai-accept"];

vi.mock("node:crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:crypto")>();
  return {
    ...actual,
    randomUUID: vi.fn(() => ids.shift() ?? actual.randomUUID()),
  };
});

const MIGRATIONS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../db/migrations",
);

function createLogger(): Logger {
  return {
    logPath: "<test>",
    info: () => {},
    error: () => {},
  };
}

function applyAllMigrations(db: Database.Database): void {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql") && !file.includes("vec"))
    .sort();
  for (const file of files) {
    db.exec(fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8"));
  }
}

describe("createWritingToolRegistry versionId regression", () => {
  afterEach(() => {
    ids.splice(0, ids.length, "doc-fixed", "z-manual", "a-prewrite", "m-ai-accept");
    vi.restoreAllMocks();
  });

  it("same-millisecond saves 返回本次写入的真实 versionId，而不是 latest re-query", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);

    const db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    applyAllMigrations(db);

    const [{ createDocumentService }, { createWritingToolRegistry }] = await Promise.all([
      import("../../documents/documentService"),
      import("../writingTooling"),
    ]);

    try {
      const projectId = "proj-1";
      db.prepare(
        "INSERT INTO projects (project_id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      ).run(projectId, "测试项目", "/worktree/test-root", Date.now(), Date.now());

      const service = createDocumentService({ db, logger: createLogger() });
      const created = service.create({
        projectId,
        title: "第一章",
        type: "chapter",
      });
      expect(created.ok).toBe(true);
      if (!created.ok) {
        return;
      }

      const initialSave = service.save({
        projectId,
        documentId: created.data.documentId,
        contentJson: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "原文" }],
            },
          ],
        },
        actor: "user",
        reason: "manual-save",
      });
      expect(initialSave.ok).toBe(true);
      expect(initialSave.ok && initialSave.data.versionId).toBe("z-manual");

      const registry = createWritingToolRegistry({
        db,
        logger: createLogger(),
      });

      const snapshotTool = registry.get("versionSnapshot");
      const writeTool = registry.get("documentWrite");
      expect(snapshotTool).toBeDefined();
      expect(writeTool).toBeDefined();

      const snapshotResult = await snapshotTool!.execute({
        projectId,
        documentId: created.data.documentId,
        requestId: "req-prewrite",
        actor: "auto",
        reason: "pre-write",
      });
      expect(snapshotResult.success).toBe(true);
      expect(snapshotResult.data).toMatchObject({
        versionId: "a-prewrite",
      });

      const writeResult = await writeTool!.execute({
        projectId,
        documentId: created.data.documentId,
        requestId: "req-accept",
        content: "续写结果",
        selection: {
          from: 1,
          to: 3,
          text: "原文",
          selectionTextHash: computeSelectionTextHash("原文"),
        },
      });
      expect(writeResult.success).toBe(true);
      expect(writeResult.data).toMatchObject({
        versionId: "m-ai-accept",
      });
    } finally {
      db.close();
    }
  });

  it("continue 无 selection 但有 cursorPosition 时，在光标处插入并返回真实 versionId", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);

    const db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    applyAllMigrations(db);

    const [{ createDocumentService }, { createWritingToolRegistry }] = await Promise.all([
      import("../../documents/documentService"),
      import("../writingTooling"),
    ]);

    try {
      const projectId = "proj-1";
      db.prepare(
        "INSERT INTO projects (project_id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      ).run(projectId, "测试项目", "/worktree/test-root", Date.now(), Date.now());

      const service = createDocumentService({ db, logger: createLogger() });
      const created = service.create({
        projectId,
        title: "第一章",
        type: "chapter",
      });
      expect(created.ok).toBe(true);
      if (!created.ok) {
        return;
      }

      const initialSave = service.save({
        projectId,
        documentId: created.data.documentId,
        contentJson: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "甲乙丙丁" }],
            },
          ],
        },
        actor: "user",
        reason: "manual-save",
      });
      expect(initialSave.ok).toBe(true);
      expect(initialSave.ok && initialSave.data.versionId).toBe("z-manual");

      const registry = createWritingToolRegistry({
        db,
        logger: createLogger(),
      });

      const writeTool = registry.get("documentWrite");
      expect(writeTool).toBeDefined();

      const writeResult = await writeTool!.execute({
        projectId,
        documentId: created.data.documentId,
        requestId: "req-accept",
        content: "续写结果",
        cursorPosition: 3,
      });
      expect(writeResult.success).toBe(true);
      expect(writeResult.data).toMatchObject({
        versionId: "a-prewrite",
      });

      const read = service.read({
        projectId,
        documentId: created.data.documentId,
      });
      expect(read.ok).toBe(true);
      expect(read.ok && read.data.contentText).toBe("甲乙续写结果丙丁");
    } finally {
      db.close();
    }
  });
});
