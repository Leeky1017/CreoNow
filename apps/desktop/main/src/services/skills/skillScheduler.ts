import type {
  IpcError,
  IpcErrorCode,
} from "../../../../../../packages/shared/types/ipc-generated";

type Ok<T> = { ok: true; data: T };
type Err = { ok: false; error: IpcError };
export type ServiceResult<T> = Ok<T> | Err;

export type SkillSchedulerTerminal =
  | "completed"
  | "failed"
  | "cancelled"
  | "timeout";

export type SkillQueueStatus = {
  sessionKey: string;
  executionId: string;
  runId: string;
  traceId: string;
  status:
    | "queued"
    | "started"
    | "completed"
    | "failed"
    | "cancelled"
    | "timeout";
  queuePosition: number;
  queued: number;
  globalRunning: number;
};

type SkillTaskStartResult<T> = {
  response: Promise<ServiceResult<T>>;
  completion: Promise<SkillSchedulerTerminal>;
};

type SkillTask<T> = {
  sessionKey: string;
  executionId: string;
  runId: string;
  traceId: string;
  start: () => SkillTaskStartResult<T>;
  onQueueEvent?: (status: SkillQueueStatus) => void;
  resolveResult: (result: ServiceResult<T>) => void;
};

type SessionQueueState = {
  runningRunId: string | null;
  pending: SkillTask<unknown>[];
};

export type SkillScheduler = {
  schedule: <T>(args: {
    sessionKey: string;
    executionId: string;
    runId: string;
    traceId: string;
    dependsOn?: string[];
    isDependencyAvailable?: (dependencyId: string) => boolean;
    onQueueEvent?: (status: SkillQueueStatus) => void;
    start: () => SkillTaskStartResult<T>;
  }) => Promise<ServiceResult<T>>;
};

function ipcError(code: IpcErrorCode, message: string, details?: unknown): Err {
  return { ok: false, error: { code, message, details } };
}

function normalizeDependencies(dependsOn: string[] | undefined): string[] {
  if (!dependsOn) {
    return [];
  }
  const normalized = dependsOn
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return [...new Set(normalized)];
}

function toQueueStatus(args: {
  task: SkillTask<unknown>;
  status:
    | "queued"
    | "started"
    | "completed"
    | "failed"
    | "cancelled"
    | "timeout";
  queuePosition: number;
  queued: number;
  globalRunning: number;
}): SkillQueueStatus {
  return {
    sessionKey: args.task.sessionKey,
    executionId: args.task.executionId,
    runId: args.task.runId,
    traceId: args.task.traceId,
    status: args.status,
    queuePosition: args.queuePosition,
    queued: args.queued,
    globalRunning: args.globalRunning,
  };
}

/**
 * Create a queue-backed scheduler for skill execution.
 *
 * Why: P3 requires deterministic session FIFO + global concurrency + overflow
 * guard while keeping queue state observable for the AI panel.
 */
