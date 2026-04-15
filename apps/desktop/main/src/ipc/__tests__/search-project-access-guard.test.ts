/**
 * search-project-access-guard.test.ts
 *
 * Focused tests for search IPC project-session binding enforcement.
 *
 * Spec coverage:
 *  - A renderer bound to project-a must NOT reach search:* handlers on
 *    behalf of project-b → must receive FORBIDDEN.
 *  - A renderer bound to project-a CAN invoke search:* for project-a.
 *  - The guard applies to all project-scoped search channels:
 *      search:fts:query, search:fts:reindex, search:fts:indexstatus,
 *      search:query:strategy, search:semantic:query, search:rank:explain,
 *      search:replace:preview, search:replace:execute
 */

import assert from "node:assert/strict";
import { describe, it, vi } from "vitest";
import type { IpcMain } from "electron";

import { registerSearchIpcHandlers } from "../search";
import { createProjectSessionBindingRegistry } from "../projectSessionBinding";

// ---------------------------------------------------------------------------
// Module-level mocks — isolate from real SQLite / services.
// ---------------------------------------------------------------------------
vi.mock("../../services/search/ftsService", () => ({
  createFtsService: vi.fn(() => ({
    search: vi.fn(() => ({
      ok: true,
      data: {
        results: [],
        total: 0,
        hasMore: false,
        indexState: "ready",
      },
    })),
    reindex: vi.fn(() => ({ ok: true, data: { indexState: "ready", reindexed: 0 } })),
  })),
}));
vi.mock("../../services/search/hybridRankingService", () => ({
  createHybridRankingService: vi.fn(() => ({
    queryByStrategy: vi.fn(() => ({
      ok: true,
      data: {
        traceId: "t1",
        costMs: 1,
        strategy: "fts",
        fallback: "none",
        results: [],
        total: 0,
        hasMore: false,
        backpressure: { candidateLimit: 100, candidateCount: 0, truncated: false },
      },
    })),
    rankExplain: vi.fn(() => ({
      ok: true,
      data: {
        strategy: "fts",
        explanations: [],
        total: 0,
        backpressure: { candidateLimit: 100, candidateCount: 0, truncated: false },
      },
    })),
  })),
  createNoopSemanticRetriever: vi.fn(() => ({ search: vi.fn() })),
}));
vi.mock("../../services/search/searchReplaceService", () => ({
  createSearchReplaceService: vi.fn(() => ({
    preview: vi.fn(() => ({ ok: true, data: { previewId: "p1", matches: [], total: 0 } })),
    execute: vi.fn(() => ({ ok: true, data: { replaced: 0 } })),
  })),
}));

// ---------------------------------------------------------------------------
// Harness helpers
// ---------------------------------------------------------------------------
type Handler = (event: unknown, payload: unknown) => Promise<unknown>;

interface IpcResponse<T> {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string };
}

function createIpcHarness() {
  const handlers = new Map<string, Handler>();
  const ipcMain = {
    handle: (channel: string, listener: Handler) => {
      handlers.set(channel, listener);
    },
  } as unknown as IpcMain;

  return {
    ipcMain,
    handlers,
    async invoke<T>(
      channel: string,
      event: { sender: { id: number } },
      payload: unknown,
    ): Promise<IpcResponse<T>> {
      const handler = handlers.get(channel);
      if (!handler) throw new Error(`No handler for ${channel}`);
      return handler(event, payload) as Promise<IpcResponse<T>>;
    },
  };
}

function makeLogger() {
  return {
    logPath: "<test>",
    info: vi.fn(),
    error: vi.fn(),
  };
}

// Fake db that satisfies the interface without real SQLite.
function fakeDb() {
  return {} as import("better-sqlite3").Database;
}

function makeEvent(webContentsId: number) {
  return { sender: { id: webContentsId } };
}

// ---------------------------------------------------------------------------
// Shared test matrix
// ---------------------------------------------------------------------------
const PROJECT_SCOPED_CHANNELS: Array<{ channel: string; payload: Record<string, unknown> }> = [
  {
    channel: "search:fts:query",
    payload: { projectId: "project-b", query: "hello" },
  },
  {
    channel: "search:fts:reindex",
    payload: { projectId: "project-b" },
  },
  {
    channel: "search:fts:indexstatus",
    payload: { projectId: "project-b" },
  },
  {
    channel: "search:query:strategy",
    payload: { projectId: "project-b", query: "hello", strategy: "fts" },
  },
  {
    channel: "search:semantic:query",
    payload: { projectId: "project-b", query: "hello", strategy: "semantic" },
  },
  {
    channel: "search:rank:explain",
    payload: { projectId: "project-b", query: "hello", strategy: "fts" },
  },
  {
    channel: "search:replace:preview",
    payload: {
      projectId: "project-b",
      scope: "project",
      query: "old",
      replaceWith: "new",
    },
  },
  {
    channel: "search:replace:execute",
    payload: {
      projectId: "project-b",
      scope: "project",
      query: "old",
      replaceWith: "new",
    },
  },
];

// ---------------------------------------------------------------------------
// Tests: cross-project FORBIDDEN
// ---------------------------------------------------------------------------
describe("search IPC project access guard — cross-project isolation", () => {
  for (const { channel, payload } of PROJECT_SCOPED_CHANNELS) {
    it(`rejects ${channel} when renderer is bound to project-a but requests project-b`, async () => {
      const binding = createProjectSessionBindingRegistry();
      binding.bind({ webContentsId: 101, projectId: "project-a" });

      const harness = createIpcHarness();
      registerSearchIpcHandlers({
        ipcMain: harness.ipcMain,
        db: fakeDb(),
        logger: makeLogger() as never,
        projectSessionBinding: binding,
      });

      const result = await harness.invoke(channel, makeEvent(101), payload);
      assert.equal(
        result.ok,
        false,
        `${channel}: expected ok=false, got ok=true`,
      );
      assert.equal(
        result.error?.code,
        "FORBIDDEN",
        `${channel}: expected code=FORBIDDEN, got code=${result.error?.code}`,
      );
    });
  }
});

