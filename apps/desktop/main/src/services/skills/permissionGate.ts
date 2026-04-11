/**
 * PermissionGate service for writing safety checks.
 *
 * INV-1: write operations are fail-closed unless permission flow resolves.
 */

export type PermissionLevel =
  | "auto-allow"
  | "preview-confirm"
  | "must-confirm-snapshot"
  | "budget-confirm";

export interface DiffPreview {
  original: string;
  modified: string;
  changeType: "replace" | "insert" | "delete";
}

export interface PermissionRequest {
  requestId: string;
  level: PermissionLevel;
  description: string;
  preview?: DiffPreview;
  estimatedTokenCost?: number;
}

export interface PermissionGate {
  requestPermission(request: PermissionRequest): Promise<boolean>;
  readonly confirmTimeoutMs: number;
  releasePendingPermission(requestId: string, granted?: boolean): void;
  evaluate(request: unknown): Promise<{ level: PermissionLevel; granted: boolean }>;
}

type PermissionGateInternal = PermissionGate & {
  resolve(requestId: string, granted: boolean): boolean;
  rejectAll(): void;
};

const VALID_LEVELS = new Set<PermissionLevel>([
  "auto-allow",
  "preview-confirm",
  "must-confirm-snapshot",
  "budget-confirm",
]);

export type PermissionGateErrorCode =
  | "PERMISSION_TIMEOUT"
  | "PERMISSION_IPC_ERROR";

export class PermissionGateError extends Error {
  readonly code: PermissionGateErrorCode;
  readonly details?: unknown;

  constructor(
    code: PermissionGateErrorCode,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "PermissionGateError";
    this.code = code;
    this.details = details;
  }
}

export function normalizeLevel(raw: unknown): PermissionLevel {
  if (typeof raw === "string" && VALID_LEVELS.has(raw as PermissionLevel)) {
    return raw as PermissionLevel;
  }
  return "preview-confirm";
}

export function createPermissionGate(args?: {
  confirmTimeoutMs?: number;
  onPermissionRequested?: (request: PermissionRequest) => void | Promise<void>;
}): PermissionGateInternal {
  const confirmTimeoutMs = args?.confirmTimeoutMs ?? 120_000;
  const pending = new Map<string, (granted: boolean) => void>();
  const settled = new Map<string, boolean>();
  const settledCleanup = new Map<string, ReturnType<typeof setTimeout>>();
  const scheduleSettledCleanup = (requestId: string): void => {
    const existing = settledCleanup.get(requestId);
    if (existing !== undefined) {
      clearTimeout(existing);
    }
    settledCleanup.set(
      requestId,
      setTimeout(() => {
        settled.delete(requestId);
        settledCleanup.delete(requestId);
      }, 30_000),
    );
  };
  const clearSettledCleanup = (requestId: string): void => {
    const timer = settledCleanup.get(requestId);
    if (timer !== undefined) {
      clearTimeout(timer);
      settledCleanup.delete(requestId);
    }
  };

  return {
    confirmTimeoutMs,
    async evaluate(request: unknown) {
      const envelope =
        request && typeof request === "object"
          ? (request as Record<string, unknown>)
          : undefined;
      const level = normalizeLevel(envelope?.level);
      return {
        level,
        granted: level === "auto-allow",
      };
    },
    async requestPermission(request: PermissionRequest): Promise<boolean> {
      const level = normalizeLevel(request.level);
      if (level === "auto-allow") {
        return true;
      }
      if (request.requestId.trim().length === 0) {
        return false;
      }

      const preResolved = settled.get(request.requestId);
      if (typeof preResolved === "boolean") {
        clearSettledCleanup(request.requestId);
        settled.delete(request.requestId);
        return preResolved;
      }

      try {
        await args?.onPermissionRequested?.({
          ...request,
          level,
        });
      } catch (error) {
        throw new PermissionGateError(
          "PERMISSION_IPC_ERROR",
          "Permission IPC channel failed",
          error,
        );
      }

      const postHookResolved = settled.get(request.requestId);
      if (typeof postHookResolved === "boolean") {
        clearSettledCleanup(request.requestId);
        settled.delete(request.requestId);
        return postHookResolved;
      }

      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      try {
        return await Promise.race<boolean>([
          new Promise<boolean>((resolve) => {
            const immediate = settled.get(request.requestId);
            if (typeof immediate === "boolean") {
              clearSettledCleanup(request.requestId);
              settled.delete(request.requestId);
              resolve(immediate);
              return;
            }
            pending.set(request.requestId, resolve);
          }),
          new Promise<boolean>((resolve) => {
            timeoutId = setTimeout(() => {
              resolve(false);
            }, confirmTimeoutMs);
          }),
        ]);
      } finally {
        if (timeoutId !== undefined) {
          clearTimeout(timeoutId);
        }
        pending.delete(request.requestId);
        clearSettledCleanup(request.requestId);
        settled.delete(request.requestId);
      }
    },
    resolve(requestId: string, granted: boolean): boolean {
      const resolver = pending.get(requestId);
      if (!resolver) {
        settled.set(requestId, granted);
        scheduleSettledCleanup(requestId);
        return true;
      }
      pending.delete(requestId);
      resolver(granted);
      return true;
    },
    releasePendingPermission(requestId: string, granted = false): void {
      const resolver = pending.get(requestId);
      if (resolver) {
        pending.delete(requestId);
        resolver(granted);
        clearSettledCleanup(requestId);
        settled.delete(requestId);
        return;
      }
      settled.set(requestId, granted);
      scheduleSettledCleanup(requestId);
    },
    rejectAll(): void {
      for (const [requestId, resolver] of pending.entries()) {
        pending.delete(requestId);
        resolver(false);
      }
      for (const timer of settledCleanup.values()) {
        clearTimeout(timer);
      }
      settledCleanup.clear();
      settled.clear();
    },
  };
}
