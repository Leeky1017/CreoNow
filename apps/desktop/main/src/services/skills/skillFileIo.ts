import fs from "node:fs/promises";
import path from "node:path";

import type { IpcError, IpcErrorCode } from "@shared/types/ipc-generated";

type Ok<T> = { ok: true; data: T };
type Err = { ok: false; error: IpcError };
export type ServiceResult<T> = Ok<T> | Err;

type DataProcessTaskResult<T> =
  | { status: "completed"; value: T }
  | { status: "error" | "timeout" | "aborted" | "crashed"; error: Error };

export type DataProcessTaskRunner = {
  run: <T>(args: {
    execute?: (signal: AbortSignal) => Promise<T>;
    run?: (signal: AbortSignal) => Promise<T>;
    timeoutMs?: number;
    signal?: AbortSignal;
    crashSignal?: AbortSignal;
  }) => Promise<DataProcessTaskResult<T>>;
};

export type SkillFileIo = {
  read: (args: { filePath: string }) => Promise<ServiceResult<string>>;
  write: (args: {
    filePath: string;
    content: string;
  }) => Promise<ServiceResult<true>>;
};

const DEFAULT_IO_TIMEOUT_MS = 30_000;

/**
 * Build a stable IPC error object for filesystem I/O failures.
 */
function ipcError(code: IpcErrorCode, message: string, details?: unknown): Err {
  return { ok: false, error: { code, message, details } };
}

function toErrorDetails(args: {
  result: Exclude<DataProcessTaskResult<unknown>, { status: "completed" }>;
}): { status: string; message: string } {
  return {
    status: args.result.status,
    message: args.result.error.message,
  };
}

async function runInDataProcess<T>(args: {
  dataProcess: DataProcessTaskRunner;
  timeoutMs: number;
  execute: (signal: AbortSignal) => Promise<T>;
}): Promise<DataProcessTaskResult<T>> {
  return await args.dataProcess.run({
    timeoutMs: args.timeoutMs,
    execute: args.execute,
  });
}

/**
 * Create async skill file I/O facade delegated to DataProcess execution.
 */
export function createSkillFileIo(deps: {
  dataProcess: DataProcessTaskRunner;
  timeoutMs?: number;
}): SkillFileIo {
  const timeoutMs =
    Number.isFinite(deps.timeoutMs) && (deps.timeoutMs ?? 0) > 0
      ? (deps.timeoutMs as number)
      : DEFAULT_IO_TIMEOUT_MS;

  return {
    read: async ({ filePath }) => {
      const result = await runInDataProcess({
        dataProcess: deps.dataProcess,
        timeoutMs,
        execute: async () => {
          return await fs.readFile(filePath, "utf8");
        },
      });
      if (result.status === "completed") {
        return { ok: true, data: result.value };
      }
      return ipcError(
        "IO_ERROR",
        "Failed to read skill file",
        toErrorDetails({ result }),
      );
    },

    write: async ({ filePath, content }) => {
      const result = await runInDataProcess({
        dataProcess: deps.dataProcess,
        timeoutMs,
        execute: async () => {
          await fs.mkdir(path.dirname(filePath), { recursive: true });
          await fs.writeFile(filePath, content, "utf8");
          return true;
        },
      });
      if (result.status === "completed") {
        return { ok: true, data: true };
      }
      return ipcError(
        "IO_ERROR",
        "Failed to write skill file",
        toErrorDetails({ result }),
      );
    },
  };
}
