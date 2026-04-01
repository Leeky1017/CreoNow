/**
 * CostTracker P2 测试 — 费用追踪
 * Spec: openspec/specs/ai-service/spec.md — P2: Cost Tracker
 *
 * TDD Red Phase：测试应编译但因实现不存在而失败。
 * 验证费用计算、会话累计、预算告警/硬停、CJK token 系数、
 * 模型定价表、maxRecords 淘汰、多轮聚合、dispose 清理。
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import type {
  CostTracker,
  RequestCost,
  BudgetAlert,
  BudgetPolicy,
  ModelPricingTable,
  ModelPricing,
} from "../costTracker";
import { createCostTracker } from "../costTracker";

// ─── helpers ────────────────────────────────────────────────────────

/** Standard TokenUsage from P1 streaming */
interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
}

/** Create a standard GPT-4o pricing entry */
function makeGpt4oPricing(): ModelPricing {
  return {
    modelId: "gpt-4o",
    displayName: "GPT-4o",
    inputPricePer1K: 0.0025,
    outputPricePer1K: 0.01,
    effectiveDate: "2024-01-01T00:00:00Z",
  };
}

/** Create a Claude pricing entry */
function makeClaudePricing(): ModelPricing {
  return {
    modelId: "claude-sonnet-4-20250514",
    displayName: "Claude Sonnet 4",
    inputPricePer1K: 0.003,
    outputPricePer1K: 0.015,
    cachedInputPricePer1K: 0.0015,
    effectiveDate: "2024-01-01T00:00:00Z",
  };
}

/** Create a standard pricing table */
function makePricingTable(
  extra: Record<string, ModelPricing> = {},
): ModelPricingTable {
  return {
    prices: {
      "gpt-4o": makeGpt4oPricing(),
      "claude-sonnet-4-20250514": makeClaudePricing(),
      ...extra,
    },
    currency: "USD",
    lastUpdated: new Date().toISOString(),
  };
}

/** Create a standard budget policy */
function makeBudgetPolicy(
  overrides: Partial<BudgetPolicy> = {},
): BudgetPolicy {
  return {
    warningThreshold: 1.0,
    hardStopLimit: 5.0,
    enabled: true,
    ...overrides,
  };
}

/** Mock estimateTokens function (CJK-aware) */
function mockEstimateTokens(text: string): number {
  const cjkChars = [...text].filter((c) =>
    /[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u30ff\uac00-\ud7af]/.test(c),
  ).length;
  const nonCjkBytes = new TextEncoder().encode(text).length - cjkChars * 3;
  return Math.ceil(cjkChars * 1.5 + nonCjkBytes / 4);
}

// ─── tests ──────────────────────────────────────────────────────────

