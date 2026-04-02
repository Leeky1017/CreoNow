import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Database from "better-sqlite3";
import type { IpcMain } from "electron";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Logger } from "../../logging/logger";
import { registerAiIpcHandlers } from "../ai";
import { registerVersionIpcHandlers } from "../version";
import { createDocumentService } from "../../services/documents/documentService";
import { computeSelectionTextHash } from "../../services/editor/prosemirrorSchema";
import * as writingTooling from "../../services/skills/writingTooling";

type Handler = (event: unknown, payload: unknown) => Promise<unknown>;

const MIGRATIONS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../db/migrations",
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

function createHarness() {
  const handlers = new Map<string, Handler>();
  const sentEvents: Array<{ channel: string; payload: unknown }> = [];
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  applyAllMigrations(db);

  const ipcMain = {
    handle: (channel: string, listener: Handler) => {
      handlers.set(channel, listener);
    },
  } as unknown as IpcMain;

  registerAiIpcHandlers({
    ipcMain,
    db,
    userDataDir: "<test-user-data>",
    builtinSkillsDir: path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "../../../skills/packages",
    ),
    logger: createLogger(),
    env: {
      ...process.env,
      CREONOW_E2E: "1",
      CREONOW_AI_PROVIDER: "openai",
      CREONOW_AI_MODEL: "gpt-5.2",
    },
  });
  registerVersionIpcHandlers({
    ipcMain,
    db,
    logger: createLogger(),
  });

  const sender = {
    id: 1,
    send: (channel: string, payload: unknown) => {
      sentEvents.push({ channel, payload });
    },
  };

  return {
    db,
    sender,
    sentEvents,
    async invoke<T>(channel: string, payload: unknown): Promise<T> {
      const handler = handlers.get(channel);
      if (!handler) {
        throw new Error(`Missing handler: ${channel}`);
      }
      return (await handler({ sender }, payload)) as T;
    },
  };
}

function createProjectAndDocument(args: { db: Database.Database; text: string }) {
  const projectId = "proj-1";
  args.db
    .prepare(
      "INSERT INTO projects (project_id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    )
    .run(projectId, "测试项目", "/worktree/test-root", Date.now(), Date.now());

  const service = createDocumentService({ db: args.db, logger: createLogger() });
  const created = service.create({
    projectId,
    title: "第一章",
    type: "chapter",
  });
  if (!created.ok) {
    throw new Error(created.error.message);
  }

  const contentJson = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: args.text }],
      },
    ],
  };
  const saved = service.save({
    projectId,
    documentId: created.data.documentId,
    contentJson,
    actor: "user",
    reason: "manual-save",
  });
  if (!saved.ok) {
    throw new Error(saved.error.message);
  }

  return {
    projectId,
    documentId: created.data.documentId,
  };
}