export function createSkillScheduler(args?: {
  globalConcurrencyLimit?: number;
  sessionQueueLimit?: number;
}): SkillScheduler {
  const globalConcurrencyLimit = Math.max(
    1,
    Math.floor(args?.globalConcurrencyLimit ?? 8),
  );
  const sessionQueueLimit = Math.max(
    1,
    Math.floor(args?.sessionQueueLimit ?? 20),
  );

  const sessions = new Map<string, SessionQueueState>();
  const readySessionQueue: string[] = [];
  const readySessionSet = new Set<string>();
  let globalRunning = 0;

  function getSessionState(sessionKey: string): SessionQueueState {
    const existing = sessions.get(sessionKey);
    if (existing) {
      return existing;
    }
    const created: SessionQueueState = {
      runningRunId: null,
      pending: [],
    };
    sessions.set(sessionKey, created);
    return created;
  }

  function enqueueReadySession(sessionKey: string): void {
    if (readySessionSet.has(sessionKey)) {
      return;
    }
    readySessionSet.add(sessionKey);
    readySessionQueue.push(sessionKey);
  }

  function emitQueueStatus(
    task: SkillTask<unknown>,
    status:
      | "queued"
      | "started"
      | "completed"
      | "failed"
      | "cancelled"
      | "timeout",
    queuePosition: number,
    queued: number,
  ): void {
    task.onQueueEvent?.(
      toQueueStatus({
        task,
        status,
        queuePosition,
        queued,
        globalRunning,
      }),
    );
  }

  function emitPendingQueuePositions(sessionKey: string): void {
    const state = sessions.get(sessionKey);
    if (!state) {
      return;
    }
    const hasRunning = state.runningRunId !== null;
    const queued = state.pending.length;
    for (let i = 0; i < state.pending.length; i += 1) {
      const task = state.pending[i];
      if (!task) {
        continue;
      }
      emitQueueStatus(task, "queued", hasRunning ? i + 1 : i, queued);
    }
  }

  function cleanupSessionIfIdle(sessionKey: string): void {
    const state = sessions.get(sessionKey);
    if (!state) {
      return;
    }
    if (state.runningRunId === null && state.pending.length === 0) {
      sessions.delete(sessionKey);
    }
  }

  function finalizeTask(
    sessionKey: string,
    task: SkillTask<unknown>,
    terminal: SkillSchedulerTerminal,
  ): void {
    const state = sessions.get(sessionKey);
    if (!state) {
      return;
    }

    if (state.runningRunId === task.runId) {
      state.runningRunId = null;
      globalRunning = Math.max(0, globalRunning - 1);
    }

    emitQueueStatus(
      task,
      terminal === "completed"
        ? "completed"
        : terminal === "cancelled"
          ? "cancelled"
          : terminal === "timeout"
            ? "timeout"
            : "failed",
      0,
      state.pending.length,
    );

    if (state.pending.length > 0) {
      emitPendingQueuePositions(sessionKey);
      enqueueReadySession(sessionKey);
    } else {
      cleanupSessionIfIdle(sessionKey);
    }

    pump();
  }

  function startTask(sessionKey: string, task: SkillTask<unknown>): void {
    const state = sessions.get(sessionKey);
    if (!state) {
      return;
    }

    state.runningRunId = task.runId;
    globalRunning += 1;
    emitQueueStatus(task, "started", 0, state.pending.length);

    let started: SkillTaskStartResult<unknown>;
    try {
      started = task.start();
    } catch (error) {
      task.resolveResult(
        ipcError("INTERNAL", "Skill scheduler failed to start task", {
          message: error instanceof Error ? error.message : String(error),
        }),
      );
      finalizeTask(sessionKey, task, "failed");
      return;
    }

    void started.response
      .then((result) => {
        task.resolveResult(result);
      })
      .catch((error) => {
        task.resolveResult(
          ipcError("INTERNAL", "Skill scheduler task crashed", {
            message: error instanceof Error ? error.message : String(error),
          }),
        );
      });

    void started.completion
      .then((terminal) => {
        finalizeTask(sessionKey, task, terminal);
      })
      .catch(() => {
        finalizeTask(sessionKey, task, "failed");
      });
  }

  function pump(): void {
    while (
      globalRunning < globalConcurrencyLimit &&
      readySessionQueue.length > 0
    ) {
      const sessionKey = readySessionQueue.shift();
      if (!sessionKey) {
        break;
      }
      readySessionSet.delete(sessionKey);

      const state = sessions.get(sessionKey);
      if (!state) {
        continue;
      }
      if (state.runningRunId !== null) {
        continue;
      }
      const next = state.pending.shift();
      if (!next) {
        cleanupSessionIfIdle(sessionKey);
        continue;
      }

      startTask(sessionKey, next);
    }
  }

  return {
    schedule: async <T>(args2: {
      sessionKey: string;
      executionId: string;
      runId: string;
      traceId: string;
      dependsOn?: string[];
      isDependencyAvailable?: (dependencyId: string) => boolean;
      onQueueEvent?: (status: SkillQueueStatus) => void;
      start: () => SkillTaskStartResult<T>;
    }): Promise<ServiceResult<T>> => {
      const dependencies = normalizeDependencies(args2.dependsOn);
      if (dependencies.length > 0) {
        const missing = dependencies.filter((dependency) =>
          args2.isDependencyAvailable
            ? !args2.isDependencyAvailable(dependency)
            : false,
        );
        if (missing.length > 0) {
          return ipcError(
            "SKILL_DEPENDENCY_MISSING",
            "Skill dependency missing",
            missing,
          );
        }
      }

      const state = getSessionState(args2.sessionKey);
      if (state.pending.length >= sessionQueueLimit) {
        return ipcError("SKILL_QUEUE_OVERFLOW", "Skill queue overflow", {
          sessionKey: args2.sessionKey,
          limit: sessionQueueLimit,
        });
      }

      return await new Promise<ServiceResult<T>>((resolve) => {
        const task: SkillTask<T> = {
          sessionKey: args2.sessionKey,
          executionId: args2.executionId,
          runId: args2.runId,
          traceId: args2.traceId,
          start: args2.start,
          onQueueEvent: args2.onQueueEvent,
          resolveResult: resolve,
        };

        state.pending.push(task as SkillTask<unknown>);
        emitPendingQueuePositions(args2.sessionKey);
        enqueueReadySession(args2.sessionKey);
        pump();
      });
    },
  };
}
