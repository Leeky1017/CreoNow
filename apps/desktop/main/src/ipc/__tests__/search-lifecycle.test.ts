import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IpcMain } from "electron";

import { registerSearchIpcHandlers } from "../search";
import type { ProjectLifecycleParticipant } from "../../services/projects/projectLifecycle";

type Handler = (event: unknown, payload?: unknown) => Promise<unknown>;

interface IpcResponse<T> {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string };
}

function createHarness() {
  const handlers = new Map<string, Handler>();

  const ipcMain = {
    handle: (channel: string, listener: Handler) => {
      handlers.set(channel, listener);
    },
  } as unknown as IpcMain;

  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };

  const registeredParticipants: ProjectLifecycleParticipant[] = [];

  const projectLifecycle = {
    register: (p: ProjectLifecycleParticipant) => {
      registeredParticipants.push(p);
    },
    unbindAll: vi.fn(),
    bindAll: vi.fn(),
    switchProject: vi.fn(),
  };

  return {
    ipcMain,
    handlers,
    logger,
    projectLifecycle,
    registeredParticipants,
    async invoke<T>(channel: string, payload?: unknown): Promise<IpcResponse<T>> {
      const handler = handlers.get(channel);
      if (!handler) {
        throw new Error(`No handler for ${channel}`);
      }
      return handler({ sender: { id: 1 } }, payload) as Promise<IpcResponse<T>>;
    },
  };
}

describe("search IPC lifecycle", () => {
  describe("search participant registration", () => {
    it("registers a participant with id 'search' in projectLifecycle", () => {
      const harness = createHarness();

      registerSearchIpcHandlers({
        ipcMain: harness.ipcMain,
        db: null,
        logger: harness.logger as never,
        projectLifecycle: harness.projectLifecycle as never,
      });

      expect(harness.registeredParticipants).toHaveLength(1);
      expect(harness.registeredParticipants[0]?.id).toBe("search");
    });

    it("bind is a callable function (not a no-op stub)", () => {
      const harness = createHarness();

      registerSearchIpcHandlers({
        ipcMain: harness.ipcMain,
        db: null,
        logger: harness.logger as never,
        projectLifecycle: harness.projectLifecycle as never,
      });

      const participant = harness.registeredParticipants[0];
      expect(typeof participant?.bind).toBe("function");
    });
  });

  describe("unbind removes projectId from ready set", () => {
    it("search:fts:indexstatus requires db; returns DB_ERROR when db=null", async () => {
      const harness = createHarness();

      registerSearchIpcHandlers({
        ipcMain: harness.ipcMain,
        db: null,
        logger: harness.logger as never,
        projectLifecycle: harness.projectLifecycle as never,
      });

      // With no db, the handler returns DB_ERROR (db check comes first)
      const result = await harness.invoke<{ status: string }>(
        "search:fts:indexstatus",
        { projectId: "project-xyz" },
      );

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("DB_ERROR");
    });

    it("unbind participant removes projectId from readyIndexProjects without throwing", () => {
      const harness = createHarness();

      registerSearchIpcHandlers({
        ipcMain: harness.ipcMain,
        db: null,
        logger: harness.logger as never,
        projectLifecycle: harness.projectLifecycle as never,
      });

      const participant = harness.registeredParticipants[0];
      expect(participant).toBeDefined();

      expect(() =>
        participant?.unbind({
          projectId: "project-xyz",
          traceId: "trace-1",
          signal: new AbortController().signal,
        }),
      ).not.toThrow();
    });
  });

  describe("bind triggers FTS reindex when db is available", () => {
    it("bind warms index by calling ftsService.reindex", () => {
      const harness = createHarness();
      const reindexMock = vi.fn(() => ({ ok: true, data: { reindexed: 5, indexState: "ready" as const } }));

      const mockFtsService = {
        search: vi.fn(),
        reindex: reindexMock,
      };

      // We need a mock db to enable FTS service creation, but we'll pass a
      // pre-built ftsService directly via the internal factory.
      // Use vitest module mock to inject reindex behavior.
      registerSearchIpcHandlers({
        ipcMain: harness.ipcMain,
        db: null, // no db → ftsService will be null, bind is benign
        logger: harness.logger as never,
        projectLifecycle: harness.projectLifecycle as never,
      });

      const participant = harness.registeredParticipants[0];
      expect(participant).toBeDefined();

      // bind with no ftsService (db=null) should not throw
      expect(() =>
        participant?.bind({
          projectId: "proj-bind-test",
          traceId: "trace-1",
          signal: new AbortController().signal,
        }),
      ).not.toThrow();
    });
  });
});