describe("ai:skill:run orchestrator writeback flow", () => {
  const opened: Database.Database[] = [];

  afterEach(() => {
    for (const db of opened.splice(0)) {
      db.close();
    }
    vi.restoreAllMocks();
  });

  it("通过 orchestrator 进入 preview → accept → pre-write/ai-accept snapshot → rollback", async () => {
    const harness = createHarness();
    opened.push(harness.db);
    const { projectId, documentId } = createProjectAndDocument({
      db: harness.db,
      text: "原文",
    });

    const run = await harness.invoke<{
      ok: boolean;
      data?: {
        executionId: string;
        runId: string;
        status: "preview" | "completed" | "rejected";
        outputText?: string;
      };
      error?: { code: string; message: string };
    }>("ai:skill:run", {
      skillId: "builtin:polish",
      hasSelection: true,
      input: "原文",
      mode: "ask",
      model: "gpt-5.2",
      context: { projectId, documentId },
      selection: {
        from: 1,
        to: 3,
        text: "原文",
        selectionTextHash: computeSelectionTextHash("原文"),
      },
      stream: true,
    });

    expect(run.ok).toBe(true);
    expect(run.data?.status).toBe("preview");
    expect(run.data?.executionId).toBeTruthy();
    expect(typeof run.data?.outputText).toBe("string");
    expect(run.data?.outputText?.length ?? 0).toBeGreaterThan(0);
    const chunkEvents = harness.sentEvents.filter(
      (event) => event.channel === "skill:stream:chunk",
    );
    expect(chunkEvents.length).toBeGreaterThan(0);
    expect(
      chunkEvents.some((event) => {
        const payload = event.payload as { chunk?: unknown };
        return typeof payload.chunk === "string" && payload.chunk.length > 0;
      }),
    ).toBe(true);

    const confirm = await harness.invoke<{
      ok: boolean;
      data?: {
        executionId: string;
        status: "completed" | "rejected";
        versionId?: string;
      };
    }>("ai:skill:confirm", {
      executionId: run.data?.executionId,
      action: "accept",
    });

    expect(confirm.ok).toBe(true);
    expect(confirm.data?.status).toBe("completed");
    expect(confirm.data?.versionId).toBeTruthy();

    const service = createDocumentService({ db: harness.db, logger: createLogger() });
    const readAfterAccept = service.read({ projectId, documentId });
    expect(readAfterAccept.ok).toBe(true);
    expect(readAfterAccept.ok && readAfterAccept.data.contentText).toBe(
      run.data?.outputText,
    );

    const versions = service.listVersions({ documentId });
    expect(versions.ok).toBe(true);
    const reasons =
      versions.ok ? versions.data.items.map((item) => item.reason) : [];
    expect(reasons).toContain("pre-write");
    expect(reasons).toContain("ai-accept");

    const preWriteVersionId =
      versions.ok
        ? versions.data.items.find((item) => item.reason === "pre-write")?.versionId
        : undefined;
    expect(preWriteVersionId).toBeTruthy();

    const rollback = await harness.invoke<{
      ok: boolean;
      data?: {
        restored: true;
        preRollbackVersionId: string;
        rollbackVersionId: string;
      };
    }>("version:snapshot:rollback", {
      documentId,
      versionId: preWriteVersionId!,
    });
    expect(rollback.ok).toBe(true);

    const readAfterRollback = service.read({ projectId, documentId });
    expect(readAfterRollback.ok).toBe(true);
    expect(readAfterRollback.ok && readAfterRollback.data.contentText).toBe("原文");
  });

  it("reject 时保持原稿不变，且不写入 ai-accept snapshot", async () => {
    const harness = createHarness();
    opened.push(harness.db);
    const { projectId, documentId } = createProjectAndDocument({
      db: harness.db,
      text: "原文",
    });

    const run = await harness.invoke<{
      ok: boolean;
      data?: { executionId: string; status: "preview" | "completed" | "rejected" };
    }>("ai:skill:run", {
      skillId: "builtin:polish",
      hasSelection: true,
      input: "原文",
      mode: "ask",
      model: "gpt-5.2",
      context: { projectId, documentId },
      selection: {
        from: 1,
        to: 3,
        text: "原文",
        selectionTextHash: computeSelectionTextHash("原文"),
      },
      stream: true,
    });

    expect(run.ok).toBe(true);
    expect(run.data?.status).toBe("preview");

    const confirm = await harness.invoke<{
      ok: boolean;
      data?: { status: "completed" | "rejected" };
    }>("ai:skill:confirm", {
      executionId: run.data?.executionId,
      action: "reject",
    });

    expect(confirm.ok).toBe(true);
    expect(confirm.data?.status).toBe("rejected");

    const service = createDocumentService({ db: harness.db, logger: createLogger() });
    const read = service.read({ projectId, documentId });
    expect(read.ok).toBe(true);
    expect(read.ok && read.data.contentText).toBe("原文");

    const versions = service.listVersions({ documentId });
    expect(versions.ok).toBe(true);
    const reasons =
      versions.ok ? versions.data.items.map((item) => item.reason) : [];
    expect(reasons).not.toContain("ai-accept");
    expect(reasons).not.toContain("pre-write");
  });

  it("pre-write snapshot 失败时，confirm 经 IPC 返回显式错误且不会伪装 completed", async () => {
    const harness = createHarness();
    opened.push(harness.db);
    const { projectId, documentId } = createProjectAndDocument({
      db: harness.db,
      text: "原文",
    });

    const run = await harness.invoke<{
      ok: boolean;
      data?: { executionId: string; status: "preview" | "completed" | "rejected" };
    }>("ai:skill:run", {
      skillId: "builtin:polish",
      hasSelection: true,
      input: "原文",
      mode: "ask",
      model: "gpt-5.2",
      context: { projectId, documentId },
      selection: {
        from: 1,
        to: 3,
        text: "原文",
        selectionTextHash: computeSelectionTextHash("原文"),
      },
      stream: true,
    });
    expect(run.ok).toBe(true);
    expect(run.data?.status).toBe("preview");

    harness.db
      .prepare("UPDATE documents SET content_json = ? WHERE document_id = ?")
      .run("{invalid-json", documentId);

    const confirm = await harness.invoke<{
      ok: boolean;
      error?: { code: string; message: string };
    }>("ai:skill:confirm", {
      executionId: run.data?.executionId,
      action: "accept",
    });

    expect(confirm.ok).toBe(false);
    expect(confirm.error).toMatchObject({
      code: "VERSION_SNAPSHOT_FAILED",
    });
  });

  it("selection hash mismatch 时，confirm 经 IPC 返回 WRITE_BACK_FAILED 且保留用户最新文本", async () => {
    const harness = createHarness();
    opened.push(harness.db);
    const { projectId, documentId } = createProjectAndDocument({
      db: harness.db,
      text: "原文",
    });

    const run = await harness.invoke<{
      ok: boolean;
      data?: { executionId: string; status: "preview" | "completed" | "rejected" };
    }>("ai:skill:run", {
      skillId: "builtin:polish",
      hasSelection: true,
      input: "原文",
      mode: "ask",
      model: "gpt-5.2",
      context: { projectId, documentId },
      selection: {
        from: 1,
        to: 3,
        text: "原文",
        selectionTextHash: computeSelectionTextHash("原文"),
      },
      stream: true,
    });
    expect(run.ok).toBe(true);
    expect(run.data?.status).toBe("preview");

    const service = createDocumentService({ db: harness.db, logger: createLogger() });
    const userEdited = service.save({
      projectId,
      documentId,
      contentJson: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "用户已改动" }],
          },
        ],
      },
      actor: "user",
      reason: "manual-save",
    });
    expect(userEdited.ok).toBe(true);

    const confirm = await harness.invoke<{
      ok: boolean;
      error?: { code: string; message: string };
    }>("ai:skill:confirm", {
      executionId: run.data?.executionId,
      action: "accept",
    });

    expect(confirm.ok).toBe(false);
    expect(confirm.error).toMatchObject({
      code: "WRITE_BACK_FAILED",
      message: "Selection changed before AI writeback",
    });

    const read = service.read({ projectId, documentId });
    expect(read.ok).toBe(true);
    expect(read.ok && read.data.contentText).toBe("用户已改动");
  });

  it("缺少 versionSnapshot tool 时，accept 通过 IPC seam 硬失败且原稿保持不变", async () => {
    const realCreateWritingToolRegistry = writingTooling.createWritingToolRegistry;
    vi.spyOn(writingTooling, "createWritingToolRegistry").mockImplementation((args) => {
      const registry = realCreateWritingToolRegistry(args);
      registry.unregister("versionSnapshot");
      return registry;
    });

    const harness = createHarness();
    opened.push(harness.db);
    const { projectId, documentId } = createProjectAndDocument({
      db: harness.db,
      text: "原文",
    });

    const run = await harness.invoke<{
      ok: boolean;
      data?: { executionId: string; status: "preview" | "completed" | "rejected"; outputText?: string };
    }>("ai:skill:run", {
      skillId: "builtin:polish",
      hasSelection: true,
      input: "原文",
      mode: "ask",
      model: "gpt-5.2",
      context: { projectId, documentId },
      selection: {
        from: 1,
        to: 3,
        text: "原文",
        selectionTextHash: computeSelectionTextHash("原文"),
      },
      stream: true,
    });

    expect(run.ok).toBe(true);
    expect(run.data?.status).toBe("preview");
    expect(run.data?.outputText?.length ?? 0).toBeGreaterThan(0);

    const confirm = await harness.invoke<{
      ok: boolean;
      error?: { code: string; message: string };
    }>("ai:skill:confirm", {
      executionId: run.data?.executionId,
      action: "accept",
    });

    expect(confirm.ok).toBe(false);
    expect(confirm.error).toMatchObject({
      code: "VERSION_SNAPSHOT_FAILED",
      message: 'Required tool "versionSnapshot" is not registered',
    });

    const service = createDocumentService({ db: harness.db, logger: createLogger() });
    const read = service.read({ projectId, documentId });
    expect(read.ok).toBe(true);
    expect(read.ok && read.data.contentText).toBe("原文");
  });

  it("缺少 documentWrite tool 时，accept 通过 IPC seam 返回 WRITE_BACK_FAILED", async () => {
    const realCreateWritingToolRegistry = writingTooling.createWritingToolRegistry;
    vi.spyOn(writingTooling, "createWritingToolRegistry").mockImplementation((args) => {
      const registry = realCreateWritingToolRegistry(args);
      registry.unregister("documentWrite");
      return registry;
    });

    const harness = createHarness();
    opened.push(harness.db);
    const { projectId, documentId } = createProjectAndDocument({
      db: harness.db,
      text: "原文",
    });

    const run = await harness.invoke<{
      ok: boolean;
      data?: { executionId: string; status: "preview" | "completed" | "rejected"; outputText?: string };
    }>("ai:skill:run", {
      skillId: "builtin:polish",
      hasSelection: true,
      input: "原文",
      mode: "ask",
      model: "gpt-5.2",
      context: { projectId, documentId },
      selection: {
        from: 1,
        to: 3,
        text: "原文",
        selectionTextHash: computeSelectionTextHash("原文"),
      },
      stream: true,
    });

    expect(run.ok).toBe(true);
    expect(run.data?.status).toBe("preview");
    expect(run.data?.outputText?.length ?? 0).toBeGreaterThan(0);

    const confirm = await harness.invoke<{
      ok: boolean;
      error?: { code: string; message: string };
    }>("ai:skill:confirm", {
      executionId: run.data?.executionId,
      action: "accept",
    });

    expect(confirm.ok).toBe(false);
    expect(confirm.error).toMatchObject({
      code: "WRITE_BACK_FAILED",
      message: 'Required tool "documentWrite" is not registered',
    });

    const service = createDocumentService({ db: harness.db, logger: createLogger() });
    const read = service.read({ projectId, documentId });
    expect(read.ok).toBe(true);
    expect(read.ok && read.data.contentText).toBe("原文");
  });

  it("空 input 经 IPC seam 返回 SKILL_INPUT_EMPTY，不被压扁为 INTERNAL", async () => {
    const harness = createHarness();
    opened.push(harness.db);
    const { projectId, documentId } = createProjectAndDocument({
      db: harness.db,
      text: "原文",
    });

    const run = await harness.invoke<{
      ok: boolean;
      error?: { code: string; message: string };
    }>("ai:skill:run", {
      skillId: "builtin:polish",
      hasSelection: true,
      // empty input — selection-based skill requires non-empty input
      input: "",
      mode: "ask",
      model: "gpt-5.2",
      context: { projectId, documentId },
      selection: {
        from: 1,
        to: 3,
        text: "",
        selectionTextHash: computeSelectionTextHash(""),
      },
      stream: true,
    });

    expect(run.ok).toBe(false);
    expect(run.error?.code).toBe("SKILL_INPUT_EMPTY");
    // must NOT be flattened to INTERNAL
    expect(run.error?.code).not.toBe("INTERNAL");
  });

  it("空 input 通过 rewrite skill 同样返回 SKILL_INPUT_EMPTY", async () => {
    const harness = createHarness();
    opened.push(harness.db);
    const { projectId, documentId } = createProjectAndDocument({
      db: harness.db,
      text: "原文",
    });

    const run = await harness.invoke<{
      ok: boolean;
      error?: { code: string; message: string };
    }>("ai:skill:run", {
      skillId: "builtin:rewrite",
      hasSelection: true,
      input: "   ",
      mode: "ask",
      model: "gpt-5.2",
      context: { projectId, documentId },
      selection: {
        from: 1,
        to: 3,
        text: "   ",
        selectionTextHash: computeSelectionTextHash("   "),
      },
      stream: true,
    });

    expect(run.ok).toBe(false);
    expect(run.error?.code).toBe("SKILL_INPUT_EMPTY");
    expect(run.error?.code).not.toBe("INTERNAL");
  });
});
