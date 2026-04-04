/**
 * Cost IPC handlers — 费用查询
 */

import type { IpcMain } from "electron";

import type { IpcResponse } from "@shared/types/ipc-generated";
import type { Logger } from "../logging/logger";
import type {
  CostTracker,
  RequestCost,
} from "../services/ai/costTracker";
import { ipcError } from "../services/shared/ipcResult";

// ─── Request / Response types ───────────────────────────────────────

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

// ─── Registration ───────────────────────────────────────────────────

export function registerCostIpcHandlers(deps: {
  ipcMain: IpcMain;
  tracker: CostTracker;
  logger: Logger;
}): void {
  deps.ipcMain.handle(
    "cost:usage:list",
    async (
      _e,
      payload: CostUsageListRequest | undefined,
    ): Promise<IpcResponse<CostUsageListResponse>> => {
      try {
        const filter: { skillId?: string; since?: number; limit?: number } = {};

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
          if (typeof payload.limit !== "number" || !Number.isInteger(payload.limit) || payload.limit < 1) {
            return ipcError("INVALID_ARGUMENT", "limit must be a positive integer");
          }
          filter.limit = payload.limit;
        }

        const records = deps.tracker.listRecords(filter);
        return {
          ok: true,
          data: { records, totalCount: records.length },
        };
      } catch (err) {
        deps.logger.error("cost:usage:list failed", { reason: String(err) });
        return ipcError("INTERNAL", "Failed to list cost records");
      }
    },
  );

  deps.ipcMain.handle(
    "cost:usage:summary",
    async (
      _e,
      payload: CostUsageSummaryRequest | undefined,
    ): Promise<IpcResponse<CostUsageSummaryResponse>> => {
      try {
        const fullSummary = deps.tracker.getSessionCost();

        if (payload?.skillId !== undefined) {
          if (typeof payload.skillId !== "string") {
            return ipcError("INVALID_ARGUMENT", "skillId must be a string");
          }
        }
        if (payload?.since !== undefined) {
          if (typeof payload.since !== "number" || !Number.isFinite(payload.since)) {
            return ipcError("INVALID_ARGUMENT", "since must be a finite number");
          }
        }

        // Apply optional filters: if skillId or since is provided, recompute
        // from matching records rather than returning the full session aggregate.
        if (payload?.skillId !== undefined || payload?.since !== undefined) {
          const matchingRecords = deps.tracker.listRecords({
            skillId: payload?.skillId,
            since: payload?.since,
          });

          let totalCost = 0;
          let totalInputTokens = 0;
          let totalOutputTokens = 0;
          let totalCachedTokens = 0;
          const costByModel: Record<string, { cost: number; requests: number }> = {};
          const costBySkill: Record<string, { cost: number; requests: number }> = {};

          for (const r of matchingRecords) {
            totalCost += r.cost;
            totalInputTokens += r.inputTokens;
            totalOutputTokens += r.outputTokens;
            totalCachedTokens += r.cachedTokens;

            if (!costByModel[r.modelId]) costByModel[r.modelId] = { cost: 0, requests: 0 };
            costByModel[r.modelId].cost += r.cost;
            costByModel[r.modelId].requests += 1;

            if (!costBySkill[r.skillId]) costBySkill[r.skillId] = { cost: 0, requests: 0 };
            costBySkill[r.skillId].cost += r.cost;
            costBySkill[r.skillId].requests += 1;
          }

          return {
            ok: true,
            data: {
              totalCost,
              totalRequests: matchingRecords.length,
              totalInputTokens,
              totalOutputTokens,
              totalCachedTokens,
              costByModel,
              costBySkill,
              sessionStartedAt: fullSummary.sessionStartedAt,
            },
          };
        }

        return { ok: true, data: fullSummary };
      } catch (err) {
        deps.logger.error("cost:usage:summary failed", { reason: String(err) });
        return ipcError("INTERNAL", "Failed to get cost summary");
      }
    },
  );
}
