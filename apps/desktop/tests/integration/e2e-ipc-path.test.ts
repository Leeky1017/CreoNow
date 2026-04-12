import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Database from "better-sqlite3";
import type { IpcMain } from "electron";
import { afterEach, describe, expect, it, vi } from "vitest";

import { registerAiIpcHandlers } from "../../main/src/ipc/ai";
import { registerVersionIpcHandlers } from "../../main/src/ipc/version";
import type { Logger } from "../../main/src/logging/logger";
import * as skillOrchestratorModule from "../../main/src/core/skillOrchestrator";
import { createDocumentService } from "../../main/src/services/documents/documentService";
import { computeSelectionTextHash } from "../../main/src/services/editor/prosemirrorSchema";

type Handler = (event: unknown, payload: unknown) => Promise<unknown>;
type StreamEventRecord = { channel: string; payload: unknown };
type MockSender = {
  id: number;
  send: (channel: string, payload: unknown) => void;
  on: (event: string, listener: (...args: unknown[]) => void) => MockSender;
  once: (event: string, listener: (...args: unknown[]) => void) => MockSender;
  emit: (event: string, ...args: unknown[]) => void;
};

const MIGRATIONS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../main/src/db/migrations",
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
  sentEvents: StreamEventRecord[];
}): MockSender {
  const listeners = new Map<
    string,
    Array<{ listener: (...eventArgs: unknown[]) => void; once: boolean }>
  >();

  const sender: MockSender = {
    id: args.id,
    send: (channel, payload) => {
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

function createHarness(args: { env: NodeJS.ProcessEnv }) {
  const handlers = new Map<string, Handler>();
  const sentEvents: StreamEventRecord[] = [];
  const senders = new Map<number, MockSender>();
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
      "../../main/skills/packages",
    ),
    logger: createLogger(),
    env: args.env,
  });
  registerVersionIpcHandlers({
    ipcMain,
    db,
    logger: createLogger(),
  });

  return {
    db,
    sentEvents,
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
}): { projectId: string; documentId: string } {
  const projectId = "proj-e2e";
  args.db
    .prepare(
      "INSERT INTO projects (project_id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    )
    .run(projectId, "E2E 项目", "/worktree/e2e-root", Date.now(), Date.now());

  const service = createDocumentService({ db: args.db, logger: createLogger() });
  const created = service.create({
    projectId,
    title: "第一章",
    type: "chapter",
  });
  if (!created.ok) {
    throw new Error(created.error.message);
  }

  const saved = service.save({
    projectId,
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
  return { projectId, documentId: created.data.documentId };
}

function readSnapshotReasons(
  db: Database.Database,
  documentId: string,
): string[] {
  const rows = db
    .prepare<
      [string],
      {
        reason: string;
      }
    >(
      "SELECT reason FROM document_versions WHERE document_id = ? ORDER BY created_at ASC, rowid ASC",
    )
    .all(documentId);
  return rows.map((row) => row.reason);
}

describe("E2E IPC path: ai:skill:run -> SkillOrchestrator -> write-back", () => {
  const opened: Database.Database[] = [];

  afterEach(() => {
    for (const db of opened.splice(0)) {
      db.close();
    }
    vi.restoreAllMocks();
  });

  it("happy path: preview -> confirm accept -> pre-write snapshot before ai-accept (INV-1), via SkillOrchestrator (INV-6)", async () => {
    const executeCalls: string[] = [];
    const originalCreate = skillOrchestratorModule.createSkillOrchestrator;
    vi.spyOn(skillOrchestratorModule, "createSkillOrchestrator").mockImplementation(
      (config) => {
        const orchestrator = originalCreate(config);
        return {
          ...orchestrator,
          execute(request) {
            executeCalls.push(request.requestId);
            return orchestrator.execute(request);
          },
        };
      },
    );

    const harness = createHarness({
      env: {
        ...process.env,
        CREONOW_E2E: "1",
        CREONOW_E2E_AI_MODE: "success",
        CREONOW_AI_PROVIDER: "openai",
        CREONOW_AI_MODEL: "gpt-5.2",
      },
    });
    opened.push(harness.db);

    const { projectId, documentId } = createProjectAndDocument({
      db: harness.db,
      text: "origin",
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
      input: "origin",
      mode: "ask",
      model: "gpt-5.2",
      agenticLoop: true,
      context: { projectId, documentId },
      selection: {
        from: 1,
        to: 7,
        text: "origin",
        selectionTextHash: computeSelectionTextHash("origin"),
      },
      stream: true,
    });
    expect(run.ok).toBe(true);
    expect(run.data?.status).toBe("preview");
    expect(executeCalls.length).toBe(1);
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
      data?: { status: "completed" | "rejected"; versionId?: string };
    }>("ai:skill:confirm", {
      executionId: run.data?.executionId,
      action: "accept",
      projectId,
    });
    expect(confirm.ok).toBe(true);
    expect(confirm.data?.status).toBe("completed");
    expect(confirm.data?.versionId).toBeTruthy();
    const doneEvent = harness.sentEvents.find(
      (event) =>
        event.channel === "skill:stream:done" &&
        (event.payload as { executionId?: string; terminal?: string }).executionId ===
          run.data?.executionId,
    );
    expect(doneEvent).toBeTruthy();
    expect((doneEvent?.payload as { terminal?: string }).terminal).toBe("completed");

    const service = createDocumentService({ db: harness.db, logger: createLogger() });
    const read = service.read({ projectId, documentId });
    assert.equal(read.ok, true);
    if (read.ok) expect(read.data.contentText).not.toBe("origin");

    const reasons = readSnapshotReasons(harness.db, documentId);
    expect(reasons).toContain("pre-write");
    expect(reasons).toContain("ai-accept");
    expect(reasons.indexOf("pre-write")).toBeLessThan(
      reasons.indexOf("ai-accept"),
    );
  });

  it("permission denied path: preview -> reject keeps original text and skips ai-accept snapshot", async () => {
    const harness = createHarness({
      env: {
        ...process.env,
        CREONOW_E2E: "1",
        CREONOW_E2E_AI_MODE: "success",
        CREONOW_AI_PROVIDER: "openai",
        CREONOW_AI_MODEL: "gpt-5.2",
      },
    });
    opened.push(harness.db);

    const { projectId, documentId } = createProjectAndDocument({
      db: harness.db,
      text: "origin",
    });

    const run = await harness.invoke<{
      ok: boolean;
      data?: { executionId: string; status: "preview" | "completed" | "rejected" };
    }>("ai:skill:run", {
      skillId: "builtin:polish",
      hasSelection: true,
      input: "origin",
      mode: "ask",
      model: "gpt-5.2",
      agenticLoop: true,
      context: { projectId, documentId },
      selection: {
        from: 1,
        to: 7,
        text: "origin",
        selectionTextHash: computeSelectionTextHash("origin"),
      },
      stream: true,
    });
    expect(run.ok).toBe(true);
    expect(run.data?.status).toBe("preview");

    const reject = await harness.invoke<{
      ok: boolean;
      data?: { status: "completed" | "rejected" };
    }>("ai:skill:confirm", {
      executionId: run.data?.executionId,
      action: "reject",
      projectId,
    });
    expect(reject.ok).toBe(true);
    expect(reject.data?.status).toBe("rejected");

    const service = createDocumentService({ db: harness.db, logger: createLogger() });
    const read = service.read({ projectId, documentId });
    assert.equal(read.ok, true);
    if (read.ok) {
      expect(read.data.contentText).toBe("origin");
    }
    const reasons = readSnapshotReasons(harness.db, documentId);
    // Snapshot is created at pre-write stage before permission decision (INV-1 fail-closed).
    // Reject must only block ai-accept write-back, not retroactively remove pre-write snapshot.
    expect(reasons).toContain("pre-write");
    expect(reasons).not.toContain("ai-accept");
  });

  it("provider failure path: ai:skill:run returns structured error without write-back", async () => {
    const harness = createHarness({
      env: {
        ...process.env,
        CREONOW_E2E: "1",
        CREONOW_E2E_AI_MODE: "upstream-error",
        CREONOW_AI_PROVIDER: "openai",
        CREONOW_AI_MODEL: "gpt-5.2",
      },
    });
    opened.push(harness.db);
    const { projectId, documentId } = createProjectAndDocument({
      db: harness.db,
      text: "origin",
    });
    const run = await harness.invoke<{
      ok: boolean;
      error?: { code: string; message: string };
    }>("ai:skill:run", {
      skillId: "builtin:polish",
      hasSelection: true,
      input: "origin",
      mode: "ask",
      model: "gpt-5.2",
      agenticLoop: true,
      context: { projectId, documentId },
      selection: {
        from: 1,
        to: 7,
        text: "origin",
        selectionTextHash: computeSelectionTextHash("origin"),
      },
      stream: true,
    });
    expect(run.ok).toBe(false);
    expect(run.error?.code).toBe("AI_SERVICE_ERROR");

    const service = createDocumentService({ db: harness.db, logger: createLogger() });
    const read = service.read({ projectId, documentId });
    assert.equal(read.ok, true);
    if (read.ok) {
      expect(read.data.contentText).toBe("origin");
    }
    const reasons = readSnapshotReasons(harness.db, documentId);
    expect(reasons).toEqual(["manual-save"]);
  });

  it("abort path: ai:skill:cancel interrupts pending preview before write-back", async () => {
    const harness = createHarness({
      env: {
        ...process.env,
        CREONOW_E2E: "1",
        CREONOW_E2E_AI_MODE: "success",
        CREONOW_AI_PROVIDER: "openai",
        CREONOW_AI_MODEL: "gpt-5.2",
      },
    });
    opened.push(harness.db);
    const { projectId, documentId } = createProjectAndDocument({
      db: harness.db,
      text: "origin",
    });

    const run = await harness.invoke<{
      ok: boolean;
      data?: {
        executionId: string;
        status?: "preview" | "completed" | "rejected";
      };
      error?: { code: string; message: string };
    }>("ai:skill:run", {
      skillId: "builtin:polish",
      hasSelection: true,
      input: "origin",
      mode: "ask",
      model: "gpt-5.2",
      agenticLoop: true,
      context: { projectId, documentId },
      selection: {
        from: 1,
        to: 7,
        text: "origin",
        selectionTextHash: computeSelectionTextHash("origin"),
      },
      stream: true,
    });
    expect(run.ok).toBe(true);
    expect(run.data?.status).toBe("preview");

    const cancel = await harness.invoke<{ ok: boolean }>("ai:skill:cancel", {
      executionId: run.data?.executionId,
    });
    expect(cancel.ok).toBe(true);

    const service = createDocumentService({ db: harness.db, logger: createLogger() });
    const read = service.read({ projectId, documentId });
    assert.equal(read.ok, true);
    if (read.ok) {
      expect(read.data.contentText).toBe("origin");
    }
    const reasons = readSnapshotReasons(harness.db, documentId);
    // Stage 5 (pre-write snapshot) already completed before the preview pause;
    // cancel only suppresses ai-accept write-back, it does not remove the pre-write snapshot.
    expect(reasons).toContain("pre-write");
    expect(reasons).not.toContain("ai-accept");
  });
});
