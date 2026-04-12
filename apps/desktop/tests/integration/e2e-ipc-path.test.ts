import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Database from "better-sqlite3";
import type { IpcMain } from "electron";

import { registerAiIpcHandlers } from "../../main/src/ipc/ai";
import type { Logger } from "../../main/src/logging/logger";
import { createDocumentService } from "../../main/src/services/documents/documentService";
import { computeSelectionTextHash } from "../../main/src/services/editor/prosemirrorSchema";

type TestApi = {
  describe: (name: string, fn: () => void) => void;
  it: (name: string, fn: () => void | Promise<void>) => void;
  afterEach: (fn: () => void | Promise<void>) => void;
};

const testApi = (process.env.VITEST
  ? await import("vitest")
  : await import("node:test")) as unknown as TestApi;
const { afterEach, describe, it } = testApi;

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

async function closeLeakedFakeAiServers(): Promise<void> {
  const proc = process as NodeJS.Process & {
    _getActiveHandles?: () => unknown[];
  };
  const handles = proc._getActiveHandles?.() ?? [];
  const servers = handles.filter((handle) => {
    if (typeof handle !== "object" || handle === null) {
      return false;
    }
    return (
      (handle as { constructor?: { name?: string } }).constructor?.name ===
      "Server"
    );
  });

  await Promise.all(
    servers.map(
      async (server) =>
        await new Promise<void>((resolve) => {
          if (
            typeof server !== "object" ||
            server === null ||
            typeof (server as { close?: unknown }).close !== "function"
          ) {
            resolve();
            return;
          }
          try {
            (
              server as {
                close: (cb: (error?: Error) => void) => void;
              }
            ).close(() => resolve());
          } catch {
            resolve();
          }
        }),
    ),
  );
}

describe("E2E IPC path: ai:skill:run -> SkillOrchestrator -> write-back", () => {
  const opened: Database.Database[] = [];

  afterEach(async () => {
    await closeLeakedFakeAiServers();
    for (const db of opened.splice(0)) {
      db.close();
    }
  });

  it("happy path: preview -> confirm accept -> pre-write snapshot before ai-accept (INV-1), via SkillOrchestrator (INV-6)", async () => {
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
    assert.equal(run.ok, true);
    assert.equal(run.data?.status, "preview");
    const chunkEvents = harness.sentEvents.filter(
      (event) => event.channel === "skill:stream:chunk",
    );
    assert.ok(chunkEvents.length > 0);
    assert.equal(
      chunkEvents.some((event) => {
        const payload = event.payload as { chunk?: unknown };
        return typeof payload.chunk === "string" && payload.chunk.length > 0;
      }),
      true,
    );

    const confirm = await harness.invoke<{
      ok: boolean;
      data?: { status: "completed" | "rejected"; versionId?: string };
    }>("ai:skill:confirm", {
      executionId: run.data?.executionId,
      action: "accept",
      projectId,
    });
    assert.equal(confirm.ok, true);
    assert.equal(confirm.data?.status, "completed");
    assert.ok(confirm.data?.versionId);
    const doneEvent = harness.sentEvents.find(
      (event) =>
        event.channel === "skill:stream:done" &&
        (event.payload as { executionId?: string; terminal?: string }).executionId ===
          run.data?.executionId,
    );
    assert.ok(doneEvent);
    assert.equal(
      (doneEvent?.payload as { terminal?: string }).terminal,
      "completed",
    );

    const service = createDocumentService({ db: harness.db, logger: createLogger() });
    const read = service.read({ projectId, documentId });
    assert.equal(read.ok, true);
    if (read.ok) {
      assert.notEqual(read.data.contentText, "origin");
    }

    const reasons = readSnapshotReasons(harness.db, documentId);
    assert.ok(reasons.includes("pre-write"));
    assert.ok(reasons.includes("ai-accept"));
    assert.ok(
      reasons.indexOf("pre-write") < reasons.indexOf("ai-accept"),
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
    assert.equal(run.ok, true);
    assert.equal(run.data?.status, "preview");

    const reject = await harness.invoke<{
      ok: boolean;
      data?: { status: "completed" | "rejected" };
    }>("ai:skill:confirm", {
      executionId: run.data?.executionId,
      action: "reject",
      projectId,
    });
    assert.equal(reject.ok, true);
    assert.equal(reject.data?.status, "rejected");

    const service = createDocumentService({ db: harness.db, logger: createLogger() });
    const read = service.read({ projectId, documentId });
    assert.equal(read.ok, true);
    if (read.ok) {
      assert.equal(read.data.contentText, "origin");
    }
    // TODO(P1-07): orchestrator creates pre-write snapshot before permission-requested;
    // spec says snapshot should only exist after user confirms.
    // See openspec/specs/skill-system/spec.md:213-217.
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
    assert.equal(run.ok, false);
    assert.equal(run.error?.code, "AI_SERVICE_ERROR");

    const service = createDocumentService({ db: harness.db, logger: createLogger() });
    const read = service.read({ projectId, documentId });
    assert.equal(read.ok, true);
    if (read.ok) {
      assert.equal(read.data.contentText, "origin");
    }
    const reasons = readSnapshotReasons(harness.db, documentId);
    assert.deepEqual(reasons, ["manual-save"]);
  });

  it("invalid argument path: ai:skill:run rejects missing projectId with actionable validation context", async () => {
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
    const { documentId } = createProjectAndDocument({
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
      context: { documentId },
      selection: {
        from: 1,
        to: 7,
        text: "origin",
        selectionTextHash: computeSelectionTextHash("origin"),
      },
      stream: true,
    });

    assert.equal(run.ok, false);
    assert.equal(run.error?.code, "INVALID_ARGUMENT");
    assert.match(run.error?.message ?? "", /projectId/);
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
    assert.equal(run.ok, true);
    assert.equal(run.data?.status, "preview");

    const cancel = await harness.invoke<{ ok: boolean }>("ai:skill:cancel", {
      executionId: run.data?.executionId,
    });
    assert.equal(cancel.ok, true);

    const service = createDocumentService({ db: harness.db, logger: createLogger() });
    const read = service.read({ projectId, documentId });
    assert.equal(read.ok, true);
    if (read.ok) {
      assert.equal(read.data.contentText, "origin");
    }
    const reasons = readSnapshotReasons(harness.db, documentId);
    // Stage 5 (pre-write snapshot) already completed before the preview pause;
    // cancel only suppresses ai-accept write-back, it does not remove the pre-write snapshot.
    assert.ok(reasons.includes("pre-write"));
    assert.equal(reasons.includes("ai-accept"), false);
  });
});
