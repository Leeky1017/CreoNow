import { BrowserWindow, type IpcMain } from "electron";

import type { IpcResponse } from "@shared/types/ipc-generated";
import { COST_ALERT_CHANNEL } from "@shared/types/cost";
import type { Logger } from "../logging/logger";
import type {
  BudgetPolicy,
  CostTracker,
  ModelPricingTable,
  RequestCost,
} from "../services/ai/costTracker";
import { ipcError } from "../services/shared/ipcResult";

interface CostUsageListRequest {
  skillId?: string;
  since?: number;
  limit?: number;
}

interface CostUsageListResponse {
  records: ReadonlyArray<RequestCost>;
  totalCount: number;
}

interface CostUsageSummaryRequest {
  skillId?: string;
  since?: number;
}

interface CostUsageSummaryResponse {
  totalCost: number;
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCachedTokens: number;
  costByModel: Record<string, { cost: number; requests: number }>;
  costBySkill: Record<string, { cost: number; requests: number }>;
  sessionStartedAt: number;
}

function validateBudgetPolicy(payload: unknown): BudgetPolicy | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  const policy = payload as Record<string, unknown>;
  if (
    typeof policy.warningThreshold !== "number" ||
    !Number.isFinite(policy.warningThreshold) ||
    typeof policy.hardStopLimit !== "number" ||
    !Number.isFinite(policy.hardStopLimit) ||
    typeof policy.enabled !== "boolean"
  ) {
    return null;
  }
  return {
    warningThreshold: policy.warningThreshold,
    hardStopLimit: policy.hardStopLimit,
    enabled: policy.enabled,
  };
}

function validatePricingTable(payload: unknown): ModelPricingTable | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  const table = payload as Record<string, unknown>;
  if (table.currency !== "USD" || typeof table.lastUpdated !== "string") {
    return null;
  }
  const prices = table.prices;
  if (!prices || typeof prices !== "object" || Array.isArray(prices)) {
    return null;
  }

  const normalizedPrices: ModelPricingTable["prices"] = {};
  for (const [modelId, rawPricing] of Object.entries(prices)) {
    if (!rawPricing || typeof rawPricing !== "object" || Array.isArray(rawPricing)) {
      return null;
    }
    const pricing = rawPricing as Record<string, unknown>;
    if (
      typeof pricing.displayName !== "string" ||
      typeof pricing.inputPricePer1K !== "number" ||
      !Number.isFinite(pricing.inputPricePer1K) ||
      typeof pricing.outputPricePer1K !== "number" ||
      !Number.isFinite(pricing.outputPricePer1K) ||
      typeof pricing.effectiveDate !== "string"
    ) {
      return null;
    }
    normalizedPrices[modelId] = {
      modelId,
      displayName: pricing.displayName,
      inputPricePer1K: pricing.inputPricePer1K,
      outputPricePer1K: pricing.outputPricePer1K,
      ...(typeof pricing.cachedInputPricePer1K === "number"
        ? { cachedInputPricePer1K: pricing.cachedInputPricePer1K }
        : {}),
      effectiveDate: pricing.effectiveDate,
    };
  }

  return {
    currency: "USD",
    lastUpdated: table.lastUpdated,
    prices: normalizedPrices,
  };
}

