import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";

import type { Logger } from "../../../logging/logger";
import { createDocumentService } from "../../documents/documentService";
import { createAgenticToolRegistry } from "../writingTooling";

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

function createProjectAndDocument(args: {
  db: Database.Database;
  projectId: string;
  title: string;
  text: string;
}) {
  args.db
    .prepare(
      "INSERT OR IGNORE INTO projects (project_id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    )
    .run(args.projectId, "测试项目", "/worktree/test-root", Date.now(), Date.now());

  const service = createDocumentService({ db: args.db, logger: createLogger() });
  const created = service.create({
    projectId: args.projectId,
    title: args.title,
    type: "chapter",
  });
  if (!created.ok) {
    throw new Error(created.error.message);
  }

  const saved = service.save({
    projectId: args.projectId,
    documentId: created.data.documentId,
    contentJson: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: args.text }],
        },
      ],
    },
    actor: "user",
    reason: "manual-save",
  });
  if (!saved.ok) {
    throw new Error(saved.error.message);
  }

  return created.data.documentId;
}

describe("createAgenticToolRegistry", () => {
  const opened: Database.Database[] = [];

  afterEach(() => {
    for (const db of opened.splice(0)) {
      db.close();
    }
  });

  it("只暴露只读工具，且 docTool/documentRead 返回文本语义", async () => {
    const db = new Database(":memory:");
    opened.push(db);
    db.pragma("foreign_keys = ON");
    applyAllMigrations(db);

    const projectId = "proj-1";
    const currentDocumentId = createProjectAndDocument({
      db,
      projectId,
      title: "当前章节",
      text: "当前正文。",
    });
    const referenceDocumentId = createProjectAndDocument({
      db,
      projectId,
      title: "参考章节",
      text: "参考正文。",
    });

    const registry = createAgenticToolRegistry({
      db,
      logger: createLogger(),
    });

    expect(registry.get("documentWrite")).toBeUndefined();
    expect(registry.get("versionSnapshot")).toBeUndefined();

    const docTool = registry.get("docTool");
    const documentRead = registry.get("documentRead");
    expect(docTool).toBeDefined();
    expect(documentRead).toBeDefined();

    const docToolResult = await docTool!.execute({
      documentId: currentDocumentId,
      requestId: "req-1",
      projectId,
      targetDocumentId: currentDocumentId,
      query: "错误顶层参数",
      args: {
        documentId: referenceDocumentId,
        query: "参考",
      },
    });
    expect(docToolResult.success).toBe(true);
    expect(docToolResult.data).toEqual({
      content: "参考正文。",
      documentId: referenceDocumentId,
      query: "参考",
    });

    const documentReadResult = await documentRead!.execute({
      documentId: currentDocumentId,
      requestId: "req-2",
      projectId,
    });
    expect(documentReadResult.success).toBe(true);
    expect(documentReadResult.data).toEqual({
      text: "当前正文。",
      documentId: currentDocumentId,
    });
  });
});
