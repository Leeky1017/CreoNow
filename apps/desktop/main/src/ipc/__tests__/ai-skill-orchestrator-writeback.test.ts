import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Database from "better-sqlite3";
import type { IpcMain } from "electron";
import { Node as ProseMirrorNode } from "prosemirror-model";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Logger } from "../../logging/logger";
import { registerAiIpcHandlers } from "../ai";
import { createProjectSessionBindingRegistry } from "../projectSessionBinding";
import { registerVersionIpcHandlers } from "../version";
import { createDocumentService } from "../../services/documents/documentService";
import { computeSelectionTextHash, editorSchema } from "../../services/editor/prosemirrorSchema";
import * as writingTooling from "../../services/skills/writingTooling";

type Handler = (event: unknown, payload: unknown) => Promise<unknown>;
type MockSender = {
  id: number;
  send: (channel: string, payload: unknown) => void;
  on: (event: string, listener: (...args: unknown[]) => void) => MockSender;
  once: (event: string, listener: (...args: unknown[]) => void) => MockSender;
  emit: (event: string, ...args: unknown[]) => void;
};

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

function createMockSender(args: {
  id: number;
  sentEvents: Array<{ channel: string; payload: unknown }>;
}): MockSender {
  const listeners = new Map<
    string,
    Array<{ listener: (...eventArgs: unknown[]) => void; once: boolean }>
  >();

  const sender: MockSender = {
    id: args.id,
    send: (channel: string, payload: unknown) => {
      args.sentEvents.push({ channel, payload });
    },
    on: (event, listener) => {
      const registered = listeners.get(event) ?? [];
      registered.push({ listener, once: false });
      listeners.set(event, registered);
      return sender;
    },
    once: (event, listener) => {
      const registered = listeners.get(event) ?? [];
      registered.push({ listener, once: true });
      listeners.set(event, registered);
      return sender;
    },
    emit: (event, ...eventArgs) => {
      const registered = listeners.get(event) ?? [];
      const keep: Array<{
        listener: (...listenerArgs: unknown[]) => void;
        once: boolean;
      }> = [];
      for (const entry of registered) {
        entry.listener(...eventArgs);
        if (!entry.once) {
          keep.push(entry);
        }
      }
      listeners.set(event, keep);
    },
  };

  return sender;
}

function createHarness(args?: {
  useProjectSessionBinding?: boolean;
}) {
  const handlers = new Map<string, Handler>();
  const sentEvents: Array<{ channel: string; payload: unknown }> = [];
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  applyAllMigrations(db);
  const binding = args?.useProjectSessionBinding
    ? createProjectSessionBindingRegistry()
    : null;
  const senders = new Map<number, MockSender>();

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
    ...(binding ? { projectSessionBinding: binding } : {}),
  });
  registerVersionIpcHandlers({
    ipcMain,
    db,
    logger: createLogger(),
  });

  return {
    db,
    binding,
    sentEvents,
    bindProject(webContentsId: number, projectId: string) {
      binding?.bind({ webContentsId, projectId });
    },
    emitRendererEvent(
      event: "destroyed" | "did-navigate",
      options?: { webContentsId?: number },
    ) {
      const webContentsId = options?.webContentsId ?? 1;
      const sender =
        senders.get(webContentsId)
        ?? createMockSender({ id: webContentsId, sentEvents });
      senders.set(webContentsId, sender);
      sender.emit(event);
    },
    async invoke<T>(
      channel: string,
      payload: unknown,
      options?: { webContentsId?: number },
    ): Promise<T> {
      const handler = handlers.get(channel);
      if (!handler) {
        throw new Error(`Missing handler: ${channel}`);
      }
      const webContentsId = options?.webContentsId ?? 1;
      const sender =
        senders.get(webContentsId)
        ?? createMockSender({ id: webContentsId, sentEvents });
      senders.set(webContentsId, sender);
      return (await handler({ sender }, payload)) as T;
    },
  };
}

