import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IpcMain } from "electron";

import { registerSearchIpcHandlers } from "../search";
import { createProjectSessionBindingRegistry } from "../projectSessionBinding";
import { createHybridRankingService } from "../../services/search/hybridRankingService";

vi.mock("../../services/search/ftsService", () => ({
  createFtsService: vi.fn(() => ({
    search: vi.fn(() => ({ ok: true, data: { results: [], total: 0, hasMore: false, indexState: "ready" } })),
    reindex: vi.fn(() => ({ ok: true, data: { indexState: "ready", reindexed: 0 } })),
  })),
}));

vi.mock("../../services/search/hybridRankingService", () => ({
  createHybridRankingService: vi.fn(),
  createNoopSemanticRetriever: vi.fn(() => ({ search: vi.fn() })),
}));

vi.mock("../../services/search/searchReplaceService", () => ({
  createSearchReplaceService: vi.fn(() => null),
}));

type Handler = (event: unknown, payload?: unknown) => Promise<unknown>;
type SemanticQueryResponse = {
  backpressure: {
    candidateCount: number;
    candidateLimit: number;
    truncated: boolean;
  };
  costMs: number;
  fallback: "fts" | "none";
  hasMore: boolean;
  notice?: string;
  results: Array<{
    chunkId: string;
    documentId: string;
    finalScore: number;
    scoreBreakdown: { bm25: number; recency: number; semantic: number };
    snippet: string;
    updatedAt: number;
  }>;
  strategy: "fts" | "semantic" | "hybrid";
  total: number;
  traceId: string;
};

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

  const projectSessionBinding = createProjectSessionBindingRegistry();
  projectSessionBinding.bind({ webContentsId: 901, projectId: "project-1" });

  registerSearchIpcHandlers({
    ipcMain,
    db: {} as never,
    logger: {
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    } as never,
    projectSessionBinding,
  });

  return {
    invoke: async <T>(channel: string, payload: unknown): Promise<IpcResponse<T>> => {
      const handler = handlers.get(channel);
      if (!handler) {
        throw new Error(`No handler for ${channel}`);
      }
      return (await handler({ sender: { id: 901 } }, payload)) as IpcResponse<T>;
    },
  };
}

describe("search:semantic:query", () => {
  const queryByStrategy = vi.fn();

  beforeEach(() => {
    queryByStrategy.mockReset();
    vi.mocked(createHybridRankingService).mockReturnValue({
      queryByStrategy,
      rankExplain: vi.fn(),
    } as never);
  });

  it("uses hybrid as default strategy when strategy is omitted", async () => {
    queryByStrategy.mockReturnValue({
      ok: true as const,
      data: {
        traceId: "trace-default",
        costMs: 4,
        strategy: "hybrid" as const,
        fallback: "none" as const,
        results: [],
        total: 0,
        hasMore: false,
        backpressure: {
          candidateLimit: 100,
          candidateCount: 0,
          truncated: false,
        },
      },
    });

    const h = createHarness();
    const result = await h.invoke<SemanticQueryResponse>("search:semantic:query", {
      projectId: "project-1",
      query: "雾港",
    });

    expect(result.ok).toBe(true);
    expect(queryByStrategy).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "project-1",
        query: "雾港",
        strategy: "hybrid",
      }),
    );
  });

  it("preserves strategy/fallback/notice fields from ranking response", async () => {
    queryByStrategy.mockReturnValue({
      ok: true as const,
      data: {
        traceId: "trace-fallback",
        costMs: 7,
        strategy: "fts" as const,
        fallback: "fts" as const,
        notice: "semantic index warming up, fallback to fts",
        results: [],
        total: 0,
        hasMore: false,
        backpressure: {
          candidateLimit: 100,
          candidateCount: 0,
          truncated: false,
        },
      },
    });

    const h = createHarness();
    const result = await h.invoke<SemanticQueryResponse>("search:semantic:query", {
      projectId: "project-1",
      query: "风暴之眼",
      strategy: "semantic",
    });

    expect(result.ok).toBe(true);
    expect(result.data?.strategy).toBe("fts");
    expect(result.data?.fallback).toBe("fts");
    expect(result.data?.notice).toContain("fallback");
  });

  it("returns INVALID_ARGUMENT when projectId is missing", async () => {
    queryByStrategy.mockReturnValue({
      ok: true as const,
      data: {
        traceId: "unused",
        costMs: 1,
        strategy: "hybrid" as const,
        fallback: "none" as const,
        results: [],
        total: 0,
        hasMore: false,
        backpressure: {
          candidateLimit: 100,
          candidateCount: 0,
          truncated: false,
        },
      },
    });

    const h = createHarness();
    const result = await h.invoke<SemanticQueryResponse>("search:semantic:query", {
      query: "missing-project-id",
      strategy: "semantic",
    });

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("INVALID_ARGUMENT");
    expect(queryByStrategy).not.toHaveBeenCalled();
  });
});
