import { SKILL_STREAM_CHUNK_CHANNEL } from "@shared/types/ai";
import type {
  IpcErr,
  IpcError,
  IpcErrorCode,
  IpcResponse,
} from "@shared/types/ipc-generated";

export const MAX_AI_STREAM_SUBSCRIPTIONS = 500;

export type IpcSecurityAuditEvent = {
  event: string;
  rendererId: string;
  channel: string;
  timestamp: number;
  details?: Record<string, unknown>;
};

type CreateAiStreamSubscriptionRegistryArgs = {
  rendererId: string;
  maxSubscriptions?: number;
  now?: () => number;
  idFactory?: () => string;
  auditLog?: (event: IpcSecurityAuditEvent) => void;
};

function nowTs(): number {
  return Date.now();
}

function createSubscriptionId(): string {
  if (
    typeof globalThis.crypto === "object" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return `sub-${nowTs()}-${Math.random().toString(16).slice(2)}`;
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
}): IpcErr {
  return {
    ok: false,
    error: toIpcError(args.code, args.message, args.details),
  };
}

function defaultAuditLog(event: IpcSecurityAuditEvent): void {
  console.warn("[ipc-security-audit]", JSON.stringify(event));
}

/**
 * Create per-renderer AI stream subscription registry with a hard upper bound.
 */
export function createAiStreamSubscriptionRegistry(
  args: CreateAiStreamSubscriptionRegistryArgs,
): {
  register: () => IpcResponse<{ subscriptionId: string }>;
  release: (subscriptionId: string) => void;
  count: () => number;
} {
  const maxSubscriptions = args.maxSubscriptions ?? MAX_AI_STREAM_SUBSCRIPTIONS;
  const getNow = args.now ?? nowTs;
  const createId = args.idFactory ?? createSubscriptionId;
  const auditLog = args.auditLog ?? defaultAuditLog;
  const active = new Set<string>();

  return {
    register: () => {
      if (active.size >= maxSubscriptions) {
        auditLog({
          event: "ipc_subscription_limit_exceeded",
          rendererId: args.rendererId,
          channel: SKILL_STREAM_CHUNK_CHANNEL,
          timestamp: getNow(),
          details: {
            current: active.size,
            limit: maxSubscriptions,
          },
        });

        return toErr({
          code: "IPC_SUBSCRIPTION_LIMIT_EXCEEDED",
          message: "订阅数量超过上限",
          details: {
            current: active.size,
            limit: maxSubscriptions,
          },
        });
      }

      const subscriptionId = createId();
      active.add(subscriptionId);
      return {
        ok: true,
        data: { subscriptionId },
      };
    },
    release: (subscriptionId: string) => {
      active.delete(subscriptionId);
    },
    count: () => active.size,
  };
}