function createProjectAndDocument(args: {
  db: Database.Database;
  text: string;
  contentJson?: unknown;
}) {
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

  const contentJson =
    args.contentJson ??
    {
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

function readSnapshotChain(
  db: Database.Database,
  documentId: string,
): Array<{
  versionId: string;
  parentSnapshotId: string | null;
  reason: string;
}> {
  return db
    .prepare<
      [string],
      { versionId: string; parentSnapshotId: string | null; reason: string }
    >(
      "SELECT version_id as versionId, parent_snapshot_id as parentSnapshotId, reason FROM document_versions WHERE document_id = ? ORDER BY created_at ASC, rowid ASC",
    )
    .all(documentId);
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
      agenticLoop: true,
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
    projectId,
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

    const versions = service.listVersions({ projectId, documentId });
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
      projectId,
      documentId,
      versionId: preWriteVersionId!,
    });
    expect(rollback.ok).toBe(true);

    const readAfterRollback = service.read({ projectId, documentId });
    expect(readAfterRollback.ok).toBe(true);
    expect(readAfterRollback.ok && readAfterRollback.data.contentText).toBe("原文");

    const snapshotChain = readSnapshotChain(harness.db, documentId);
    expect(snapshotChain).toHaveLength(5);
    const snapshotByReason = new Map(
      snapshotChain.map((snapshot) => [snapshot.reason, snapshot]),
    );
    const manualSaveSnapshot = snapshotByReason.get("manual-save");
    const preWriteSnapshot = snapshotByReason.get("pre-write");
    const aiAcceptSnapshot = snapshotByReason.get("ai-accept");
    const preRollbackSnapshot = snapshotByReason.get("pre-rollback");
    const rollbackSnapshot = snapshotByReason.get("rollback");

    expect(manualSaveSnapshot).toMatchObject({
      reason: "manual-save",
      parentSnapshotId: null,
    });
    expect(preWriteSnapshot).toMatchObject({
      reason: "pre-write",
      parentSnapshotId: manualSaveSnapshot?.versionId,
    });
    expect(aiAcceptSnapshot).toMatchObject({
      reason: "ai-accept",
      parentSnapshotId: preWriteSnapshot?.versionId,
    });
    expect(preRollbackSnapshot).toMatchObject({
      reason: "pre-rollback",
      parentSnapshotId: aiAcceptSnapshot?.versionId,
    });
    expect(rollbackSnapshot).toMatchObject({
      reason: "rollback",
      parentSnapshotId: preRollbackSnapshot?.versionId,
    });

    const listedVersions = service.listVersions({ projectId, documentId });
    expect(listedVersions.ok).toBe(true);
    expect(listedVersions.ok && listedVersions.data.items[0]?.parentSnapshotId).toBe(
      rollback.data?.preRollbackVersionId,
    );

    const rollbackVersion = service.readVersion({
      projectId,
      documentId,
      versionId: rollback.data!.rollbackVersionId,
    });
    expect(rollbackVersion.ok).toBe(true);
    expect(rollbackVersion.ok && rollbackVersion.data.parentSnapshotId).toBe(
      rollback.data?.preRollbackVersionId,
    );
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
      agenticLoop: true,
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
    projectId,
    });

    expect(confirm.ok).toBe(true);
    expect(confirm.data?.status).toBe("rejected");

    const service = createDocumentService({ db: harness.db, logger: createLogger() });
    const read = service.read({ projectId, documentId });
    expect(read.ok).toBe(true);
    expect(read.ok && read.data.contentText).toBe("原文");

    const versions = service.listVersions({ projectId, documentId });
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
      agenticLoop: true,
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
    projectId,
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
      agenticLoop: true,
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
    projectId,
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
      agenticLoop: true,
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
    projectId,
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
      agenticLoop: true,
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
    projectId,
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
      agenticLoop: true,
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
    expect(run.error?.message).toBe("请先选中需要润色的文本");
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
      agenticLoop: true,
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
    expect(run.error?.message).toBe("请先提供需要处理的文本");
    expect(run.error?.code).not.toBe("INTERNAL");
  });

  it("selection skill 优先使用 selection.text，rewrite 指令走 userInstruction", async () => {
    const harness = createHarness();
    opened.push(harness.db);
    const { projectId, documentId } = createProjectAndDocument({
      db: harness.db,
      text: "原文",
    });

    const run = await harness.invoke<{
      ok: boolean;
      data?: { status: "preview" | "completed" | "rejected" };
      error?: { code: string; message: string };
    }>("ai:skill:run", {
      skillId: "builtin:rewrite",
      hasSelection: true,
      input: "   ",
      userInstruction: "改得更凝练",
      mode: "ask",
      model: "gpt-5.2",
      agenticLoop: true,
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
  });

  it("polish 在 instruction 为空但 selection.text 非空时仍可运行", async () => {
    const harness = createHarness();
    opened.push(harness.db);
    const { projectId, documentId } = createProjectAndDocument({
      db: harness.db,
      text: "原文",
    });

    const run = await harness.invoke<{
      ok: boolean;
      data?: { status: "preview" | "completed" | "rejected" };
      error?: { code: string; message: string };
    }>("ai:skill:run", {
      skillId: "builtin:polish",
      hasSelection: true,
      input: "",
      userInstruction: "",
      mode: "ask",
      model: "gpt-5.2",
      agenticLoop: true,
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
  });

  it("builtin:continue accept 会把续写结果插入到显式光标位置，而不是文末", async () => {
    const harness = createHarness();
    opened.push(harness.db);
    const { projectId, documentId } = createProjectAndDocument({
      db: harness.db,
      text: "甲乙丙丁",
    });

    const run = await harness.invoke<{
      ok: boolean;
      data?: {
        executionId: string;
        runId: string;
        status: "preview" | "completed" | "rejected";
        outputText?: string;
      };
    }>("ai:skill:run", {
      skillId: "builtin:continue",
      hasSelection: false,
      cursorPosition: 3,
      input: "甲乙丙丁",
      mode: "ask",
      model: "gpt-5.2",
      agenticLoop: true,
      context: { projectId, documentId },
      stream: true,
    });

    expect(run.ok).toBe(true);
    expect(run.data?.status).toBe("preview");
    expect(run.data?.outputText?.length ?? 0).toBeGreaterThan(0);

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
    projectId,
    });

    expect(confirm.ok).toBe(true);
    expect(confirm.data?.status).toBe("completed");
    expect(confirm.data?.versionId).toBeTruthy();

    const service = createDocumentService({ db: harness.db, logger: createLogger() });
    const read = service.read({ projectId, documentId });
    expect(read.ok).toBe(true);
    expect(read.ok && read.data.contentText).toBe(`甲乙${run.data?.outputText ?? ""}丙丁`);
  });

  it("builtin:continue accept 在 leading/trailing whitespace 文档中保持与 context window 同一锚点", async () => {
    const harness = createHarness();
    opened.push(harness.db);
    const { projectId, documentId } = createProjectAndDocument({
      db: harness.db,
      text: " 甲乙 ",
    });

    const run = await harness.invoke<{
      ok: boolean;
      data?: {
        executionId: string;
        status: "preview" | "completed" | "rejected";
        outputText?: string;
      };
    }>("ai:skill:run", {
      skillId: "builtin:continue",
      hasSelection: false,
      cursorPosition: 4,
      input: " 甲乙 ",
      mode: "ask",
      model: "gpt-5.2",
      agenticLoop: true,
      context: { projectId, documentId },
      stream: false,
    });

    expect(run.ok).toBe(true);
    expect(run.data?.status).toBe("preview");

    const confirm = await harness.invoke<{
      ok: boolean;
      data?: { status: "completed" | "rejected" };
    }>("ai:skill:confirm", {
      executionId: run.data?.executionId,
      action: "accept",
    projectId,
    });

    expect(confirm.ok).toBe(true);
    expect(confirm.data?.status).toBe("completed");

    const service = createDocumentService({ db: harness.db, logger: createLogger() });
    const read = service.read({ projectId, documentId });
    expect(read.ok).toBe(true);
    expect(read.ok && read.data.contentText).toBe(` 甲乙${run.data?.outputText ?? ""} `);
  });

  it("builtin:continue accept 在多段落文档中按 deriveContent 换行锚点写回", async () => {
    const harness = createHarness();
    opened.push(harness.db);
    const contentJson = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "甲" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "乙丙" }],
        },
      ],
    };
    const { projectId, documentId } = createProjectAndDocument({
      db: harness.db,
      text: "甲\n乙丙",
      contentJson,
    });

    const run = await harness.invoke<{
      ok: boolean;
      data?: {
        executionId: string;
        status: "preview" | "completed" | "rejected";
        outputText?: string;
      };
    }>("ai:skill:run", {
      skillId: "builtin:continue",
      hasSelection: false,
      cursorPosition: 5,
      input: "甲\n乙丙",
      mode: "ask",
      model: "gpt-5.2",
      agenticLoop: true,
      context: { projectId, documentId },
      stream: false,
    });

    expect(run.ok).toBe(true);
    expect(run.data?.status).toBe("preview");

    const confirm = await harness.invoke<{
      ok: boolean;
      data?: { status: "completed" | "rejected" };
    }>("ai:skill:confirm", {
      executionId: run.data?.executionId,
      action: "accept",
    projectId,
    });

    expect(confirm.ok).toBe(true);
    expect(confirm.data?.status).toBe("completed");

    const service = createDocumentService({ db: harness.db, logger: createLogger() });
    const read = service.read({ projectId, documentId });
    expect(read.ok).toBe(true);
    expect(read.ok && read.data.contentText).toBe(`甲\n乙${run.data?.outputText ?? ""}丙`);
  });

  it("builtin:polish accept 对多段落选区使用与 preview 相同的 block-aware writeback", async () => {
    const harness = createHarness();
    opened.push(harness.db);
    const contentJson = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "甲" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "乙" }],
        },
      ],
    };
    const doc = ProseMirrorNode.fromJSON(editorSchema, contentJson);
    const fullSelectionText = doc.textBetween(1, doc.content.size - 1, "\n", "\n");
    const { projectId, documentId } = createProjectAndDocument({
      db: harness.db,
      text: fullSelectionText,
      contentJson,
    });

    const run = await harness.invoke<{
      ok: boolean;
      data?: {
        executionId: string;
        status: "preview" | "completed" | "rejected";
        outputText?: string;
      };
    }>("ai:skill:run", {
      skillId: "builtin:polish",
      hasSelection: true,
      input: fullSelectionText,
      mode: "ask",
      model: "gpt-5.2",
      agenticLoop: true,
      context: { projectId, documentId },
      selection: {
        from: 1,
        to: doc.content.size - 1,
        text: fullSelectionText,
        selectionTextHash: computeSelectionTextHash(fullSelectionText),
      },
      stream: false,
    });

    expect(run.ok).toBe(true);
    expect(run.data?.status).toBe("preview");
    expect(run.data?.outputText).toBe(`E2E_RESULT: ${fullSelectionText}`);

    const confirm = await harness.invoke<{
      ok: boolean;
      data?: { status: "completed" | "rejected" };
    }>("ai:skill:confirm", {
      executionId: run.data?.executionId,
      action: "accept",
    projectId,
    });

    expect(confirm.ok).toBe(true);
    expect(confirm.data?.status).toBe("completed");

    const service = createDocumentService({ db: harness.db, logger: createLogger() });
    const read = service.read({ projectId, documentId });
    expect(read.ok).toBe(true);
    expect(read.ok && JSON.parse(read.data.contentJson)).toEqual({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "E2E_RESULT: 甲" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "乙" }],
        },
      ],
    });
  });

  it("ai:skill:confirm from different renderer session is rejected", async () => {
    const harness = createHarness({ useProjectSessionBinding: true });
    opened.push(harness.db);
    const { projectId, documentId } = createProjectAndDocument({
      db: harness.db,
      text: "原文",
    });
    harness.bindProject(1, projectId);
    harness.bindProject(2, projectId);

    const run = await harness.invoke<{
      ok: boolean;
      data?: { executionId: string; status: "preview" | "completed" | "rejected" };
    }>("ai:skill:run", {
      skillId: "builtin:polish",
      hasSelection: true,
      input: "原文",
      mode: "ask",
      model: "gpt-5.2",
      agenticLoop: true,
      context: { projectId, documentId },
      selection: {
        from: 1,
        to: 3,
        text: "原文",
        selectionTextHash: computeSelectionTextHash("原文"),
      },
      stream: true,
    }, {
      webContentsId: 1,
    });

    expect(run.ok).toBe(true);
    expect(run.data?.status).toBe("preview");

    const confirm = await harness.invoke<{
      ok: boolean;
      error?: { code: string; message: string };
    }>("ai:skill:confirm", {
      executionId: run.data?.executionId,
      action: "accept",
      projectId,
    }, {
      webContentsId: 2,
    });

    expect(confirm.ok).toBe(false);
    expect(confirm.error).toMatchObject({
      code: "FORBIDDEN",
      message: "preview session is not active for this renderer session",
    });

    const service = createDocumentService({ db: harness.db, logger: createLogger() });
    const read = service.read({ projectId, documentId });
    expect(read.ok).toBe(true);
    expect(read.ok && read.data.contentText).toBe("原文");
  });

  it("preview session is cleaned up immediately when renderer is destroyed", async () => {
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
      agenticLoop: true,
      context: { projectId, documentId },
      selection: {
        from: 1,
        to: 3,
        text: "原文",
        selectionTextHash: computeSelectionTextHash("原文"),
      },
      stream: false,
    });

    expect(run.ok).toBe(true);
    expect(run.data?.status).toBe("preview");

    harness.emitRendererEvent("destroyed");

    const confirm = await harness.invoke<{
      ok: boolean;
      error?: { code: string; message: string };
    }>("ai:skill:confirm", {
      executionId: run.data?.executionId,
      action: "accept",
      projectId,
    });
    expect(confirm.ok).toBe(false);
    expect(confirm.error?.code).toBe("NOT_FOUND");
  });

  it("preview session is cleaned up immediately when renderer navigates", async () => {
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
      agenticLoop: true,
      context: { projectId, documentId },
      selection: {
        from: 1,
        to: 3,
        text: "原文",
        selectionTextHash: computeSelectionTextHash("原文"),
      },
      stream: false,
    });

    expect(run.ok).toBe(true);
    expect(run.data?.status).toBe("preview");

    harness.emitRendererEvent("did-navigate");

    const confirm = await harness.invoke<{
      ok: boolean;
      error?: { code: string; message: string };
    }>("ai:skill:confirm", {
      executionId: run.data?.executionId,
      action: "accept",
      projectId,
    });
    expect(confirm.ok).toBe(false);
    expect(confirm.error?.code).toBe("NOT_FOUND");
  });

  it("preview 超时在等待期间自动收口，并清理 preview session", async () => {
    const realSetTimeout = global.setTimeout;
    vi.spyOn(global, "setTimeout").mockImplementation(
      ((
        handler: TimerHandler,
        delay?: number,
        ...args: Parameters<typeof realSetTimeout> extends [
          TimerHandler,
          number?,
          ...infer Rest,
        ]
          ? Rest
          : never
      ) =>
        realSetTimeout(
          handler,
          delay === 120_000 ? 1 : delay,
          ...args,
        )) as typeof global.setTimeout,
    );

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
      agenticLoop: true,
      context: { projectId, documentId },
      selection: {
        from: 1,
        to: 3,
        text: "原文",
        selectionTextHash: computeSelectionTextHash("原文"),
      },
      stream: false,
    });

    expect(run.ok).toBe(true);
    expect(run.data?.status).toBe("preview");

    await new Promise((resolve) => realSetTimeout(resolve, 20));

    const doneEvent = harness.sentEvents.find(
      (event) =>
        event.channel === "skill:stream:done" &&
        (event.payload as { executionId?: string; terminal?: string }).executionId ===
          run.data?.executionId,
    );
    expect(doneEvent).toBeTruthy();
    expect((doneEvent?.payload as { terminal?: string }).terminal).toBe("cancelled");

    const confirm = await harness.invoke<{
      ok: boolean;
      error?: { code: string; message: string };
    }>("ai:skill:confirm", {
      executionId: run.data?.executionId,
      action: "accept",
    projectId,
    });
    expect(confirm.ok).toBe(false);
    expect(confirm.error?.code).toBe("NOT_FOUND");
  });

  it("ai:skill:cancel 仅给 runId 也能取消 preview session 并完成清理", async () => {
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
      };
    }>("ai:skill:run", {
      skillId: "builtin:polish",
      hasSelection: true,
      input: "原文",
      mode: "ask",
      model: "gpt-5.2",
      agenticLoop: true,
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

    const cancel = await harness.invoke<{
      ok: boolean;
      data?: { canceled: true };
    }>("ai:skill:cancel", {
      runId: run.data?.runId,
    });

    expect(cancel.ok).toBe(true);
    expect(cancel.data?.canceled).toBe(true);

    const doneEvent = harness.sentEvents.find(
      (event) =>
        event.channel === "skill:stream:done" &&
        (event.payload as { executionId?: string; terminal?: string }).executionId ===
          run.data?.executionId,
    );
    expect(doneEvent).toBeTruthy();
    expect((doneEvent?.payload as { terminal?: string }).terminal).toBe("cancelled");

    const confirm = await harness.invoke<{
      ok: boolean;
      error?: { code: string; message: string };
    }>("ai:skill:confirm", {
      executionId: run.data?.executionId,
      action: "accept",
    projectId,
    });
    expect(confirm.ok).toBe(false);
    expect(confirm.error?.code).toBe("NOT_FOUND");
  });

  it("ai:skill:cancel 给 executionId 时也会 drain paused generator", async () => {
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
      };
    }>("ai:skill:run", {
      skillId: "builtin:polish",
      hasSelection: true,
      input: "原文",
      mode: "ask",
      model: "gpt-5.2",
      agenticLoop: true,
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

    const cancel = await harness.invoke<{
      ok: boolean;
      data?: { canceled: true };
    }>("ai:skill:cancel", {
      executionId: run.data?.executionId,
    });

    expect(cancel.ok).toBe(true);
    expect(cancel.data?.canceled).toBe(true);

    const confirm = await harness.invoke<{
      ok: boolean;
      error?: { code: string; message: string };
    }>("ai:skill:confirm", {
      executionId: run.data?.executionId,
      action: "accept",
    projectId,
    });
    expect(confirm.ok).toBe(false);
    expect(confirm.error?.code).toBe("NOT_FOUND");
  });
});
