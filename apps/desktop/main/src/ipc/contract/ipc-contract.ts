import { s } from "./schema";

export const IPC_ERROR_CODES = [
  "INVALID_ARGUMENT",
  "NOT_FOUND",
  "ALREADY_EXISTS",
  "CONFLICT",
  "PERMISSION_DENIED",
  "UNSUPPORTED",
  "IO_ERROR",
  "DB_ERROR",
  "MODEL_NOT_READY",
  "ENCODING_FAILED",
  "RATE_LIMITED",
  "TIMEOUT",
  "CANCELED",
  "UPSTREAM_ERROR",
  "INTERNAL",
] as const;

export type IpcErrorCode = (typeof IPC_ERROR_CODES)[number];

export const ipcContract = {
  version: 1,
  errorCodes: IPC_ERROR_CODES,
  channels: {
    "app:ping": {
      request: s.object({}),
      response: s.object({}),
    },
  },
} as const;
