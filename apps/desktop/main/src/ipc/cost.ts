/**
 * Cost IPC handlers — 费用查询
 */

import type { IpcMain } from "electron";

import type { IpcResponse } from "@shared/types/ipc-generated";
import type { Logger } from "../logging/logger";
import type {
  CostTracker,
  RequestCost,
  SessionCostSummary,
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
  summary: SessionCostSummary;
}

// ─── Registration ───────────────────────────────────────────────────

export function registerCostIpcHandlers(deps: {
  ipcMain: IpcMain;
  tracker: CostTracker;
  logger: Logger;
}): void {
  deps.ipcMain.handle(
    "ai:cost:list",
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
        deps.logger.error("ai:cost:list failed", { reason: String(err) });
        return ipcError("INTERNAL", "Failed to list cost records");
      }
    },
  );

  deps.ipcMain.handle(
    "ai:cost:summary",
    async (
      _e,
      _payload: CostUsageSummaryRequest | undefined,
    ): Promise<IpcResponse<CostUsageSummaryResponse>> => {
      try {
        const summary = deps.tracker.getSessionCost();
        return { ok: true, data: { summary } };
      } catch (err) {
        deps.logger.error("ai:cost:summary failed", { reason: String(err) });
        return ipcError("INTERNAL", "Failed to get cost summary");
      }
    },
  );
}
