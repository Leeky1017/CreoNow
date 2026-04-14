import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Database from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Logger } from "../../../logging/logger";
import { computeSelectionTextHash } from "../../editor/prosemirrorSchema";

const { applyCanonicalSkillWritebackMock } = vi.hoisted(() => ({
  applyCanonicalSkillWritebackMock: vi.fn(),
}));

vi.mock("../canonicalWriteback", () => ({
  applyCanonicalSkillWriteback: applyCanonicalSkillWritebackMock,
}));

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

async function createReadyContext() {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  applyAllMigrations(db);

  const [{ createDocumentService }, { createWritingToolRegistry }] = await Promise.all([
    import("../../documents/documentService"),
    import("../writingTooling"),
  ]);

  const projectId = "proj-canonical";
  db.prepare(
    "INSERT INTO projects (project_id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
  ).run(projectId, "测试项目", "/worktree/test-root", Date.now(), Date.now());

  const service = createDocumentService({ db, logger: createLogger() });
  const created = service.create({
    projectId,
    title: "第一章",
    type: "chapter",
  });

  if (!created.ok) {
    throw new Error("failed to create document fixture");
  }

  const initialSave = service.save({
    projectId,
    documentId: created.data.documentId,
    contentJson: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "原文甲乙丙丁" }],
        },
      ],
    },
    actor: "user",
    reason: "manual-save",
  });

  if (!initialSave.ok) {
    throw new Error("failed to seed document fixture");
  }

  const registry = createWritingToolRegistry({ db, logger: createLogger() });
  const writeTool = registry.get("documentWrite");
  if (!writeTool) {
    throw new Error("documentWrite tool missing in registry");
  }

  return {
    db,
    projectId,
    documentId: created.data.documentId,
    writeTool,
  };
}

describe("createWritingToolRegistry canonical write-back path", () => {
  afterEach(() => {
    applyCanonicalSkillWritebackMock.mockReset();
    vi.restoreAllMocks();
  });

  it("rewrite/polish selection write routes through applyCanonicalSkillWriteback", async () => {
    applyCanonicalSkillWritebackMock.mockReturnValue({
      ok: true,
      data: {
        contentJson: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "改写后文本" }],
            },
          ],
        },
      },
    });

    const ctx = await createReadyContext();
    try {
      const result = await ctx.writeTool.execute({
        projectId: ctx.projectId,
        documentId: ctx.documentId,
        requestId: "req-rewrite",
        content: "改写后文本",
        selection: {
          from: 1,
          to: 7,
          text: "原文甲乙",
          selectionTextHash: computeSelectionTextHash("原文甲乙"),
        },
      });

      expect(result.success).toBe(true);
      expect(applyCanonicalSkillWritebackMock).toHaveBeenCalledTimes(1);
      expect(applyCanonicalSkillWritebackMock).toHaveBeenCalledWith(
        expect.objectContaining({
          suggestion: "改写后文本",
          selection: expect.objectContaining({ from: 1, to: 7 }),
        }),
      );
    } finally {
      ctx.db.close();
    }
  });

  it("continue cursor write routes through applyCanonicalSkillWriteback", async () => {
    applyCanonicalSkillWritebackMock.mockReturnValue({
      ok: true,
      data: {
        contentJson: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "原文甲续写乙丙丁" }],
            },
          ],
        },
      },
    });

    const ctx = await createReadyContext();
    try {
      const result = await ctx.writeTool.execute({
        projectId: ctx.projectId,
        documentId: ctx.documentId,
        requestId: "req-continue",
        content: "续写",
        cursorPosition: 4,
      });

      expect(result.success).toBe(true);
      expect(applyCanonicalSkillWritebackMock).toHaveBeenCalledTimes(1);
      expect(applyCanonicalSkillWritebackMock).toHaveBeenCalledWith(
        expect.objectContaining({
          suggestion: "续写",
          cursorPosition: 4,
        }),
      );
    } finally {
      ctx.db.close();
    }
  });
});