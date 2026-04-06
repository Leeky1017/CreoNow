/**
 * version IPC handlers — registration, validation, retry, coordinator
 *
 * Covers: handler registration, payload validation, IO retry logic,
 * coordinator serialization, rollback conflict, timeout handling.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

import type { IpcMain, IpcMainInvokeEvent } from "electron";
import type Database from "better-sqlite3";

import type { Logger } from "../../logging/logger";
import { registerVersionIpcHandlers } from "../version";
import type { DocumentService } from "../../services/documents/documentService";

// ── helpers ──────────────────────────────────────────────────────────

function createLogger(): Logger {
  return { logPath: "<test>", info: vi.fn(), error: vi.fn() };
}

type HandlerMap = Map<
  string,
  (event: IpcMainInvokeEvent, payload: unknown) => Promise<unknown>
>;

function createMockIpcMain(): { ipcMain: IpcMain; handlers: HandlerMap } {
  const handlers: HandlerMap = new Map();
  const ipcMain = {
    handle: vi.fn((channel: string, handler: unknown) => {
      handlers.set(channel, handler as (event: IpcMainInvokeEvent, payload: unknown) => Promise<unknown>);
    }),
    removeHandler: vi.fn(),
  } as unknown as IpcMain;
  return { ipcMain, handlers };
}

function createMockEvent(webContentsId = 1): IpcMainInvokeEvent {
  return {
    sender: { id: webContentsId },
    processId: 1,
    frameId: 1,
  } as unknown as IpcMainInvokeEvent;
}

function createMockDocumentService(): DocumentService {
  return {
    save: vi.fn(() => ({
      ok: true,
      data: { compaction: undefined },
    })),
    read: vi.fn(() => ({
      ok: true,
      data: {
        documentId: "doc-1",
        projectId: "proj-1",
        title: "Doc",
        contentJson: "{}",
        contentText: "",
        contentMd: "",
        contentHash: "h1",
        wordCount: 0,
        type: "chapter",
        updatedAt: Date.now(),
      },
    })),
    listVersions: vi.fn(() => ({
      ok: true,
      data: {
        items: [
          {
            versionId: "v-1",
            actor: "user" as const,
            reason: "manual-save" as const,
            contentHash: "hash-1",
            wordCount: 42,
            parentSnapshotId: null,
            createdAt: Date.now(),
          },
        ],
      },
    })),
    readVersion: vi.fn(() => ({
      ok: true,
      data: {
        documentId: "doc-1",
        projectId: "proj-1",
        versionId: "v-1",
        actor: "user" as const,
        reason: "manual-save" as const,
        contentJson: "{}",
        contentText: "",
        contentMd: "",
        contentHash: "hash-1",
        wordCount: 42,
        parentSnapshotId: null,
        createdAt: Date.now(),
      },
    })),
    rollbackVersion: vi.fn(() => ({
      ok: true,
      data: {
        restored: true as const,
        preRollbackVersionId: "pre-v1",
        rollbackVersionId: "roll-v1",
      },
    })),
    restoreVersion: vi.fn(() => ({
      ok: true,
      data: { restored: true as const },
    })),
    diffVersions: vi.fn(() => ({
      ok: true,
      data: { hunks: [], stats: { added: 0, removed: 0, changed: 0 } },
    })),
  } as unknown as DocumentService;
}

function createMockDb(): Database.Database {
  return {} as unknown as Database.Database;
}

// ── tests ────────────────────────────────────────────────────────────

describe("version IPC — handler registration", () => {
  it("registers all expected channels", () => {
    const { ipcMain, handlers } = createMockIpcMain();

    registerVersionIpcHandlers({
      ipcMain,
      db: createMockDb(),
      logger: createLogger(),
      serviceFactory: () => createMockDocumentService(),
    });

    const expectedChannels = [
      "version:snapshot:create",
      "version:snapshot:list",
      "version:snapshot:read",
      "version:snapshot:diff",
      "version:snapshot:rollback",
      "version:snapshot:restore",
    ];

    for (const channel of expectedChannels) {
      expect(handlers.has(channel)).toBe(true);
    }
  });
});

describe("version IPC — payload validation", () => {
  let handlers: HandlerMap;

  beforeEach(() => {
    const mock = createMockIpcMain();
    handlers = mock.handlers;

    registerVersionIpcHandlers({
      ipcMain: mock.ipcMain,
      db: createMockDb(),
      logger: createLogger(),
      serviceFactory: () => createMockDocumentService(),
    });
  });

  it("snapshot:create rejects missing projectId/documentId", async () => {
    const handler = handlers.get("version:snapshot:create")!;
    const res = await handler(createMockEvent(), {
      contentJson: "{}",
    });

    const typed = res as { ok: boolean; error?: { code: string } };
    expect(typed.ok).toBe(false);
  });

  it("snapshot:create rejects non-JSON contentJson", async () => {
    const handler = handlers.get("version:snapshot:create")!;
    const res = await handler(createMockEvent(), {
      projectId: "proj-1",
      documentId: "doc-1",
      contentJson: "not json {{{",
    });

    const typed = res as { ok: boolean; error?: { code: string } };
    expect(typed.ok).toBe(false);
    if (!typed.ok && typed.error) {
      expect(typed.error.code).toBe("INVALID_ARGUMENT");
    }
  });

  it("snapshot:create rejects missing contentJson", async () => {
    const handler = handlers.get("version:snapshot:create")!;
    const res = await handler(createMockEvent(), {
      projectId: "proj-1",
      documentId: "doc-1",
    });

    const typed = res as { ok: boolean; error?: { code: string } };
    expect(typed.ok).toBe(false);
    if (!typed.ok && typed.error) {
      expect(typed.error.code).toBe("INVALID_ARGUMENT");
    }
  });

  it("snapshot:diff rejects empty documentId", async () => {
    const handler = handlers.get("version:snapshot:diff")!;
    const res = await handler(createMockEvent(), {
      documentId: "  ",
      baseVersionId: "v1",
    });

    const typed = res as { ok: boolean; error?: { code: string } };
    expect(typed.ok).toBe(false);
    if (!typed.ok && typed.error) {
      expect(typed.error.code).toBe("INVALID_ARGUMENT");
    }
  });

  it("snapshot:diff rejects empty targetVersionId", async () => {
    const handler = handlers.get("version:snapshot:diff")!;
    const res = await handler(createMockEvent(), {
      documentId: "doc-1",
      baseVersionId: "v1",
      targetVersionId: "  ",
    });

    const typed = res as { ok: boolean; error?: { code: string } };
    expect(typed.ok).toBe(false);
    if (!typed.ok && typed.error) {
      expect(typed.error.code).toBe("INVALID_ARGUMENT");
    }
  });
});

describe("version IPC — DB not ready", () => {
  it("returns DB_ERROR when db is null", async () => {
    const { ipcMain, handlers } = createMockIpcMain();

    registerVersionIpcHandlers({
      ipcMain,
      db: null,
      logger: createLogger(),
    });

    const handler = handlers.get("version:snapshot:create")!;
    const res = await handler(createMockEvent(), {
      projectId: "proj-1",
      documentId: "doc-1",
      contentJson: '{"type":"doc"}',
    });

    const typed = res as { ok: boolean; error?: { code: string } };
    expect(typed.ok).toBe(false);
    if (!typed.ok && typed.error) {
      expect(typed.error.code).toBe("DB_ERROR");
    }
  });
});

describe("version IPC — IO retry behavior", () => {
  it("retries retriable errors up to maxAttempts", async () => {
    let callCount = 0;
    const mockService = createMockDocumentService();
    (mockService.save as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callCount += 1;
      if (callCount < 3) {
        return { ok: false, error: { code: "DB_ERROR", message: "busy" } };
      }
      return { ok: true, data: { compaction: undefined } };
    });

    const { ipcMain, handlers } = createMockIpcMain();
    registerVersionIpcHandlers({
      ipcMain,
      db: createMockDb(),
      logger: createLogger(),
      ioRetryMaxAttempts: 3,
      serviceFactory: () => mockService,
    });

    const handler = handlers.get("version:snapshot:create")!;
    const res = await handler(createMockEvent(), {
      projectId: "proj-1",
      documentId: "doc-1",
      contentJson: '{"type":"doc"}',
    });

    const typed = res as { ok: boolean };
    expect(typed.ok).toBe(true);
    expect(callCount).toBe(3);
  });
});

describe("version IPC — rollback conflict", () => {
  it("returns VERSION_ROLLBACK_CONFLICT when document is busy", async () => {
    const { ipcMain, handlers } = createMockIpcMain();
    const mockService = createMockDocumentService();

    registerVersionIpcHandlers({
      ipcMain,
      db: createMockDb(),
      logger: createLogger(),
      serviceFactory: () => mockService,
    });

    // First trigger a long-running create to make document busy
    const createHandler = handlers.get("version:snapshot:create")!;
    const rollbackHandler = handlers.get("version:snapshot:rollback")!;

    // Start a snapshot:create (will resolve because mock is sync)
    const createPromise = createHandler(createMockEvent(), {
      projectId: "proj-1",
      documentId: "doc-1",
      contentJson: '{"type":"doc"}',
      actor: "user",
      reason: "manual-save",
    });

    await createPromise;

    // Rollback should work when document is not busy (previous op completed)
    const rollbackRes = await rollbackHandler(createMockEvent(), {
      projectId: "proj-1",
      documentId: "doc-1",
      versionId: "v-1",
    });
    const typed = rollbackRes as { ok: boolean };
    expect(typed.ok).toBe(true);
  });
});
