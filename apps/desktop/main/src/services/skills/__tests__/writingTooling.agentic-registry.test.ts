import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";

import type { Logger } from "../../../logging/logger";
import { estimateTokens } from "../../context/tokenEstimation";
import { createDocumentService } from "../../documents/documentService";
import { createKnowledgeGraphService } from "../../kg/kgService";
import { createMemoryService } from "../../memory/memoryService";
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
    const docToolData = docToolResult.data as { content: string };
    expect(docToolData.content).toContain("林远");
    expect(docToolData.content).not.toContain("随后他没有立刻推门");
    expect(docToolData.content.length).toBeLessThanOrEqual(18);
    expect(estimateTokens(docToolData.content)).toBeLessThanOrEqual(12);

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
    const documentReadData = documentReadResult.data as { text: string };
    expect(documentReadData.text).toContain("门后");
    expect(documentReadData.text).not.toContain("随后他没有立刻推门");
    expect(documentReadData.text.length).toBeLessThanOrEqual(12);
    expect(estimateTokens(documentReadData.text)).toBeLessThanOrEqual(12);
  });

  it("kgTool / memTool 在有数据时返回真实查询结果，而不是永久空壳", async () => {
    const db = new Database(":memory:");
    opened.push(db);
    db.pragma("foreign_keys = ON");
    applyAllMigrations(db);

    const projectId = "proj-kg-mem";
    const documentId = createProjectAndDocument({
      db,
      projectId,
      title: "当前章节",
      text: "林远站在门前，想起自己一贯偏好的冷静克制语气。",
    });

    const kgService = createKnowledgeGraphService({
      db,
      logger: createLogger(),
    });
    const entity = kgService.entityCreate({
      projectId,
      type: "character",
      name: "林远",
      description: "冷静理性，偶尔冷幽默",
      attributes: {
        traits: "冷静, 理性, 冷幽默",
      },
    });
    if (!entity.ok) {
      throw new Error(entity.error.message);
    }

    const memoryService = createMemoryService({
      db,
      logger: createLogger(),
    });
    const memory = memoryService.create({
      type: "preference",
      scope: "project",
      projectId,
      content: "偏好短句、冷调、克制描写",
    });
    if (!memory.ok) {
      throw new Error(memory.error.message);
    }

    const registry = createAgenticToolRegistry({
      db,
      logger: createLogger(),
    });
    const kgTool = registry.get("kgTool");
    const memTool = registry.get("memTool");

    expect(kgTool).toBeDefined();
    expect(memTool).toBeDefined();

    const kgToolResult = await kgTool!.execute({
      documentId,
      requestId: "req-kg-real",
      projectId,
      args: {
        query: "林远的性格特点",
        entityType: "character",
      },
    });
    expect(kgToolResult.success).toBe(true);
    expect(kgToolResult.data).toMatchObject({
      query: "林远的性格特点",
      entities: [
        expect.objectContaining({
          name: "林远",
          type: "character",
        }),
      ],
    });

    const memToolResult = await memTool!.execute({
      documentId,
      requestId: "req-mem-real",
      projectId,
      args: {
        query: "冷调短句偏好",
        memoryType: "preference",
      },
    });
    expect(memToolResult.success).toBe(true);
    expect(memToolResult.data).toMatchObject({
      query: "冷调短句偏好",
      memories: [
        expect.objectContaining({
          type: "preference",
          content: "偏好短句、冷调、克制描写",
        }),
      ],
    });
  });
});
