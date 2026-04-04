import { describe, it, expect, vi } from "vitest";
import type { IpcMain } from "electron";

import { registerCostIpcHandlers } from "../cost";
import { COST_ALERT_CHANNEL } from "@shared/types/cost";
import type {
  BudgetAlert,
  BudgetPolicy,
  CostTracker,
  ModelPricingTable,
  RequestCost,
  SessionCostSummary,
} from "../../services/ai/costTracker";

type Handler = (event: unknown, payload?: unknown) => Promise<unknown>;
const browserWindows: Array<{ webContents: { send: ReturnType<typeof vi.fn> } }> = [];

vi.mock("electron", () => ({
  BrowserWindow: {
    getAllWindows: () => browserWindows,
  },
}));

function createHarness(trackerOverrides: Partial<CostTracker> = {}) {
  const handlers = new Map<string, Handler>();
  let budgetAlertListener: ((alert: BudgetAlert) => void) | null = null;

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
    getPricingTable: vi.fn().mockReturnValue({
      currency: "USD",
      lastUpdated: "2025-01-01T00:00:00.000Z",
      prices: {},
    }),
    getBudgetPolicy: vi.fn().mockReturnValue({
      warningThreshold: 1,
      hardStopLimit: 5,
      enabled: true,
    }),
    listRecords: vi.fn().mockReturnValue([]),
    checkBudget: vi.fn().mockReturnValue(null),
    estimateCost: vi.fn().mockReturnValue(0),
    onBudgetAlert: vi.fn().mockImplementation((callback: (alert: BudgetAlert) => void) => {
      budgetAlertListener = callback;
      return () => {
        budgetAlertListener = null;
      };
    }),
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
    emitBudgetAlert: (alert: BudgetAlert) => budgetAlertListener?.(alert),
  };
}

describe("cost IPC handlers", () => {
  it("budget alert 会推送到 renderer 的 cost:alert channel", async () => {
    browserWindows.length = 0;
    const send = vi.fn();
    browserWindows.push({
      webContents: { send },
    });
    const harness = createHarness();

    harness.emitBudgetAlert({
      kind: "warning",
      currentCost: 1.5,
      threshold: 2,
      message: "Budget warning",
      timestamp: 1_735_000_000_000,
    });

    expect(send).toHaveBeenCalledWith(
      COST_ALERT_CHANNEL,
      expect.objectContaining({
        kind: "warning",
        currentCost: 1.5,
      }),
    );
  });

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

  describe("cost:budget:*", () => {
    it("cost:budget:get 返回当前预算策略", async () => {
      const budget = {
        warningThreshold: 1,
        hardStopLimit: 5,
        enabled: true,
      } satisfies BudgetPolicy;
      const harness = createHarness({
        getBudgetPolicy: vi.fn().mockReturnValue(budget),
      } as never);

      const result = await harness.invoke<{
        ok: boolean;
        data: BudgetPolicy;
      }>("cost:budget:get");

      expect(result.ok).toBe(true);
      expect(result.data).toEqual(budget);
    });

    it("cost:budget:update 校验并更新预算策略", async () => {
      const harness = createHarness({
        getBudgetPolicy: vi.fn().mockReturnValue({
          warningThreshold: 1,
          hardStopLimit: 5,
          enabled: true,
        } satisfies BudgetPolicy),
      } as never);

      const result = await harness.invoke<{ ok: boolean }>("cost:budget:update", {
        warningThreshold: 2,
        hardStopLimit: 6,
        enabled: true,
      });

      expect(result.ok).toBe(true);
      expect(harness.tracker.updateBudgetPolicy).toHaveBeenCalledWith({
        warningThreshold: 2,
        hardStopLimit: 6,
        enabled: true,
      });
    });
  });

  describe("cost:pricing:*", () => {
    it("cost:pricing:get 返回当前定价表", async () => {
      const pricing = {
        currency: "USD",
        lastUpdated: "2025-01-01T00:00:00.000Z",
        prices: {
          "gpt-5.2": {
            modelId: "gpt-5.2",
            displayName: "GPT-5.2",
            inputPricePer1K: 0.0015,
            outputPricePer1K: 0.003,
            effectiveDate: "2025-01-01",
          },
        },
      } satisfies ModelPricingTable;
      const harness = createHarness({
        getPricingTable: vi.fn().mockReturnValue(pricing),
      } as never);

      const result = await harness.invoke<{
        ok: boolean;
        data: ModelPricingTable;
      }>("cost:pricing:get");

      expect(result.ok).toBe(true);
      expect(result.data).toEqual(pricing);
    });

    it("cost:pricing:update 更新定价表", async () => {
      const harness = createHarness({
        getPricingTable: vi.fn().mockReturnValue({
          currency: "USD",
          lastUpdated: "2025-01-01T00:00:00.000Z",
          prices: {},
        } satisfies ModelPricingTable),
      } as never);

      const nextPricing = {
        currency: "USD",
        lastUpdated: "2025-01-02T00:00:00.000Z",
        prices: {
          "claude-3-5-sonnet": {
            modelId: "claude-3-5-sonnet",
            displayName: "Claude 3.5 Sonnet",
            inputPricePer1K: 0.003,
            outputPricePer1K: 0.015,
            effectiveDate: "2025-01-02",
          },
        },
      } satisfies ModelPricingTable;

      const result = await harness.invoke<{ ok: boolean }>(
        "cost:pricing:update",
        nextPricing,
      );

      expect(result.ok).toBe(true);
      expect(harness.tracker.updatePricingTable).toHaveBeenCalledWith(nextPricing);
    });
  });
});