export function registerCostIpcHandlers(deps: {
  ipcMain: IpcMain;
  tracker: CostTracker;
  logger: Logger;
}): void {
  deps.tracker.onBudgetAlert((alert) => {
    for (const win of BrowserWindow.getAllWindows()) {
      try {
        win.webContents.send(COST_ALERT_CHANNEL, alert);
      } catch (error) {
        deps.logger.error("cost:alert send failed", {
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }
  });

  deps.ipcMain.handle(
    "cost:usage:list",
    async (
      _event,
      payload: CostUsageListRequest | undefined,
    ): Promise<IpcResponse<CostUsageListResponse>> => {
      try {
        const filter: CostUsageListRequest = {};
        if (payload?.skillId !== undefined) {
          if (typeof payload.skillId !== "string") {
            return ipcError("INVALID_ARGUMENT", "skillId must be a string");
          }
          filter.skillId = payload.skillId;
        }
        if (payload?.since !== undefined) {
          if (typeof payload.since !== "number" || !Number.isFinite(payload.since)) {
            return ipcError("INVALID_ARGUMENT", "since must be a finite number");
          }
          filter.since = payload.since;
        }
        if (payload?.limit !== undefined) {
          if (
            typeof payload.limit !== "number" ||
            !Number.isInteger(payload.limit) ||
            payload.limit < 1
          ) {
            return ipcError("INVALID_ARGUMENT", "limit must be a positive integer");
          }
          filter.limit = payload.limit;
        }

        const records = deps.tracker.listRecords(filter);
        return { ok: true, data: { records, totalCount: records.length } };
      } catch (error) {
        deps.logger.error("cost:usage:list failed", { reason: String(error) });
        return ipcError("INTERNAL", "Failed to list cost records");
      }
    },
  );

  deps.ipcMain.handle(
    "cost:usage:summary",
    async (
      _event,
      payload: CostUsageSummaryRequest | undefined,
    ): Promise<IpcResponse<CostUsageSummaryResponse>> => {
      try {
        const summary = deps.tracker.getSessionCost();
        if (payload?.skillId !== undefined && typeof payload.skillId !== "string") {
          return ipcError("INVALID_ARGUMENT", "skillId must be a string");
        }
        if (
          payload?.since !== undefined &&
          (typeof payload.since !== "number" || !Number.isFinite(payload.since))
        ) {
          return ipcError("INVALID_ARGUMENT", "since must be a finite number");
        }

        if (payload?.skillId !== undefined || payload?.since !== undefined) {
          const records = deps.tracker.listRecords({
            skillId: payload?.skillId,
            since: payload?.since,
          });
          const aggregate: CostUsageSummaryResponse = {
            totalCost: 0,
            totalRequests: records.length,
            totalInputTokens: 0,
            totalOutputTokens: 0,
            totalCachedTokens: 0,
            costByModel: {},
            costBySkill: {},
            sessionStartedAt: summary.sessionStartedAt,
          };

          for (const record of records) {
            aggregate.totalCost += record.cost;
            aggregate.totalInputTokens += record.inputTokens;
            aggregate.totalOutputTokens += record.outputTokens;
            aggregate.totalCachedTokens += record.cachedTokens;
            aggregate.costByModel[record.modelId] ??= { cost: 0, requests: 0 };
            aggregate.costByModel[record.modelId].cost += record.cost;
            aggregate.costByModel[record.modelId].requests += 1;
            aggregate.costBySkill[record.skillId] ??= { cost: 0, requests: 0 };
            aggregate.costBySkill[record.skillId].cost += record.cost;
            aggregate.costBySkill[record.skillId].requests += 1;
          }

          return { ok: true, data: aggregate };
        }

        return { ok: true, data: summary };
      } catch (error) {
        deps.logger.error("cost:usage:summary failed", { reason: String(error) });
        return ipcError("INTERNAL", "Failed to get cost summary");
      }
    },
  );

  deps.ipcMain.handle(
    "cost:budget:get",
    async (): Promise<IpcResponse<BudgetPolicy>> => ({
      ok: true,
      data: deps.tracker.getBudgetPolicy(),
    }),
  );

  deps.ipcMain.handle(
    "cost:budget:update",
    async (_event, payload: unknown): Promise<IpcResponse<BudgetPolicy>> => {
      const policy = validateBudgetPolicy(payload);
      if (!policy) {
        return ipcError("INVALID_ARGUMENT", "Invalid budget policy");
      }
      deps.tracker.updateBudgetPolicy(policy);
      return { ok: true, data: deps.tracker.getBudgetPolicy() };
    },
  );

  deps.ipcMain.handle(
    "cost:pricing:get",
    async (): Promise<IpcResponse<ModelPricingTable>> => ({
      ok: true,
      data: deps.tracker.getPricingTable(),
    }),
  );

  deps.ipcMain.handle(
    "cost:pricing:update",
    async (_event, payload: unknown): Promise<IpcResponse<ModelPricingTable>> => {
      const table = validatePricingTable(payload);
      if (!table) {
        return ipcError("INVALID_ARGUMENT", "Invalid pricing table");
      }
      deps.tracker.updatePricingTable(table);
      return { ok: true, data: deps.tracker.getPricingTable() };
    },
  );
}
