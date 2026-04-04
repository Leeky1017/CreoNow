/**
 * CostTracker — 费用追踪
 *
 * Per-model pricing, CJK coefficient (1.5x), warning/hard-stop thresholds,
 * same-requestId aggregation, COST_MODEL_NOT_FOUND returns cost=0+warning,
 * COST_PRICING_STALE, maxRecords eviction (500), budget alerts.
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface ModelPricing {
  modelId: string;
  displayName: string;
  inputPricePer1K: number;
  outputPricePer1K: number;
  cachedInputPricePer1K?: number;
  effectiveDate: string;
}

export interface ModelPricingTable {
  prices: Record<string, ModelPricing>;
  currency: 'USD';
  lastUpdated: string;
}

export interface BudgetPolicy {
  warningThreshold: number;
  hardStopLimit: number;
  enabled: boolean;
}

export interface RequestCost {
  requestId: string;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  cost: number;
  skillId: string;
  timestamp: number;
  warning?: string;
}

export interface SessionCostSummary {
  totalCost: number;
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCachedTokens: number;
  costByModel: Record<string, { cost: number; requests: number }>;
  costBySkill: Record<string, { cost: number; requests: number }>;
  sessionStartedAt: number;
}

export interface BudgetAlert {
  kind: "warning" | "hard-stop";
  currentCost: number;
  threshold: number;
  message: string;
  timestamp: number;
}

interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
}

export interface CostTracker {
  recordUsage(
    usage: TokenUsage,
    modelId: string,
    requestId: string,
    skillId: string,
    cachedTokens?: number,
  ): RequestCost;

  getSessionCost(): SessionCostSummary;
  getRequestCost(requestId: string): RequestCost | null;
  listRecords(filter?: {
    skillId?: string;
    since?: number;
    limit?: number;
  }): ReadonlyArray<RequestCost>;
  checkBudget(): BudgetAlert | null;
  estimateCost(text: string, modelId: string, expectedOutputTokens: number): number;
  onBudgetAlert(callback: (alert: BudgetAlert) => void): () => void;
  onCostRecorded(callback: (cost: RequestCost) => void): () => void;
  updatePricingTable(table: ModelPricingTable): void;
  updateBudgetPolicy(policy: BudgetPolicy): void;
  resetSession(): void;
  dispose(): void;
}

interface CostTrackerConfig {
  pricingTable: ModelPricingTable;
  budgetPolicy: BudgetPolicy;
  estimateTokens: (text: string) => number;
}

// ─── Constants ──────────────────────────────────────────────────────

const MAX_RECORDS = 500;
const STALE_DAYS = 30;

// ─── Implementation ─────────────────────────────────────────────────

export function createCostTracker(config: CostTrackerConfig): CostTracker {
  let pricingTable = config.pricingTable;
  let budgetPolicy = config.budgetPolicy;
  const estimateTokensFn = config.estimateTokens;

  // Session state
  let sessionStartedAt = Date.now();
  let totalCost = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCachedTokens = 0;
  let totalRequestsCount = 0;
  const costByModel: Record<string, { cost: number; requests: number }> = {};
  const costBySkill: Record<string, { cost: number; requests: number }> = {};

  // Ordered record keys for eviction
  const recordOrder: string[] = [];
  const records = new Map<string, RequestCost>();
  // Track unique request IDs for totalRequests
  const uniqueRequestIds = new Set<string>();

  // Callbacks
  let budgetAlertCallbacks: Array<(alert: BudgetAlert) => void> = [];
  let costRecordedCallbacks: Array<(cost: RequestCost) => void> = [];
  let disposed = false;

  // Hard-stop flag
  let hardStopped = false;

  function isPricingStale(): boolean {
    const lastUpdated = new Date(pricingTable.lastUpdated).getTime();
    const now = Date.now();
    return now - lastUpdated > STALE_DAYS * 24 * 60 * 60 * 1000;
  }

  function computeCost(
    inputTokens: number,
    outputTokens: number,
    modelId: string,
    cachedTokens?: number,
  ): { cost: number; warning?: string } {
    const pricing = pricingTable.prices[modelId];
    if (!pricing) {
      return { cost: 0, warning: "COST_MODEL_NOT_FOUND" };
    }

    let warning: string | undefined;
    if (isPricingStale()) {
      warning = "COST_PRICING_STALE";
    }

    const safeInput = Math.max(0, inputTokens);
    const safeOutput = Math.max(0, outputTokens);
    const safeCached = Math.max(0, cachedTokens ?? 0);

    let inputCost: number;
    if (safeCached > 0 && pricing.cachedInputPricePer1K !== undefined) {
      const nonCached = Math.max(0, safeInput - safeCached);
      inputCost =
        (nonCached / 1000) * pricing.inputPricePer1K +
        (safeCached / 1000) * pricing.cachedInputPricePer1K;
    } else {
      inputCost = (safeInput / 1000) * pricing.inputPricePer1K;
    }

    const outputCost = (safeOutput / 1000) * pricing.outputPricePer1K;

    return { cost: inputCost + outputCost, warning };
  }

  function evictOldRecords(): void {
    while (recordOrder.length > MAX_RECORDS) {
      const oldestKey = recordOrder.shift()!;
      records.delete(oldestKey);
      uniqueRequestIds.delete(oldestKey);
    }
  }

  const tracker: CostTracker = {
    recordUsage(
      usage: TokenUsage,
      modelId: string,
      requestId: string,
      skillId: string,
      cachedTokens?: number,
    ): RequestCost {
      // If hard-stopped and budget enabled, block further usage
      if (hardStopped && budgetPolicy.enabled && !disposed) {
        const blocked: RequestCost = {
          requestId,
          modelId,
          inputTokens: Math.max(0, usage.promptTokens),
          outputTokens: Math.max(0, usage.completionTokens),
          cachedTokens: cachedTokens ?? 0,
          cost: 0,
          skillId,
          timestamp: Date.now(),
        };
        return blocked;
      }

      const safeInput = Math.max(0, usage.promptTokens);
      const safeOutput = Math.max(0, usage.completionTokens);
      const safeCachedParam = cachedTokens ?? 0;

      const { cost, warning } = computeCost(safeInput, safeOutput, modelId, safeCachedParam);

      const isExisting = records.has(requestId);
      const existing = records.get(requestId);

      const record: RequestCost = {
        requestId,
        modelId,
        inputTokens: isExisting ? existing!.inputTokens + safeInput : safeInput,
        outputTokens: isExisting ? existing!.outputTokens + safeOutput : safeOutput,
        cachedTokens: isExisting ? (existing!.cachedTokens + safeCachedParam) : safeCachedParam,
        cost: isExisting ? existing!.cost + cost : cost,
        skillId,
        timestamp: Date.now(),
        warning,
      };

      records.set(requestId, record);

      if (!isExisting) {
        recordOrder.push(requestId);
        uniqueRequestIds.add(requestId);
        totalRequestsCount++;
      }

      // Update session aggregates
      totalCost += cost;
      totalInputTokens += safeInput;
      totalOutputTokens += safeOutput;
      totalCachedTokens += safeCachedParam;

      // costByModel
      if (!costByModel[modelId]) {
        costByModel[modelId] = { cost: 0, requests: 0 };
      }
      costByModel[modelId].cost += cost;
      if (!isExisting) {
        costByModel[modelId].requests += 1;
      }

      // costBySkill
      if (!costBySkill[skillId]) {
        costBySkill[skillId] = { cost: 0, requests: 0 };
      }
      costBySkill[skillId].cost += cost;
      if (!isExisting) {
        costBySkill[skillId].requests += 1;
      }

      evictOldRecords();

      // Fire cost recorded callbacks
      if (!disposed) {
        for (const cb of costRecordedCallbacks) {
          try {
            cb(record);
          } catch {
            // Callback errors must not propagate to caller
          }
        }
      }

      // Check if hard-stop is now reached
      if (budgetPolicy.enabled && totalCost >= budgetPolicy.hardStopLimit) {
        hardStopped = true;
      }

      return record;
    },

    getSessionCost(): SessionCostSummary {
      const deepCopyByModel: Record<string, { cost: number; requests: number }> = {};
      for (const [k, v] of Object.entries(costByModel)) {
        deepCopyByModel[k] = { cost: v.cost, requests: v.requests };
      }
      const deepCopyBySkill: Record<string, { cost: number; requests: number }> = {};
      for (const [k, v] of Object.entries(costBySkill)) {
        deepCopyBySkill[k] = { cost: v.cost, requests: v.requests };
      }
      return {
        totalCost,
        totalRequests: totalRequestsCount,
        totalInputTokens,
        totalOutputTokens,
        totalCachedTokens,
        costByModel: deepCopyByModel,
        costBySkill: deepCopyBySkill,
        sessionStartedAt,
      };
    },

    getRequestCost(requestId: string): RequestCost | null {
      return records.get(requestId) ?? null;
    },

    listRecords(filter?: {
      skillId?: string;
      since?: number;
      limit?: number;
    }): ReadonlyArray<RequestCost> {
      let result = Array.from(records.values());

      if (filter?.skillId) {
        result = result.filter((r) => r.skillId === filter.skillId);
      }
      if (filter?.since !== undefined) {
        result = result.filter((r) => r.timestamp >= filter.since!);
      }

      // Newest first
      result.sort((a, b) => b.timestamp - a.timestamp);

      if (filter?.limit !== undefined && filter.limit > 0) {
        result = result.slice(0, filter.limit);
      }

      return result;
    },

    checkBudget(): BudgetAlert | null {
      if (!budgetPolicy.enabled || disposed) return null;

      if (totalCost >= budgetPolicy.hardStopLimit) {
        const alert: BudgetAlert = {
          kind: "hard-stop",
          currentCost: totalCost,
          threshold: budgetPolicy.hardStopLimit,
          message: `Budget hard-stop reached: $${totalCost.toFixed(4)} >= $${budgetPolicy.hardStopLimit.toFixed(4)}`,
          timestamp: Date.now(),
        };
        for (const cb of budgetAlertCallbacks) {
          try {
            cb(alert);
          } catch {
            // Callback errors must not propagate
          }
        }
        return alert;
      }

      if (totalCost >= budgetPolicy.warningThreshold) {
        const alert: BudgetAlert = {
          kind: "warning",
          currentCost: totalCost,
          threshold: budgetPolicy.warningThreshold,
          message: `Budget warning: $${totalCost.toFixed(4)} >= $${budgetPolicy.warningThreshold.toFixed(4)}`,
          timestamp: Date.now(),
        };
        for (const cb of budgetAlertCallbacks) {
          try {
            cb(alert);
          } catch {
            // Callback errors must not propagate
          }
        }
        return alert;
      }

      return null;
    },

    estimateCost(text: string, modelId: string, expectedOutputTokens: number): number {
      const pricing = pricingTable.prices[modelId];
      if (!pricing) return 0;

      const inputTokens = estimateTokensFn(text);
      const inputCost = (inputTokens / 1000) * pricing.inputPricePer1K;
      const outputCost = (expectedOutputTokens / 1000) * pricing.outputPricePer1K;

      return inputCost + outputCost;
    },

    onBudgetAlert(callback: (alert: BudgetAlert) => void): () => void {
      budgetAlertCallbacks.push(callback);
      return () => {
        budgetAlertCallbacks = budgetAlertCallbacks.filter((cb) => cb !== callback);
      };
    },

    onCostRecorded(callback: (cost: RequestCost) => void): () => void {
      costRecordedCallbacks.push(callback);
      return () => {
        costRecordedCallbacks = costRecordedCallbacks.filter((cb) => cb !== callback);
      };
    },

    updatePricingTable(table: ModelPricingTable): void {
      pricingTable = table;
    },

    updateBudgetPolicy(policy: BudgetPolicy): void {
      budgetPolicy = policy;
      // Re-check hard-stop flag
      if (budgetPolicy.enabled && totalCost >= budgetPolicy.hardStopLimit) {
        hardStopped = true;
      } else {
        hardStopped = false;
      }
    },

    resetSession(): void {
      totalCost = 0;
      totalInputTokens = 0;
      totalOutputTokens = 0;
      totalCachedTokens = 0;
      totalRequestsCount = 0;
      records.clear();
      recordOrder.length = 0;
      uniqueRequestIds.clear();
      Object.keys(costByModel).forEach((k) => delete costByModel[k]);
      Object.keys(costBySkill).forEach((k) => delete costBySkill[k]);
      sessionStartedAt = Date.now();
      hardStopped = false;
    },

    dispose(): void {
      disposed = true;
      budgetAlertCallbacks = [];
      costRecordedCallbacks = [];
      records.clear();
      recordOrder.length = 0;
      uniqueRequestIds.clear();
      Object.keys(costByModel).forEach((k) => delete costByModel[k]);
      Object.keys(costBySkill).forEach((k) => delete costBySkill[k]);
    },
  };

  return tracker;
}
