import type { IpcMain } from "electron";

import type { IpcResponse } from "../../../../../packages/shared/types/ipc-generated";
import type {
  JudgeModelState,
  JudgeService,
} from "../services/judge/judgeService";

/**
 * Register `judge:*` IPC handlers.
 *
 * Why: renderer must be able to observe model readiness and trigger ensure
 * deterministically for Windows E2E.
 */
export function registerJudgeIpcHandlers(deps: {
  ipcMain: IpcMain;
  judgeService: JudgeService;
}): void {
  deps.ipcMain.handle(
    "judge:model:getstate",
    async (): Promise<IpcResponse<{ state: JudgeModelState }>> => {
      return { ok: true, data: { state: deps.judgeService.getState() } };
    },
  );

  deps.ipcMain.handle(
    "judge:model:ensure",
    async (
      _e,
      payload: { timeoutMs?: number } | undefined,
    ): Promise<IpcResponse<{ state: JudgeModelState }>> => {
      const timeoutMs = payload?.timeoutMs;
      if (timeoutMs !== undefined && typeof timeoutMs !== "number") {
        return {
          ok: false,
          error: {
            code: "INVALID_ARGUMENT",
            message: "timeoutMs must be number",
          },
        };
      }
      const res = await deps.judgeService.ensure({ timeoutMs });
      return res.ok
        ? { ok: true, data: { state: res.data } }
        : { ok: false, error: res.error };
    },
  );
}
