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
  readonly confirmTimeoutMs?: number;
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

function normalizeLevel(raw: unknown): PermissionLevel {
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
        settled.delete(request.requestId);
        return preResolved;
      }

      try {
        await args?.onPermissionRequested?.({
          ...request,
          level,
        });
      } catch {
        return false;
      }

      const postHookResolved = settled.get(request.requestId);
      if (typeof postHookResolved === "boolean") {
        settled.delete(request.requestId);
        return postHookResolved;
      }

      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      try {
        return await Promise.race<boolean>([
          new Promise<boolean>((resolve) => {
            const immediate = settled.get(request.requestId);
            if (typeof immediate === "boolean") {
              settled.delete(request.requestId);
              resolve(immediate);
              return;
            }
            pending.set(request.requestId, resolve);
          }),
          new Promise<boolean>((resolve) => {
            timeoutId = setTimeout(() => resolve(false), confirmTimeoutMs);
          }),
        ]);
      } finally {
        if (timeoutId !== undefined) {
          clearTimeout(timeoutId);
        }
        pending.delete(request.requestId);
        settled.delete(request.requestId);
      }
    },
    resolve(requestId: string, granted: boolean): boolean {
      const resolver = pending.get(requestId);
      if (!resolver) {
        settled.set(requestId, granted);
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
        settled.delete(requestId);
        return;
      }
      settled.set(requestId, granted);
    },
    rejectAll(): void {
      for (const [requestId, resolver] of pending.entries()) {
        pending.delete(requestId);
        resolver(false);
      }
      settled.clear();
    },
  };
}