describe("CostTracker — 费用追踪", () => {
  let tracker: CostTracker;

  beforeEach(() => {
    tracker = createCostTracker({
      pricingTable: makePricingTable(),
      budgetPolicy: makeBudgetPolicy(),
      estimateTokens: mockEstimateTokens,
    });
  });

  afterEach(() => {
    tracker.dispose();
    vi.restoreAllMocks();
  });

  // ── recordUsage ─────────────────────────────────────────────────

  describe("recordUsage — 记录费用", () => {
    it("正确计算 GPT-4o 的费用", () => {
      const usage: TokenUsage = { promptTokens: 2000, completionTokens: 500 };

      const cost = tracker.recordUsage(usage, "gpt-4o", "req-001", "polish");

      // (2000/1000 * 0.0025) + (500/1000 * 0.01) = 0.005 + 0.005 = 0.01
      expect(cost.cost).toBeCloseTo(0.01, 5);
      expect(cost.requestId).toBe("req-001");
      expect(cost.modelId).toBe("gpt-4o");
      expect(cost.inputTokens).toBe(2000);
      expect(cost.outputTokens).toBe(500);
      expect(cost.skillId).toBe("polish");
    });

    it("正确计算 Claude 的费用", () => {
      const usage: TokenUsage = { promptTokens: 1000, completionTokens: 200 };

      const cost = tracker.recordUsage(
        usage,
        "claude-sonnet-4-20250514",
        "req-002",
        "continue",
      );

      // (1000/1000 * 0.003) + (200/1000 * 0.015) = 0.003 + 0.003 = 0.006
      expect(cost.cost).toBeCloseTo(0.006, 5);
    });

    it("缓存 tokens 使用 cachedInputPricePer1K", () => {
      const usage: TokenUsage = { promptTokens: 1000, completionTokens: 200 };

      const cost = tracker.recordUsage(
        usage,
        "claude-sonnet-4-20250514",
        "req-003",
        "polish",
        500, // 500 cached tokens
      );

      // Non-cached input: (1000-500)/1000 * 0.003 = 0.0015
      // Cached input: 500/1000 * 0.0015 = 0.00075
      // Output: 200/1000 * 0.015 = 0.003
      // Total: 0.0015 + 0.00075 + 0.003 = 0.00525
      expect(cost.cost).toBeCloseTo(0.00525, 5);
      expect(cost.cachedTokens).toBe(500);
    });

    it("recordUsage 返回的 RequestCost 包含 timestamp", () => {
      const usage: TokenUsage = { promptTokens: 100, completionTokens: 50 };

      const cost = tracker.recordUsage(usage, "gpt-4o", "req-004", "polish");

      expect(cost.timestamp).toEqual(expect.any(Number));
      expect(cost.timestamp).toBeGreaterThan(0);
    });
  });

  // ── getSessionCost ──────────────────────────────────────────────

  describe("getSessionCost — 会话累计费用", () => {
    it("多次 recordUsage 后累计 totalCost", () => {
      tracker.recordUsage(
        { promptTokens: 2000, completionTokens: 500 },
        "gpt-4o",
        "req-001",
        "polish",
      );
      tracker.recordUsage(
        { promptTokens: 1000, completionTokens: 200 },
        "gpt-4o",
        "req-002",
        "continue",
      );

      const session = tracker.getSessionCost();

      // req-001: 0.01, req-002: (1000/1000*0.0025)+(200/1000*0.01) = 0.0025+0.002 = 0.0045
      expect(session.totalCost).toBeCloseTo(0.0145, 5);
      expect(session.totalRequests).toBe(2);
    });

    it("累计 totalInputTokens 和 totalOutputTokens", () => {
      tracker.recordUsage(
        { promptTokens: 100, completionTokens: 50 },
        "gpt-4o",
        "req-001",
        "polish",
      );
      tracker.recordUsage(
        { promptTokens: 200, completionTokens: 100 },
        "gpt-4o",
        "req-002",
        "polish",
      );

      const session = tracker.getSessionCost();

      expect(session.totalInputTokens).toBe(300);
      expect(session.totalOutputTokens).toBe(150);
    });

    it("costByModel 按模型分组统计", () => {
      tracker.recordUsage(
        { promptTokens: 1000, completionTokens: 200 },
        "gpt-4o",
        "req-001",
        "polish",
      );
      tracker.recordUsage(
        { promptTokens: 1000, completionTokens: 200 },
        "claude-sonnet-4-20250514",
        "req-002",
        "continue",
      );

      const session = tracker.getSessionCost();

      expect(session.costByModel["gpt-4o"]).toBeDefined();
      expect(session.costByModel["gpt-4o"].requests).toBe(1);
      expect(session.costByModel["claude-sonnet-4-20250514"]).toBeDefined();
      expect(session.costByModel["claude-sonnet-4-20250514"].requests).toBe(1);
    });

    it("costBySkill 按技能分组统计", () => {
      tracker.recordUsage(
        { promptTokens: 1000, completionTokens: 200 },
        "gpt-4o",
        "req-001",
        "polish",
      );
      tracker.recordUsage(
        { promptTokens: 1000, completionTokens: 200 },
        "gpt-4o",
        "req-002",
        "continue",
      );

      const session = tracker.getSessionCost();

      expect(session.costBySkill["polish"]).toBeDefined();
      expect(session.costBySkill["polish"].requests).toBe(1);
      expect(session.costBySkill["continue"]).not.toBeUndefined();
      expect(session.costBySkill["continue"].requests).toBe(1);
      expect(session.costBySkill["continue"].cost).toBeGreaterThan(0);
    });

    it("初始 getSessionCost 为零", () => {
      const session = tracker.getSessionCost();

      expect(session.totalCost).toBe(0);
      expect(session.totalRequests).toBe(0);
      expect(session.totalInputTokens).toBe(0);
      expect(session.totalOutputTokens).toBe(0);
    });
  });

  // ── getRequestCost ──────────────────────────────────────────────

  describe("getRequestCost — 单次请求费用", () => {
    it("按 requestId 查找费用记录", () => {
      tracker.recordUsage(
        { promptTokens: 1000, completionTokens: 200 },
        "gpt-4o",
        "req-001",
        "polish",
      );

      const cost = tracker.getRequestCost("req-001");

      expect(cost).not.toBeNull();
      expect(cost!.requestId).toBe("req-001");
      expect(cost!.cost).toBeGreaterThan(0);
    });

    it("不存在的 requestId → 返回 null", () => {
      expect(tracker.getRequestCost("non-existent")).toBeNull();
    });
  });

  // ── checkBudget ─────────────────────────────────────────────────

  describe("checkBudget — 预算检查", () => {
    it("费用低于 warning 阈值 → 返回 null", () => {
      tracker.recordUsage(
        { promptTokens: 100, completionTokens: 50 },
        "gpt-4o",
        "req-001",
        "polish",
      );

      expect(tracker.checkBudget()).toBeNull();
    });

    it("费用达到 warning 阈值 → 返回 warning alert", () => {
      // Fill up to warningThreshold ($1.00)
      // Each gpt-4o call: (10000/1000*0.0025)+(5000/1000*0.01) = 0.025+0.05 = 0.075
      // Need ~14 calls to reach $1.05
      for (let i = 0; i < 14; i++) {
        tracker.recordUsage(
          { promptTokens: 10000, completionTokens: 5000 },
          "gpt-4o",
          `req-warn-${i}`,
          "polish",
        );
      }

      const alert = tracker.checkBudget();

      expect(alert).not.toBeNull();
      expect(alert!.kind).toBe("warning");
      expect(alert!.currentCost).toBeGreaterThanOrEqual(1.0);
    });

    it("费用 >= hardStopLimit → 返回 hard-stop alert", () => {
      // Use a small hard-stop for testing
      const smallBudgetTracker = createCostTracker({
        pricingTable: makePricingTable(),
        budgetPolicy: makeBudgetPolicy({ hardStopLimit: 0.05 }),
        estimateTokens: mockEstimateTokens,
      });

      smallBudgetTracker.recordUsage(
        { promptTokens: 10000, completionTokens: 5000 },
        "gpt-4o",
        "req-001",
        "polish",
      );

      const alert = smallBudgetTracker.checkBudget();

      expect(alert).not.toBeNull();
      expect(alert!.kind).toBe("hard-stop");
      expect(alert!.currentCost).toBeGreaterThanOrEqual(0.05);

      smallBudgetTracker.dispose();
    });

    it("恰好等于 hardStopLimit → 触发 hard-stop（>= 触发）", () => {
      // Create tracker with exact limit
      const exactTracker = createCostTracker({
        pricingTable: makePricingTable(),
        budgetPolicy: makeBudgetPolicy({ hardStopLimit: 0.01, warningThreshold: 0.005 }),
        estimateTokens: mockEstimateTokens,
      });

      // This should cost exactly $0.01
      exactTracker.recordUsage(
        { promptTokens: 2000, completionTokens: 500 },
        "gpt-4o",
        "req-001",
        "polish",
      );

      const alert = exactTracker.checkBudget();

      expect(alert).not.toBeNull();
      expect(alert!.kind).toBe("hard-stop");

      exactTracker.dispose();
    });

    it("预算未启用时 → 始终返回 null", () => {
      const noBudgetTracker = createCostTracker({
        pricingTable: makePricingTable(),
        budgetPolicy: makeBudgetPolicy({ enabled: false }),
        estimateTokens: mockEstimateTokens,
      });

      noBudgetTracker.recordUsage(
        { promptTokens: 100000, completionTokens: 50000 },
        "gpt-4o",
        "req-001",
        "polish",
      );

      expect(noBudgetTracker.checkBudget()).toBeNull();

      noBudgetTracker.dispose();
    });
  });

  // ── onBudgetAlert ───────────────────────────────────────────────

  describe("onBudgetAlert — 预算告警回调", () => {
    it("费用超过 warning 阈值时触发回调", () => {
      const callback = vi.fn();
      const unsubscribe = tracker.onBudgetAlert(callback);

      // Push cost past warning threshold ($1.00)
      for (let i = 0; i < 14; i++) {
        tracker.recordUsage(
          { promptTokens: 10000, completionTokens: 5000 },
          "gpt-4o",
          `req-${i}`,
          "polish",
        );
      }

      tracker.checkBudget(); // Trigger alert check

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ kind: "warning" }),
      );

      unsubscribe();
    });

    it("取消订阅后不再触发回调", () => {
      const callback = vi.fn();
      const unsubscribe = tracker.onBudgetAlert(callback);

      unsubscribe();

      // Push cost past threshold
      for (let i = 0; i < 14; i++) {
        tracker.recordUsage(
          { promptTokens: 10000, completionTokens: 5000 },
          "gpt-4o",
          `req-${i}`,
          "polish",
        );
      }

      tracker.checkBudget();

      expect(callback).not.toHaveBeenCalled();
    });

    it("多个回调同时注册", () => {
      const cb1 = vi.fn();
      const cb2 = vi.fn();

      // Use a single tracker with low warning threshold
      const singleTracker = createCostTracker({
        pricingTable: makePricingTable(),
        budgetPolicy: makeBudgetPolicy({ warningThreshold: 0.001, hardStopLimit: 10 }),
        estimateTokens: mockEstimateTokens,
      });

      singleTracker.onBudgetAlert(cb1);
      singleTracker.onBudgetAlert(cb2);

      // Push past threshold
      singleTracker.recordUsage(
        { promptTokens: 1000, completionTokens: 500 },
        "gpt-4o",
        "req-001",
        "polish",
      );

      singleTracker.checkBudget();

      // Both callbacks should fire on the same tracker
      expect(cb1).toHaveBeenCalled();
      expect(cb2).toHaveBeenCalled();

      singleTracker.dispose();
    });
  });

  // ── 模型不在定价表中 ─────────────────────────────────────────

  describe("Unknown Model — 模型不在定价表中", () => {
    it("未知模型 → cost=0 + warning 字段", () => {
      const cost = tracker.recordUsage(
        { promptTokens: 1000, completionTokens: 500 },
        "custom-model-v1",
        "req-001",
        "polish",
      );

      expect(cost.cost).toBe(0);
      expect(cost.warning).toBe("COST_MODEL_NOT_FOUND");
    });

    it("未知模型不抛出异常", () => {
      expect(() =>
        tracker.recordUsage(
          { promptTokens: 1000, completionTokens: 500 },
          "totally-unknown-model",
          "req-001",
          "polish",
        ),
      ).not.toThrow();
    });
  });

  // ── CJK Token 系数 ────────────────────────────────────────────

  describe("CJK Token Coefficient — CJK 费用预估", () => {
    it("estimateCost 使用 CJK 感知的 token 估算", () => {
      // 1000 CJK chars → ~1500 tokens (1000 * 1.5)
      const cjkText = "中".repeat(1000);

      const estimated = tracker.estimateCost(cjkText, "gpt-4o", 500);

      // Input: 1500/1000 * 0.0025 = 0.00375
      // Output: 500/1000 * 0.01 = 0.005
      // Total: 0.00875
      expect(estimated).toBeCloseTo(0.00875, 3);
    });

    it("estimateCost 纯 ASCII 文本", () => {
      const asciiText = "hello world test input text here";

      const estimated = tracker.estimateCost(asciiText, "gpt-4o", 200);

      // Token count from mockEstimateTokens
      expect(estimated).toBeGreaterThan(0);
    });

    it("estimateCost 未知模型 → 返回 0", () => {
      const estimated = tracker.estimateCost("test", "unknown-model", 100);

      expect(estimated).toBe(0);
    });
  });

  // ── resetSession ──────────────────────────────────────────────

  describe("resetSession — 重置会话", () => {
    it("重置后 totalCost 归零", () => {
      tracker.recordUsage(
        { promptTokens: 1000, completionTokens: 500 },
        "gpt-4o",
        "req-001",
        "polish",
      );

      expect(tracker.getSessionCost().totalCost).toBeGreaterThan(0);

      tracker.resetSession();

      expect(tracker.getSessionCost().totalCost).toBe(0);
      expect(tracker.getSessionCost().totalRequests).toBe(0);
    });

    it("重置后 getRequestCost 返回 null", () => {
      tracker.recordUsage(
        { promptTokens: 1000, completionTokens: 500 },
        "gpt-4o",
        "req-001",
        "polish",
      );

      tracker.resetSession();

      expect(tracker.getRequestCost("req-001")).toBeNull();
    });

    it("重置后 checkBudget 返回 null", () => {
      const smallTracker = createCostTracker({
        pricingTable: makePricingTable(),
        budgetPolicy: makeBudgetPolicy({ hardStopLimit: 0.001 }),
        estimateTokens: mockEstimateTokens,
      });

      smallTracker.recordUsage(
        { promptTokens: 1000, completionTokens: 500 },
        "gpt-4o",
        "req-001",
        "polish",
      );

      smallTracker.resetSession();

      expect(smallTracker.checkBudget()).toBeNull();

      smallTracker.dispose();
    });
  });

  // ── dispose ───────────────────────────────────────────────────

  describe("dispose — 清理", () => {
    it("dispose 后同一实例的回调不再触发", () => {
      const callback = vi.fn();
      tracker.onBudgetAlert(callback);

      // Lower threshold so next recordUsage would trigger if not disposed
      tracker.updateBudgetPolicy(
        makeBudgetPolicy({ warningThreshold: 0.001, hardStopLimit: 10 }),
      );

      tracker.dispose();

      // Use the SAME tracker after dispose
      tracker.recordUsage(
        { promptTokens: 10000, completionTokens: 5000 },
        "gpt-4o",
        "req-post-dispose",
        "polish",
      );

      tracker.checkBudget();

      // Previously registered callback should NOT fire on the disposed tracker
      expect(callback).not.toHaveBeenCalled();
    });
  });

  // ── maxRecords 淘汰 ───────────────────────────────────────────

  describe("maxRecords — 记录上限淘汰", () => {
    it("超过 500 条记录后，最早的记录被淘汰", () => {
      for (let i = 0; i < 510; i++) {
        tracker.recordUsage(
          { promptTokens: 10, completionTokens: 5 },
          "gpt-4o",
          `req-${String(i).padStart(4, "0")}`,
          "polish",
        );
      }

      // First record should be evicted
      expect(tracker.getRequestCost("req-0000")).toBeNull();
      // Recent records should exist
      expect(tracker.getRequestCost("req-0509")).not.toBeNull();
    });

    it("累计值不受淘汰影响", () => {
      for (let i = 0; i < 510; i++) {
        tracker.recordUsage(
          { promptTokens: 10, completionTokens: 5 },
          "gpt-4o",
          `req-${i}`,
          "polish",
        );
      }

      const session = tracker.getSessionCost();

      // Total should reflect ALL 510 records, not just the retained ones
      expect(session.totalRequests).toBe(510);
      expect(session.totalInputTokens).toBe(5100);
      expect(session.totalOutputTokens).toBe(2550);
    });
  });

  // ── 多轮 AI 用量聚合 ──────────────────────────────────────────

  describe("Multi-Round Aggregation — Agentic Loop 聚合", () => {
    it("同一 requestId 多次 recordUsage → 费用累加", () => {
      // Round 1
      tracker.recordUsage(
        { promptTokens: 1000, completionTokens: 200 },
        "gpt-4o",
        "req-agentic-001",
        "continue",
      );

      // Round 2 (same requestId)
      tracker.recordUsage(
        { promptTokens: 1500, completionTokens: 300 },
        "gpt-4o",
        "req-agentic-001",
        "continue",
      );

      const cost = tracker.getRequestCost("req-agentic-001");

      expect(cost).not.toBeNull();
      // Round 1: (1000/1000*0.0025)+(200/1000*0.01) = 0.0025+0.002 = 0.0045
      // Round 2: (1500/1000*0.0025)+(300/1000*0.01) = 0.00375+0.003 = 0.00675
      // Total: 0.01125
      expect(cost!.cost).toBeCloseTo(0.01125, 5);
      expect(cost!.inputTokens).toBe(2500);
      expect(cost!.outputTokens).toBe(500);
    });

    it("同一 requestId 多轮不重复计入 totalRequests", () => {
      tracker.recordUsage(
        { promptTokens: 100, completionTokens: 50 },
        "gpt-4o",
        "req-agentic",
        "continue",
      );
      tracker.recordUsage(
        { promptTokens: 100, completionTokens: 50 },
        "gpt-4o",
        "req-agentic",
        "continue",
      );

      const session = tracker.getSessionCost();

      // Same requestId → should count as 1 request, not 2
      expect(session.totalRequests).toBe(1);
    });
  });

  // ── updatePricingTable ────────────────────────────────────────

  describe("updatePricingTable — 更新定价表", () => {
    it("更新后使用新价格", () => {
      const newTable = makePricingTable({
        "gpt-4o": {
          modelId: "gpt-4o",
          displayName: "GPT-4o (new pricing)",
          inputPricePer1K: 0.005, // doubled
          outputPricePer1K: 0.02,
          effectiveDate: "2025-01-01T00:00:00Z",
        },
      });

      tracker.updatePricingTable(newTable);

      const cost = tracker.recordUsage(
        { promptTokens: 1000, completionTokens: 500 },
        "gpt-4o",
        "req-new",
        "polish",
      );

      // (1000/1000 * 0.005) + (500/1000 * 0.02) = 0.005 + 0.01 = 0.015
      expect(cost.cost).toBeCloseTo(0.015, 5);
    });
  });

  // ── updateBudgetPolicy ────────────────────────────────────────

  describe("updateBudgetPolicy — 更新预算策略", () => {
    it("更新后使用新阈值", () => {
      tracker.recordUsage(
        { promptTokens: 2000, completionTokens: 500 },
        "gpt-4o",
        "req-001",
        "polish",
      );

      // With default policy ($1.0 warning), should be null
      expect(tracker.checkBudget()).toBeNull();

      // Lower threshold
      tracker.updateBudgetPolicy(
        makeBudgetPolicy({ warningThreshold: 0.005, hardStopLimit: 0.05 }),
      );

      const alert = tracker.checkBudget();
      expect(alert).not.toBeNull();
      expect(alert!.kind).toBe("warning");
    });
  });

  // ── IPC 通道类型 ──────────────────────────────────────────────

  describe("IPC Channel Types — 费用数据通道", () => {
    it("SessionCostSummary 包含 sessionStartedAt", () => {
      const session = tracker.getSessionCost();

      expect(session.sessionStartedAt).toEqual(expect.any(Number));
    });

    it("BudgetAlert 包含 message 和 timestamp", () => {
      const smallTracker = createCostTracker({
        pricingTable: makePricingTable(),
        budgetPolicy: makeBudgetPolicy({ warningThreshold: 0.001 }),
        estimateTokens: mockEstimateTokens,
      });

      smallTracker.recordUsage(
        { promptTokens: 1000, completionTokens: 500 },
        "gpt-4o",
        "req-001",
        "polish",
      );

      const alert = smallTracker.checkBudget();

      expect(alert).not.toBeNull();
      expect(alert!.message).toEqual(expect.any(String));
      expect(alert!.message.length).toBeGreaterThan(0);
      expect(alert!.timestamp).toEqual(expect.any(Number));

      smallTracker.dispose();
    });
  });

  // ── COST_PRICING_STALE ────────────────────────────────────────

  describe("Pricing Stale — 定价表过期警告", () => {
    it("lastUpdated 超过 31 天 → 产生 COST_PRICING_STALE 警告", () => {
      const staleDate = new Date();
      staleDate.setDate(staleDate.getDate() - 32);

      const staleTracker = createCostTracker({
        pricingTable: makePricingTable(),
        budgetPolicy: makeBudgetPolicy(),
        estimateTokens: mockEstimateTokens,
      });

      // Update with stale pricing table
      staleTracker.updatePricingTable({
        ...makePricingTable(),
        lastUpdated: staleDate.toISOString(),
      });

      const cost = staleTracker.recordUsage(
        { promptTokens: 1000, completionTokens: 500 },
        "gpt-4o",
        "req-stale",
        "polish",
      );

      expect(cost.warning).toBe("COST_PRICING_STALE");

      staleTracker.dispose();
    });
  });

  // ── COST_BUDGET_EXCEEDED ──────────────────────────────────────

  describe("Budget Exceeded — 硬停后阻断", () => {
    it("超过 hardStop 后 recordUsage/checkBudget 返回阻断信号", () => {
      const strictTracker = createCostTracker({
        pricingTable: makePricingTable(),
        budgetPolicy: makeBudgetPolicy({ warningThreshold: 0.001, hardStopLimit: 0.01 }),
        estimateTokens: mockEstimateTokens,
      });

      // Push past hard-stop ($0.01)
      strictTracker.recordUsage(
        { promptTokens: 2000, completionTokens: 500 },
        "gpt-4o",
        "req-over",
        "polish",
      );

      const alert = strictTracker.checkBudget();
      expect(alert).not.toBeNull();
      expect(alert!.kind).toBe("hard-stop");

      // Further usage after hard-stop: verify it doesn't throw and returns a cost record
      const blockedCost = strictTracker.recordUsage(
        { promptTokens: 100, completionTokens: 50 },
        "gpt-4o",
        "req-blocked",
        "polish",
      );
      expect(blockedCost).toBeDefined();
      expect(blockedCost.cost).toBe(0);

      // The blocked request should indicate budget exceeded
      const blockedAlert = strictTracker.checkBudget();
      expect(blockedAlert).not.toBeNull();
      expect(blockedAlert!.kind).toBe("hard-stop");

      strictTracker.dispose();
    });
  });

  // ── Concurrent recordUsage ────────────────────────────────────

  describe("Concurrent Usage — 并发记录", () => {
    it("N 个并发 recordUsage 后 totalCost 正确求和", () => {
      const concurrentTracker = createCostTracker({
        pricingTable: makePricingTable(),
        budgetPolicy: makeBudgetPolicy(),
        estimateTokens: mockEstimateTokens,
      });

      const N = 10;
      const costs: RequestCost[] = [];

      // Fire N concurrent recordUsage calls (some with same requestId)
      for (let i = 0; i < N; i++) {
        const cost = concurrentTracker.recordUsage(
          { promptTokens: 100, completionTokens: 50 },
          "gpt-4o",
          `req-conc-${i}`,
          "polish",
        );
        costs.push(cost);
      }

      const expectedTotal = costs.reduce((sum, c) => sum + c.cost, 0);
      const session = concurrentTracker.getSessionCost();

      expect(session.totalCost).toBeCloseTo(expectedTotal, 5);
      expect(session.totalRequests).toBe(N);

      concurrentTracker.dispose();
    });
  });

  // ── Zero/Negative Tokens ──────────────────────────────────────

  describe("Zero/Negative Tokens — 边界 token 值", () => {
    it("promptTokens=0, completionTokens=0 → cost=0", () => {
      const cost = tracker.recordUsage(
        { promptTokens: 0, completionTokens: 0 },
        "gpt-4o",
        "req-zero",
        "polish",
      );

      expect(cost.cost).toBe(0);
    });

    it("负数 tokens → clamp 到 0，cost=0", () => {
      const cost = tracker.recordUsage(
        { promptTokens: -5, completionTokens: -10 },
        "gpt-4o",
        "req-negative",
        "polish",
      );

      expect(cost.cost).toBe(0);
      expect(cost.inputTokens).toBeGreaterThanOrEqual(0);
      expect(cost.outputTokens).toBeGreaterThanOrEqual(0);
    });
  });

  // ── CostRecordedEvent / BudgetExceededEvent ───────────────────

  describe("Cost Events — 费用事件", () => {
    // TODO: If CostTracker produces CostRecordedEvent and BudgetExceededEvent
    // at the orchestrator level, those tests belong in the orchestrator test file.
    // Below tests verify event-like behavior at the tracker level.

    it("onCostRecorded 回调在 recordUsage 后触发", () => {
      const eventTracker = createCostTracker({
        pricingTable: makePricingTable(),
        budgetPolicy: makeBudgetPolicy(),
        estimateTokens: mockEstimateTokens,
      });

      const recordedEvents: RequestCost[] = [];
      eventTracker.onCostRecorded((cost: RequestCost) => recordedEvents.push(cost));

      eventTracker.recordUsage(
        { promptTokens: 1000, completionTokens: 200 },
        "gpt-4o",
        "req-event-001",
        "polish",
      );

      expect(recordedEvents).toHaveLength(1);
      expect(recordedEvents[0].requestId).toBe("req-event-001");
      expect(recordedEvents[0].cost).toBeGreaterThan(0);

      eventTracker.dispose();
    });

    it("onBudgetExceeded 回调在超过 hardStop 时触发", () => {
      const eventTracker = createCostTracker({
        pricingTable: makePricingTable(),
        budgetPolicy: makeBudgetPolicy({ warningThreshold: 0.001, hardStopLimit: 0.005 }),
        estimateTokens: mockEstimateTokens,
      });

      const exceededEvents: BudgetAlert[] = [];
      eventTracker.onBudgetAlert((alert: BudgetAlert) => exceededEvents.push(alert));

      eventTracker.recordUsage(
        { promptTokens: 2000, completionTokens: 500 },
        "gpt-4o",
        "req-exceed",
        "polish",
      );

      eventTracker.checkBudget();

      expect(exceededEvents.length).toBeGreaterThanOrEqual(1);
      expect(exceededEvents[0].kind).toBe("hard-stop");

      eventTracker.dispose();
    });
  });
});
