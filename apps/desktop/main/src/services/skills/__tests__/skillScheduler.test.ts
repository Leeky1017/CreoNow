import assert from "node:assert/strict";

import {
  createSkillScheduler,
  type ServiceResult,
  type SkillSchedulerTerminal,
} from "../skillScheduler";

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

type ErrorSource = "response" | "completion";

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function assertErrorDetails(args: {
  details: unknown;
  sessionKey: string;
  taskId: string;
  errorSource: ErrorSource;
  errorMessage: string;
  executionId: string;
}): void {
  assert.equal(typeof args.details, "object", "error details must be object");
  assert.notEqual(args.details, null, "error details must be non-null");
  const details = args.details as Record<string, unknown>;

  assert.equal(details.sessionKey, args.sessionKey, "missing sessionKey");
  assert.equal(details.taskId, args.taskId, "missing taskId");
  assert.equal(details.errorSource, args.errorSource, "missing errorSource");
  assert.equal(details.errorMessage, args.errorMessage, "missing errorMessage");
  assert.equal(details.executionId, args.executionId, "missing executionId");
}

function assertFailedWithContext(args: {
  result: ServiceResult<string>;
  sessionKey: string;
  taskId: string;
  errorSource: ErrorSource;
  errorMessage: string;
  executionId: string;
}): void {
  assert.equal(args.result.ok, false, "scheduler result must be failed");
  if (args.result.ok) {
    return;
  }
  assertErrorDetails({
    details: args.result.error.details,
    sessionKey: args.sessionKey,
    taskId: args.taskId,
    errorSource: args.errorSource,
    errorMessage: args.errorMessage,
    executionId: args.executionId,
  });
}

const TERMINAL_STATUS_SET = new Set([
  "completed",
  "failed",
  "cancelled",
  "timeout",
]);

// S1-SEC-S1
async function preservesResponseCompletionErrorContextInFailedPath(): Promise<void> {
  const scheduler = createSkillScheduler({
    globalConcurrencyLimit: 1,
    sessionQueueLimit: 20,
  });

  const responseA = createDeferred<ServiceResult<string>>();
  const completionA = createDeferred<SkillSchedulerTerminal>();
  const statusesA: string[] = [];

  const resultPromiseA = scheduler.schedule({
    sessionKey: "session-s1-response",
    executionId: "exec-s1-response",
    runId: "task-s1-response",
    traceId: "trace-s1-response",
    onQueueEvent: (event) => {
      statusesA.push(event.status);
    },
    start: () => ({
      response: responseA.promise,
      completion: completionA.promise,
    }),
  });

  responseA.reject(new Error("UPSTREAM_TIMEOUT"));
  completionA.resolve("completed");

  const resultA = await resultPromiseA;
  assertFailedWithContext({
    result: resultA,
    sessionKey: "session-s1-response",
    taskId: "task-s1-response",
    errorSource: "response",
    errorMessage: "UPSTREAM_TIMEOUT",
    executionId: "exec-s1-response",
  });
  const terminalStatusesA = statusesA.filter((status) =>
    TERMINAL_STATUS_SET.has(status),
  );
  assert.deepEqual(
    terminalStatusesA,
    ["failed"],
    "response-path errors must converge to failed terminal",
  );

  const responseB = createDeferred<ServiceResult<string>>();
  const completionB = createDeferred<SkillSchedulerTerminal>();

  const resultPromiseB = scheduler.schedule({
    sessionKey: "session-s1-completion",
    executionId: "exec-s1-completion",
    runId: "task-s1-completion",
    traceId: "trace-s1-completion",
    start: () => ({
      response: responseB.promise,
      completion: completionB.promise,
    }),
  });

  completionB.reject(new Error("QUEUE_FINALIZE_FAILED"));
  responseB.resolve({ ok: true, data: "ok" });

  const resultB = await resultPromiseB;
  assertFailedWithContext({
    result: resultB,
    sessionKey: "session-s1-completion",
    taskId: "task-s1-completion",
    errorSource: "completion",
    errorMessage: "QUEUE_FINALIZE_FAILED",
    executionId: "exec-s1-completion",
  });
}

// S1-SEC-S2
async function finalizesTaskTerminalStateExactlyOnceAcrossAsyncRaces(): Promise<void> {
  const scheduler = createSkillScheduler({
    globalConcurrencyLimit: 1,
    sessionQueueLimit: 20,
  });

  const response = createDeferred<ServiceResult<string>>();
  const completion = createDeferred<SkillSchedulerTerminal>();
  const terminalStatuses: string[] = [];

  const resultPromise = scheduler.schedule({
    sessionKey: "session-s2-race",
    executionId: "exec-s2-race",
    runId: "task-s2-race",
    traceId: "trace-s2-race",
    onQueueEvent: (event) => {
      if (TERMINAL_STATUS_SET.has(event.status)) {
        terminalStatuses.push(event.status);
      }
    },
    start: () => ({
      response: response.promise,
      completion: completion.promise,
    }),
  });

  response.reject(new Error("RACE_RESPONSE_FAILED"));
  completion.resolve("completed");

  const result = await resultPromise;
  assertFailedWithContext({
    result,
    sessionKey: "session-s2-race",
    taskId: "task-s2-race",
    errorSource: "response",
    errorMessage: "RACE_RESPONSE_FAILED",
    executionId: "exec-s2-race",
  });

  assert.deepEqual(
    terminalStatuses,
    ["failed"],
    "terminal convergence must be exactly once and stay failed",
  );
}

