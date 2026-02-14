import type { IpcMain } from "electron";

import type { IpcResponse } from "@shared/types/ipc-generated";
import type { Logger } from "../logging/logger";
import type {
  ContextBudgetProfile,
  ContextBudgetUpdateRequest,
  ContextLayerAssemblyService,
} from "../services/context/layerAssemblyService";

type ContextBudgetRegistrarDeps = {
  ipcMain: IpcMain;
  logger: Logger;
  contextAssemblyService: ContextLayerAssemblyService;
};

export function registerContextBudgetHandlers(
  deps: ContextBudgetRegistrarDeps,
): void {
  deps.ipcMain.handle(
    "context:budget:get",
    async (): Promise<IpcResponse<ContextBudgetProfile>> => {
      try {
        return {
          ok: true,
          data: deps.contextAssemblyService.getBudgetProfile(),
        };
      } catch (error) {
        deps.logger.error("context_budget_get_failed", {
          code: "INTERNAL",
          message: error instanceof Error ? error.message : String(error),
        });
        return {
          ok: false,
          error: { code: "INTERNAL", message: "Failed to read context budget" },
        };
      }
    },
  );

  deps.ipcMain.handle(
    "context:budget:update",
    async (
      _e,
      payload: ContextBudgetUpdateRequest,
    ): Promise<IpcResponse<ContextBudgetProfile>> => {
      const updated = deps.contextAssemblyService.updateBudgetProfile(payload);
      if (!updated.ok) {
        deps.logger.error("context_budget_update_failed", {
          code: updated.error.code,
          message: updated.error.message,
          version: payload.version,
          tokenizerId: payload.tokenizerId,
          tokenizerVersion: payload.tokenizerVersion,
        });
        return {
          ok: false,
          error: { code: updated.error.code, message: updated.error.message },
        };
      }

      deps.logger.info("context_budget_updated", {
        version: updated.data.version,
        tokenizerId: updated.data.tokenizerId,
        tokenizerVersion: updated.data.tokenizerVersion,
      });
      return { ok: true, data: updated.data };
    },
  );
}
