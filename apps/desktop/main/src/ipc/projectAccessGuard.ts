import type { IpcResponse } from "@shared/types/ipc-generated";

import type { ProjectSessionBindingRegistry } from "./projectSessionBinding";

type ProjectScopedPayload = {
  projectId?: unknown;
  [key: string]: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function senderWebContentsId(event: unknown): number | null {
  if (!isRecord(event)) {
    return null;
  }
  const sender = event.sender;
  if (!isRecord(sender) || typeof sender.id !== "number") {
    return null;
  }
  return sender.id;
}

function forbiddenProjectAccess(): { ok: false; response: IpcResponse<never> } {
  return {
    ok: false,
    response: {
      ok: false,
      error: {
        code: "FORBIDDEN",
        message: "projectId is not active for this renderer session",
      },
    },
  };
}

export function resolveBoundProjectIdForEvent(args: {
  event: unknown;
  projectSessionBinding?: ProjectSessionBindingRegistry;
}): { ok: true; projectId: string | null } | { ok: false; response: IpcResponse<never> } {
  if (!args.projectSessionBinding) {
    return { ok: true, projectId: null };
  }

  const webContentsId = senderWebContentsId(args.event);
  if (!webContentsId) {
    return forbiddenProjectAccess();
  }

  const boundProjectId = args.projectSessionBinding.resolveProjectId({
    webContentsId,
  });
  if (!boundProjectId) {
    return forbiddenProjectAccess();
  }

  return { ok: true, projectId: boundProjectId };
}

/**
 * Enforce renderer-session project binding for project-scoped IPC payloads.
 *
 * Why: sensitive IPC channels must not trust arbitrary payload.projectId values.
 */
export function guardAndNormalizeProjectAccess(args: {
  event: unknown;
  payload: unknown;
  projectSessionBinding?: ProjectSessionBindingRegistry;
}): { ok: true } | { ok: false; response: IpcResponse<never> } {
  if (!args.projectSessionBinding || !isRecord(args.payload)) {
    return { ok: true };
  }

  const payload = args.payload as ProjectScopedPayload;
  if (!Object.hasOwn(payload, "projectId")) {
    return { ok: true };
  }

  const bound = resolveBoundProjectIdForEvent({
    event: args.event,
    projectSessionBinding: args.projectSessionBinding,
  });
  if (!bound.ok) {
    return bound;
  }

  const requestedProjectId =
    typeof payload.projectId === "string" ? payload.projectId.trim() : "";
  if (requestedProjectId.length === 0) {
    payload.projectId = bound.projectId;
    return { ok: true };
  }

  if (requestedProjectId !== bound.projectId) {
    return forbiddenProjectAccess();
  }

  payload.projectId = requestedProjectId;
  return { ok: true };
}
