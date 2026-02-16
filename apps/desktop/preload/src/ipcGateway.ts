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
function estimatePayloadSize(
  payload: unknown,
  maxBytes?: number,
): number | null {
  if (
    payload === undefined ||
    typeof payload === "function" ||
    typeof payload === "symbol"
  ) {
    return 0;
  }

  const encoder = new TextEncoder();
  const byteLimit =
    typeof maxBytes === "number" && Number.isFinite(maxBytes) && maxBytes > 0
      ? maxBytes
      : Number.POSITIVE_INFINITY;
  const stack = new Set<object>();

  const addWithLimit = (total: number, delta: number): number => {
    const next = total + delta;
    return next > byteLimit ? byteLimit + 1 : next;
  };

  // Keep one traversal function to avoid payload re-walk while preserving short-circuit semantics.
  // eslint-disable-next-line complexity
  const walk = (value: unknown, inArray: boolean): number | null => {
    if (value === null) {
      return 4;
    }

    const valueType = typeof value;
    if (valueType === "string") {
      return encoder.encode(value as string).byteLength + 2;
    }
    if (valueType === "number") {
      const numeric = value as number;
      return Number.isFinite(numeric) ? String(numeric).length : 4;
    }
    if (valueType === "boolean") {
      return (value as boolean) ? 4 : 5;
    }
    if (valueType === "bigint") {
      return null;
    }
    if (
      valueType === "undefined" ||
      valueType === "function" ||
      valueType === "symbol"
    ) {
      return inArray ? 4 : 0;
    }
    if (valueType !== "object" || value === null) {
      return null;
    }

    const objectValue = value as object;
    const jsonLike = value as { toJSON?: () => unknown };
    if (typeof jsonLike.toJSON === "function") {
      try {
        return walk(jsonLike.toJSON(), inArray);
      } catch {
        return null;
      }
    }

    if (stack.has(objectValue)) {
      return null;
    }

    stack.add(objectValue);
    try {
      if (Array.isArray(value)) {
        let total = 2;
        for (let i = 0; i < value.length; i += 1) {
          if (i > 0) {
            total = addWithLimit(total, 1);
          }
          if (total > byteLimit) {
            return total;
          }

          const itemSize = walk(value[i], true);
          if (itemSize === null) {
            return null;
          }
          total = addWithLimit(total, itemSize);
          if (total > byteLimit) {
            return total;
          }
        }
        return total;
      }

      let total = 2;
      let writtenEntries = 0;
      const recordValue = value as Record<string, unknown>;
      for (const key of Object.keys(recordValue)) {
        const propertyValue = recordValue[key];
        if (
          propertyValue === undefined ||
          typeof propertyValue === "function" ||
          typeof propertyValue === "symbol"
        ) {
          continue;
        }

        const valueSize = walk(propertyValue, false);
        if (valueSize === null) {
          return null;
        }

        if (writtenEntries > 0) {
          total = addWithLimit(total, 1);
        }

        const keySize = encoder.encode(key).byteLength + 2;
        total = addWithLimit(total, keySize + 1 + valueSize);
        writtenEntries += 1;
        if (total > byteLimit) {
          return total;
        }
      }

      return total;
    } finally {
      stack.delete(objectValue);
    }
  };

  try {
    return walk(payload, false);
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

      const payloadBytes = estimatePayloadSize(payload, limitBytes);
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