// Regression guard: keep scheduler response contract for stream cancel paths.
async function resolvesResultBeforeCompletionSettles(): Promise<void> {
  const scheduler = createSkillScheduler({
    globalConcurrencyLimit: 1,
    sessionQueueLimit: 20,
  });

  const response = createDeferred<ServiceResult<string>>();
  const completion = createDeferred<SkillSchedulerTerminal>();

  const resultPromise = scheduler.schedule({
    sessionKey: "session-response-first",
    executionId: "exec-response-first",
    runId: "task-response-first",
    traceId: "trace-response-first",
    start: () => ({
      response: response.promise,
      completion: completion.promise,
    }),
  });

  response.resolve({ ok: true, data: "ok" });

  const raced = await Promise.race<
    { kind: "result"; value: ServiceResult<string> } | { kind: "timeout" }
  >([
    resultPromise.then((value) => ({ kind: "result" as const, value })),
    new Promise<{ kind: "timeout" }>((resolve) =>
      setTimeout(() => resolve({ kind: "timeout" }), 30),
    ),
  ]);

  assert.equal(
    raced.kind,
    "result",
    "response should resolve before completion settles",
  );
  if (raced.kind === "result") {
    assert.equal(raced.value.ok, true);
  }

  completion.resolve("completed");
  await new Promise<void>((resolve) => setImmediate(resolve));
}

// S1-SEC-S3
async function emitsCompleteSchedulerErrorLogFields(): Promise<void> {
  const logs: Array<{ event: string; data?: Record<string, unknown> }> = [];
  const schedulerArgs: Parameters<typeof createSkillScheduler>[0] & {
    logger?: {
      error: (event: string, data?: Record<string, unknown>) => void;
    };
  } = {
    globalConcurrencyLimit: 1,
    sessionQueueLimit: 20,
    logger: {
      error: (event, data) => {
        logs.push({ event, data });
      },
    },
  };
  const scheduler = createSkillScheduler(schedulerArgs);

  const responseA = createDeferred<ServiceResult<string>>();
  const completionA = createDeferred<SkillSchedulerTerminal>();
  const responseResultPromise = scheduler.schedule({
    sessionKey: "session-s3-response",
    executionId: "exec-s3-response",
    runId: "task-s3-response",
    traceId: "trace-s3-response",
    start: () => ({
      response: responseA.promise,
      completion: completionA.promise,
    }),
  });
  responseA.reject(new Error("LOG_RESPONSE_FAILED"));
  completionA.resolve("completed");
  await responseResultPromise;

  const responseLog = logs.find(
    (entry) => entry.event === "skill_response_error",
  );
  assert.ok(responseLog, "must emit skill_response_error log");
  assert.equal(
    responseLog.data?.sessionKey,
    "session-s3-response",
    "skill_response_error.sessionKey missing",
  );
  assert.equal(
    responseLog.data?.taskId,
    "task-s3-response",
    "skill_response_error.taskId missing",
  );
  assert.equal(
    responseLog.data?.errorSource,
    "response",
    "skill_response_error.errorSource missing",
  );
  assert.equal(
    responseLog.data?.errorMessage,
    "LOG_RESPONSE_FAILED",
    "skill_response_error.errorMessage missing",
  );
  assert.equal(
    responseLog.data?.executionId,
    "exec-s3-response",
    "skill_response_error.executionId missing",
  );

  const responseB = createDeferred<ServiceResult<string>>();
  const completionB = createDeferred<SkillSchedulerTerminal>();
  const completionResultPromise = scheduler.schedule({
    sessionKey: "session-s3-completion",
    executionId: "exec-s3-completion",
    runId: "task-s3-completion",
    traceId: "trace-s3-completion",
    start: () => ({
      response: responseB.promise,
      completion: completionB.promise,
    }),
  });
  completionB.reject(new Error("LOG_COMPLETION_FAILED"));
  responseB.resolve({ ok: true, data: "ok" });
  await completionResultPromise;

  const completionLog = logs.find(
    (entry) => entry.event === "skill_completion_error",
  );
  assert.ok(completionLog, "must emit skill_completion_error log");
  assert.equal(
    completionLog.data?.sessionKey,
    "session-s3-completion",
    "skill_completion_error.sessionKey missing",
  );
  assert.equal(
    completionLog.data?.taskId,
    "task-s3-completion",
    "skill_completion_error.taskId missing",
  );
  assert.equal(
    completionLog.data?.errorSource,
    "completion",
    "skill_completion_error.errorSource missing",
  );
  assert.equal(
    completionLog.data?.errorMessage,
    "LOG_COMPLETION_FAILED",
    "skill_completion_error.errorMessage missing",
  );
  assert.equal(
    completionLog.data?.executionId,
    "exec-s3-completion",
    "skill_completion_error.executionId missing",
  );
}

await preservesResponseCompletionErrorContextInFailedPath();
await finalizesTaskTerminalStateExactlyOnceAcrossAsyncRaces();
await resolvesResultBeforeCompletionSettles();
await emitsCompleteSchedulerErrorLogFields();
