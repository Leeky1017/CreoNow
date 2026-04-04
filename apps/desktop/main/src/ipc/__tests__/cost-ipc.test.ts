import { describe, it, expect, vi } from "vitest";
import type { IpcMain } from "electron";

import { registerCostIpcHandlers } from "../cost";
import type { CostTracker, SessionCostSummary, RequestCost } from "../../services/ai/costTracker";

type Handler = (event: unknown, payload?: unknown) => Promise<unknown>;

function createHarness(trackerOverrides: Partial<CostTracker> = {}) {
  const handlers = new Map<string, Handler>();

  const ipcMain = {
    handle: (channel: string, listener: Handler) => {
      handlers.set(channel, listener);
    },
  } as unknown as IpcMain;

  const tracker: CostTracker = {
    recordUsage: vi.fn(),
    getSessionCost: vi.fn().mockReturnValue({
      totalCost: 0.05,
      totalRequests: 2,
      totalInputTokens: 500,
      totalOutputTokens: 200,
      totalCachedTokens: 0,
      costByModel: {},
      costBySkill: {},
      sessionStartedAt: 1000,
    } satisfies SessionCostSummary),
    getRequestCost: vi.fn().mockReturnValue(null),
    listRecords: vi.fn().mockReturnValue([]),
    checkBudget: vi.fn().mockReturnValue(null),
    estimateCost: vi.fn().mockReturnValue(0),
    onBudgetAlert: vi.fn().mockReturnValue(() => {}),
    onCostRecorded: vi.fn().mockReturnValue(() => {}),
    updatePricingTable: vi.fn(),
    updateBudgetPolicy: vi.fn(),
    resetSession: vi.fn(),
    dispose: vi.fn(),
    ...trackerOverrides,
  };

  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };

  registerCostIpcHandlers({
    ipcMain,
    tracker,
    logger: logger as never,
  });

  return {
    invoke: async <T>(channel: string, payload?: unknown) => {
      const handler = handlers.get(channel);
      if (!handler) throw new Error(`No handler for ${channel}`);
      return (await handler({}, payload)) as T;
    },
    tracker,
    logger,
  };
}

describe("cost IPC handlers", () => {
  describe("cost:usage:list", () => {
    it("正常调用返回 records + totalCount", async () => {
      const mockRecords: RequestCost[] = [
        {
          requestId: "r1",
          modelId: "gpt-4o",
          inputTokens: 100,
          outputTokens: 50,
          cachedTokens: 0,
          cost: 0.001,
          skillId: "polish",
          timestamp: Date.now(),
        },
      ];

      const harness = createHarness({
        listRecords: vi.fn().mockReturnValue(mockRecords),
      });

      const result = await harness.invoke<{ ok: boolean; data: { records: RequestCost[]; totalCount: number } }>(
        "cost:usage:list",
      );

      expect(result.ok).toBe(true);
      expect(result.data.records).toHaveLength(1);
      expect(result.data.totalCount).toBe(1);
    });

    it("无参数调用返回所有记录", async () => {
      const harness = createHarness();

      const result = await harness.invoke<{ ok: boolean }>("cost:usage:list");
      expect(result.ok).toBe(true);
    });

    it("非法 skillId 类型返回错误", async () => {
      const harness = createHarness();

      const result = await harness.invoke<{ ok: boolean; error: { code: string } }>(
        "cost:usage:list",
        { skillId: 123 },
      );

      expect(result.ok).toBe(false);
      expect(result.error.code).toBe("INVALID_ARGUMENT");
    });
  });

  describe("cost:usage:summary", () => {
    it("无过滤条件返回完整 session 摘要", async () => {
      const harness = createHarness();

      const result = await harness.invoke<{
        ok: boolean;
        data: { totalCost: number; totalRequests: number };
      }>("cost:usage:summary");

      expect(result.ok).toBe(true);
      expect(result.data.totalCost).toBe(0.05);
      expect(result.data.totalRequests).toBe(2);
    });

    it("非法 skillId 类型返回错误", async () => {
      const harness = createHarness();

      const result = await harness.invoke<{ ok: boolean; error: { code: string } }>(
        "cost:usage:summary",
        { skillId: 123 },
      );

      expect(result.ok).toBe(false);
      expect(result.error.code).toBe("INVALID_ARGUMENT");
    });

    it("非法 since 类型返回错误", async () => {
      const harness = createHarness();

      const result = await harness.invoke<{ ok: boolean; error: { code: string } }>(
        "cost:usage:summary",
        { since: "not-a-number" },
      );

      expect(result.ok).toBe(false);
      expect(result.error.code).toBe("INVALID_ARGUMENT");
    });

    it("带 skillId 过滤返回子集摘要", async () => {
      const mockRecords: RequestCost[] = [
        {
          requestId: "r1",
          modelId: "gpt-4o",
          inputTokens: 100,
          outputTokens: 50,
          cachedTokens: 0,
          cost: 0.01,
          skillId: "polish",
          timestamp: Date.now(),
        },
      ];

      const harness = createHarness({
        listRecords: vi.fn().mockReturnValue(mockRecords),
      });

      const result = await harness.invoke<{
        ok: boolean;
        data: { totalCost: number; totalRequests: number };
      }>("cost:usage:summary", { skillId: "polish" });

      expect(result.ok).toBe(true);
      expect(result.data.totalCost).toBe(0.01);
      expect(result.data.totalRequests).toBe(1);
    });
  });
});