// ---------------------------------------------------------------------------
// Tests: unbound renderer rejected
// ---------------------------------------------------------------------------
describe("search IPC project access guard — unbound renderer", () => {
  for (const { channel, payload } of PROJECT_SCOPED_CHANNELS) {
    it(`rejects ${channel} when renderer has no project binding`, async () => {
      const binding = createProjectSessionBindingRegistry();
      // webContentsId 202 never bound

      const harness = createIpcHarness();
      registerSearchIpcHandlers({
        ipcMain: harness.ipcMain,
        db: fakeDb(),
        logger: makeLogger() as never,
        projectSessionBinding: binding,
      });

      const result = await harness.invoke(channel, makeEvent(202), payload);
      assert.equal(result.ok, false, `${channel}: expected ok=false`);
      assert.equal(
        result.error?.code,
        "FORBIDDEN",
        `${channel}: expected code=FORBIDDEN, got code=${result.error?.code}`,
      );
    });
  }
});

// ---------------------------------------------------------------------------
// Tests: legitimate binding passes through
// ---------------------------------------------------------------------------
describe("search IPC project access guard — legitimate binding passes", () => {
  it("allows search:fts:query when renderer is bound to the requested project", async () => {
    const binding = createProjectSessionBindingRegistry();
    binding.bind({ webContentsId: 301, projectId: "project-a" });

    const harness = createIpcHarness();
    registerSearchIpcHandlers({
      ipcMain: harness.ipcMain,
      db: fakeDb(),
      logger: makeLogger() as never,
      projectSessionBinding: binding,
    });

    const result = await harness.invoke<{ results: unknown[] }>(
      "search:fts:query",
      makeEvent(301),
      { projectId: "project-a", query: "hello" },
    );
    assert.equal(result.ok, true, `expected ok=true, got: ${JSON.stringify(result.error)}`);
  });

  it("allows search:fts:reindex when renderer is bound to the requested project", async () => {
    const binding = createProjectSessionBindingRegistry();
    binding.bind({ webContentsId: 302, projectId: "project-a" });

    const harness = createIpcHarness();
    registerSearchIpcHandlers({
      ipcMain: harness.ipcMain,
      db: fakeDb(),
      logger: makeLogger() as never,
      projectSessionBinding: binding,
    });

    const result = await harness.invoke<{ indexState: string }>(
      "search:fts:reindex",
      makeEvent(302),
      { projectId: "project-a" },
    );
    assert.equal(result.ok, true, `expected ok=true, got: ${JSON.stringify(result.error)}`);
  });

  it("allows search:query:strategy when renderer is bound to the requested project", async () => {
    const binding = createProjectSessionBindingRegistry();
    binding.bind({ webContentsId: 303, projectId: "project-a" });

    const harness = createIpcHarness();
    registerSearchIpcHandlers({
      ipcMain: harness.ipcMain,
      db: fakeDb(),
      logger: makeLogger() as never,
      projectSessionBinding: binding,
    });

    const result = await harness.invoke(
      "search:query:strategy",
      makeEvent(303),
      { projectId: "project-a", query: "hello", strategy: "fts" },
    );
    assert.equal(result.ok, true, `expected ok=true, got: ${JSON.stringify(result.error)}`);
  });

  it("allows search:semantic:query when renderer is bound to the requested project", async () => {
    const binding = createProjectSessionBindingRegistry();
    binding.bind({ webContentsId: 306, projectId: "project-a" });

    const harness = createIpcHarness();
    registerSearchIpcHandlers({
      ipcMain: harness.ipcMain,
      db: fakeDb(),
      logger: makeLogger() as never,
      projectSessionBinding: binding,
    });

    const result = await harness.invoke(
      "search:semantic:query",
      makeEvent(306),
      { projectId: "project-a", query: "hello", strategy: "semantic" },
    );
    assert.equal(result.ok, true, `expected ok=true, got: ${JSON.stringify(result.error)}`);
  });

  it("allows search:replace:preview when renderer is bound to the requested project", async () => {
    const binding = createProjectSessionBindingRegistry();
    binding.bind({ webContentsId: 304, projectId: "project-a" });

    const harness = createIpcHarness();
    registerSearchIpcHandlers({
      ipcMain: harness.ipcMain,
      db: fakeDb(),
      logger: makeLogger() as never,
      projectSessionBinding: binding,
    });

    const result = await harness.invoke(
      "search:replace:preview",
      makeEvent(304),
      {
        projectId: "project-a",
        scope: "project",
        query: "old",
        replaceWith: "new",
      },
    );
    assert.equal(result.ok, true, `expected ok=true, got: ${JSON.stringify(result.error)}`);
  });

  it("allows search:replace:execute when renderer is bound to the requested project", async () => {
    const binding = createProjectSessionBindingRegistry();
    binding.bind({ webContentsId: 305, projectId: "project-a" });

    const harness = createIpcHarness();
    registerSearchIpcHandlers({
      ipcMain: harness.ipcMain,
      db: fakeDb(),
      logger: makeLogger() as never,
      projectSessionBinding: binding,
    });

    const result = await harness.invoke(
      "search:replace:execute",
      makeEvent(305),
      {
        projectId: "project-a",
        scope: "project",
        query: "old",
        replaceWith: "new",
      },
    );
    assert.equal(result.ok, true, `expected ok=true, got: ${JSON.stringify(result.error)}`);
  });
});
