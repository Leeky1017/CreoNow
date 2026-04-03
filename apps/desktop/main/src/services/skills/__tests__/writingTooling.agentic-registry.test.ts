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
      truncated: false,
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
      query: "",
      truncated: false,
    });
  });

  it("docTool/documentRead 遵守 maxTokens/snippetChars，不把整篇文档注入下一轮", async () => {
    const db = new Database(":memory:");
    opened.push(db);
    db.pragma("foreign_keys = ON");
    applyAllMigrations(db);

    const projectId = "proj-1";
    const longText =
      "第一段铺垫。林远先观察门缝里的光，再听见门后的脚步声。随后他没有立刻推门，而是退半步让呼吸平稳。";
    const currentDocumentId = createProjectAndDocument({
      db,
      projectId,
      title: "当前章节",
      text: longText,
    });

    const registry = createAgenticToolRegistry({
      db,
      logger: createLogger(),
    });
    const docTool = registry.get("docTool");
    const documentRead = registry.get("documentRead");
    expect(docTool).toBeDefined();
    expect(documentRead).toBeDefined();

    const docToolResult = await docTool!.execute({
      documentId: currentDocumentId,
      requestId: "req-doc-snippet",
      projectId,
      args: {
        documentId: currentDocumentId,
        query: "林远",
        maxTokens: 12,
        snippetChars: 18,
      },
    });
    expect(docToolResult.success).toBe(true);
    expect(docToolResult.data).toMatchObject({
      documentId: currentDocumentId,
      query: "林远",
    });
    expect(JSON.stringify(docToolResult.data)).toContain("林远");
    expect(JSON.stringify(docToolResult.data)).not.toContain("随后他没有立刻推门");

    const documentReadResult = await documentRead!.execute({
      documentId: currentDocumentId,
      requestId: "req-document-read-snippet",
      projectId,
      args: {
        query: "门后",
        maxTokens: 12,
        snippetChars: 12,
      },
    });
    expect(documentReadResult.success).toBe(true);
    expect(documentReadResult.data).toMatchObject({
      documentId: currentDocumentId,
    });
    expect(JSON.stringify(documentReadResult.data)).toContain("门后");
    expect(JSON.stringify(documentReadResult.data)).not.toContain("随后他没有立刻推门");
  });
});
