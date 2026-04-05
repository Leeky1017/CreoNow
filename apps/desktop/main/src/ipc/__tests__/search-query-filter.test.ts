/**
 * 搜索过滤测试 — P3 项目内搜索约束
 * Spec: openspec/specs/search-and-retrieval/spec.md
 *   — "P3 用户在项目内搜索关键词"
 *   — "P3 禁止跨项目搜索"
 *   — "P3 搜索无结果"
 *
 * 验证 search:fts:query IPC 的项目隔离、结果过滤、空结果行为。
 */

import { describe, it, expect, vi } from "vitest";
import type { IpcMain } from "electron";

import { registerSearchIpcHandlers } from "../search";
import { createProjectSessionBindingRegistry } from "../projectSessionBinding";

// ── Module-level mocks ──
vi.mock("../../services/search/ftsService", () => ({
  createFtsService: vi.fn(() => ({
    search: vi.fn((opts: { projectId: string; query: string }) => {
      if (opts.query === "林远") {
        return {
          ok: true,
          data: {
            results: [
              { projectId: opts.projectId, documentId: "doc-1", documentTitle: "第三章", documentType: "chapter", snippet: "林远推开门", highlights: [], anchor: { start: 0, end: 2 }, documentOffset: 0, score: 0.95, updatedAt: Date.now() },
              { projectId: opts.projectId, documentId: "doc-3", documentTitle: "第七章", documentType: "chapter", snippet: "林远沉思片刻", highlights: [], anchor: { start: 0, end: 2 }, documentOffset: 0, score: 0.82, updatedAt: Date.now() },
            ],
            total: 2,
            hasMore: false,
            indexState: "ready" as const,
          },
        };
      }
      return {
        ok: true,
        data: { results: [], total: 0, hasMore: false, indexState: "ready" as const },
      };
    }),
    reindex: vi.fn(() => ({ ok: true, data: { indexState: "ready", reindexed: 0 } })),
  })),
}));

vi.mock("../../services/search/hybridRankingService", () => ({
  createHybridRankingService: vi.fn(() => null),
  createNoopSemanticRetriever: vi.fn(() => ({ search: vi.fn() })),
}));

vi.mock("../../services/search/searchReplaceService", () => ({
  createSearchReplaceService: vi.fn(() => null),
}));

// ── Harness ──
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

  const binding = createProjectSessionBindingRegistry();

  registerSearchIpcHandlers({
    ipcMain,
    db: {
      prepare: vi.fn(() => ({
        run: vi.fn(),
        get: vi.fn(),
        all: vi.fn(() => []),
      })),
      exec: vi.fn(),
      transaction: vi.fn((fn: () => void) => fn),
    } as never,
    logger: logger as never,
    projectSessionBinding: binding,
  });

  return {
    invoke: async <T>(
      channel: string,
      webContentsId: number,
      payload?: unknown,
    ) => {
      const handler = handlers.get(channel);
      if (!handler) throw new Error(`No handler for ${channel}`);
      return (await handler(
        { sender: { id: webContentsId } },
        payload,
      )) as IpcResponse<T>;
    },
    handlers,
    logger,
    binding,
  };
}

// ── Tests ──
describe("P3 搜索过滤场景", () => {
  // Spec: "P3 用户在项目内搜索关键词"
  describe("search:fts:query 项目内搜索", () => {
    it("绑定项目后可成功搜索并返回结果", async () => {
      const h = createHarness();
      h.binding.bind({ webContentsId: 100, projectId: "proj-暗流" });

      const result = await h.invoke<{
        results: Array<{ documentId: string; snippet: string }>;
        total: number;
      }>("search:fts:query", 100, {
        projectId: "proj-暗流",
        query: "林远",
      });

      expect(result.ok).toBe(true);
      expect(result.data!.results.length).toBe(2);
      expect(result.data!.total).toBe(2);
    });
  });

  // Spec: "P3 禁止跨项目搜索"
  describe("search:fts:query 跨项目隔离", () => {
    it("未绑定项目时返回 FORBIDDEN", async () => {
      const h = createHarness();

      const result = await h.invoke<never>("search:fts:query", 200, {
        projectId: "proj-secret",
        query: "test",
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("FORBIDDEN");
    });

    it("绑定项目 A 后搜索项目 B 返回 FORBIDDEN", async () => {
      const h = createHarness();
      h.binding.bind({ webContentsId: 300, projectId: "proj-a" });

      const result = await h.invoke<never>("search:fts:query", 300, {
        projectId: "proj-b",
        query: "test",
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("FORBIDDEN");
    });
  });

  // Spec: "P3 搜索无结果"
  describe("search:fts:query 空结果", () => {
    it("搜索不存在的关键词返回空 results", async () => {
      const h = createHarness();
      h.binding.bind({ webContentsId: 400, projectId: "proj-暗流" });

      const result = await h.invoke<{
        results: unknown[];
        total: number;
      }>("search:fts:query", 400, {
        projectId: "proj-暗流",
        query: "不存在的关键词xyz",
      });

      expect(result.ok).toBe(true);
      expect(result.data!.results).toHaveLength(0);
      expect(result.data!.total).toBe(0);
    });
  });
});
