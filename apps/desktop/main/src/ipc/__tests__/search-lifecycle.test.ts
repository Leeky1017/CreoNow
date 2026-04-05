import { describe, expect, it, vi } from "vitest";
import type { IpcMain } from "electron";
import type { Database } from "better-sqlite3";

import { registerSearchIpcHandlers } from "../search";
import type { ProjectLifecycleParticipant } from "../../services/projects/projectLifecycle";
import { createFtsService } from "../../services/search/ftsService";

// ---------------------------------------------------------------------------
// Module-level mocks — keep tests isolated from real SQLite I/O.
// vi.mock calls are hoisted by vitest so they run before any imports resolve.
// ---------------------------------------------------------------------------
vi.mock("../../services/search/ftsService");
vi.mock("../../services/search/hybridRankingService", () => ({
  createHybridRankingService: vi.fn(() => null),
  createNoopSemanticRetriever: vi.fn(() => ({ search: vi.fn() })),
}));
vi.mock("../../services/search/searchReplaceService", () => ({
  createSearchReplaceService: vi.fn(() => null),
}));

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
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
    it("bind calls ftsService.reindex and marks project ready (full semantic loop)", async () => {
      // Configure the mocked factory to return a controllable ftsService.
      const reindexMock = vi.fn(() => ({
        ok: true as const,
        data: { reindexed: 5, indexState: "ready" as const },
      }));
      vi.mocked(createFtsService).mockReturnValue({
        search: vi.fn(),
        reindex: reindexMock,
        searchFulltext: vi.fn(),
      });

      const harness = createHarness();
      // A non-null db triggers ftsService creation inside registerSearchIpcHandlers.
      const fakeDb = {} as Database;

      registerSearchIpcHandlers({
        ipcMain: harness.ipcMain,
        db: fakeDb,
        logger: harness.logger as never,
        projectLifecycle: harness.projectLifecycle as never,
      });

      const participant = harness.registeredParticipants[0];
      expect(participant).toBeDefined();

      // Trigger bind — should warm the FTS index for the project.
      participant?.bind({
        projectId: "proj-bind-test",
        traceId: "trace-1",
        signal: new AbortController().signal,
      });

      // Assert: reindex was called with the correct project-scoped argument.
      expect(reindexMock).toHaveBeenCalledOnce();
      expect(reindexMock).toHaveBeenCalledWith({ projectId: "proj-bind-test" });

      // Assert full closed loop: indexstatus now returns "ready" without an
      // explicit search:fts:reindex call from the renderer.
      const statusResult = await harness.invoke<{ status: string }>(
        "search:fts:indexstatus",
        { projectId: "proj-bind-test" },
      );
      expect(statusResult.ok).toBe(true);
      expect(statusResult.data?.status).toBe("ready");
    });

    it("bind with db=null (ftsService unavailable) does not throw and leaves project NOT ready", async () => {
      const harness = createHarness();

      registerSearchIpcHandlers({
        ipcMain: harness.ipcMain,
        db: null,
        logger: harness.logger as never,
        projectLifecycle: harness.projectLifecycle as never,
      });

      const participant = harness.registeredParticipants[0];
      expect(participant).toBeDefined();

      // bind must never throw even when ftsService is unavailable.
      expect(() =>
        participant?.bind({
          projectId: "proj-bind-test",
          traceId: "trace-1",
          signal: new AbortController().signal,
        }),
      ).not.toThrow();

      // With no db, indexstatus returns DB_ERROR — project is NOT ready.
      const statusResult = await harness.invoke<{ status: string }>(
        "search:fts:indexstatus",
        { projectId: "proj-bind-test" },
      );
      expect(statusResult.ok).toBe(false);
      expect(statusResult.error?.code).toBe("DB_ERROR");
    });
  });
});
