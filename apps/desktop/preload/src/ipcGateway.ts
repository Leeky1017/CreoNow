import type {
  IpcErr,
  IpcError,
  IpcErrorCode,
  IpcResponse,
} from "@shared/types/ipc-generated";
import { RUNTIME_GOVERNANCE_DEFAULTS } from "@shared/runtimeGovernance";

export const MAX_IPC_PAYLOAD_BYTES =
  RUNTIME_GOVERNANCE_DEFAULTS.ipc.maxPayloadBytes;

export type IpcSecurityAuditEvent = {
  event: string;
  rendererId: string;
  channel: string;
  timestamp: number;
  details?: Record<string, unknown>;
};

type CreatePreloadIpcGatewayArgs = {
  allowedChannels: readonly string[];
  rendererId: string;
  invoke: (channel: string, payload: unknown) => Promise<unknown>;
  maxPayloadBytes?: number;
  now?: () => number;
  requestIdFactory?: () => string;
  auditLog?: (event: IpcSecurityAuditEvent) => void;
};

function nowTs(): number {
  return Date.now();
}

function createRequestId(): string {
  if (
    typeof globalThis.crypto === "object" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return `req-${nowTs()}-${Math.random().toString(16).slice(2)}`;
}

function toIpcError(
  code: IpcErrorCode,
  message: string,
  details?: unknown,
): IpcError {
  return {
    code,
    message,
    details,
    retryable: code === "TIMEOUT",
  };
}

function toErr(args: {
  code: IpcErrorCode;
  message: string;
  details?: unknown;
  requestId: string;
  timestamp: number;
}): IpcErr {
  return {
    ok: false,
    error: toIpcError(args.code, args.message, args.details),
    meta: {
      requestId: args.requestId,
      ts: args.timestamp,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isIpcResponse(value: unknown): value is IpcResponse<unknown> {
  if (!isRecord(value) || typeof value.ok !== "boolean") {
    return false;
  }

  if (value.ok) {
    return "data" in value;
  }

  return (
    isRecord(value.error) &&
    typeof value.error.code === "string" &&
    typeof value.error.message === "string"
  );
}

/**
 * Estimate payload byte-size for preload boundary guarding.
 *
 * Why: IPC payload must be hard-limited before entering main handlers.
 */
function estimatePayloadSize(payload: unknown): number | null {
  if (payload === undefined) {
    return 0;
  }

  try {
    const serialized = JSON.stringify(payload);
    if (typeof serialized !== "string") {
      return 0;
    }
    return new TextEncoder().encode(serialized).byteLength;
  } catch {
    return null;
  }
}

function defaultAuditLog(event: IpcSecurityAuditEvent): void {
  console.warn("[ipc-security-audit]", JSON.stringify(event));
}

/**
 * Build preload IPC gateway with whitelist + payload guard + audit hooks.
 */
export function createPreloadIpcGateway(args: CreatePreloadIpcGatewayArgs): {
  invoke: (channel: string, payload: unknown) => Promise<IpcResponse<unknown>>;
} {
  const channelSet = new Set(args.allowedChannels);
  const limitBytes = args.maxPayloadBytes ?? MAX_IPC_PAYLOAD_BYTES;
  const getNow = args.now ?? nowTs;
  const getRequestId = args.requestIdFactory ?? createRequestId;
  const auditLog = args.auditLog ?? defaultAuditLog;

  return {
    invoke: async (channel: string, payload: unknown) => {
      const timestamp = getNow();
      const requestId = getRequestId();

      if (!channelSet.has(channel)) {
        auditLog({
          event: "ipc_channel_forbidden",
          rendererId: args.rendererId,
          channel,
          timestamp,
        });

        return toErr({
          code: "IPC_CHANNEL_FORBIDDEN",
          message: "通道未授权",
          details: { channel },
          requestId,
          timestamp,
        });
      }

      const payloadBytes = estimatePayloadSize(payload);
      if (payloadBytes === null) {
        return toErr({
          code: "INVALID_ARGUMENT",
          message: "请求参数不可序列化",
          requestId,
          timestamp,
        });
      }

      if (payloadBytes > limitBytes) {
        auditLog({
          event: "ipc_payload_too_large",
          rendererId: args.rendererId,
          channel,
          timestamp,
          details: {
            payloadBytes,
            limitBytes,
          },
        });

        return toErr({
          code: "IPC_PAYLOAD_TOO_LARGE",
          message: "请求体超过 10MB 限制",
          details: {
            payloadBytes,
            limitBytes,
          },
          requestId,
          timestamp,
        });
      }

      try {
        const response = await args.invoke(channel, payload);
        if (isIpcResponse(response)) {
          return response;
        }

        return toErr({
          code: "INTERNAL",
          message: "Invalid IPC response shape",
          requestId,
          timestamp,
        });
      } catch (error) {
        return toErr({
          code: "INTERNAL",
          message: "IPC 调用失败",
          details: {
            message: error instanceof Error ? error.message : String(error),
          },
          requestId,
          timestamp,
        });
      }
    },
  };
}
