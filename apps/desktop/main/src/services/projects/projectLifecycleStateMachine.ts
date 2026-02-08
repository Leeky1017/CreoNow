import type { IpcError } from "../../../../../../packages/shared/types/ipc-generated";

export type ProjectLifecycleState = "active" | "archived" | "deleted";

export type LifecycleTransitionResult =
  | { ok: true; data: { from: ProjectLifecycleState; to: ProjectLifecycleState } }
  | { ok: false; error: IpcError };

const LIFECYCLE_TRANSITIONS: Record<
  ProjectLifecycleState,
  readonly ProjectLifecycleState[]
> = {
  active: ["archived"],
  archived: ["active", "deleted"],
  deleted: [],
};

/**
 * Evaluate whether a lifecycle transition is allowed by the PM-2 state machine.
 *
 * Why: lifecycle constraints must be centralized and testable, rather than
 * scattered as ad-hoc conditionals.
 */
export function evaluateLifecycleTransition(args: {
  from: ProjectLifecycleState;
  to: ProjectLifecycleState;
  traceId?: string;
}): LifecycleTransitionResult {
  if (args.from === args.to) {
    return { ok: true, data: { from: args.from, to: args.to } };
  }

  const allowed = LIFECYCLE_TRANSITIONS[args.from] ?? [];
  if (allowed.includes(args.to)) {
    return { ok: true, data: { from: args.from, to: args.to } };
  }

  if (args.from === "active" && args.to === "deleted") {
    return {
      ok: false,
      error: {
        code: "PROJECT_DELETE_REQUIRES_ARCHIVE",
        message: "请先归档项目再删除",
        traceId: args.traceId,
      },
    };
  }

  return {
    ok: false,
    error: {
      code: "INVALID_ARGUMENT",
      message: `Invalid lifecycle transition: ${args.from} -> ${args.to}`,
      traceId: args.traceId,
      details: {
        from: args.from,
        to: args.to,
      },
    },
  };
}
