import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mock,
} from "vitest";

import { KG_SUGGESTION_CHANNEL } from "@shared/types/kg";
import type { KgSuggestionEvent } from "@shared/types/kg";
import {
  createKgRecognitionRuntime,
} from "../kgRecognitionRuntime";
import type { ServiceResult } from "../types";

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

interface MockDb {
  prepare: Mock;
  exec: Mock;
  transaction: Mock;
  stmtRun: Mock;
  stmtGet: Mock;
  stmtAll: Mock;
}

function createMockDb(): MockDb {
  const stmtRun = vi.fn().mockReturnValue({ changes: 0 });
  const stmtGet = vi.fn().mockReturnValue({ projectId: "proj-1" });
  const stmtAll = vi.fn().mockReturnValue([]);
  return {
    prepare: vi.fn(() => ({
      run: stmtRun,
      get: stmtGet,
      all: stmtAll,
    })),
    exec: vi.fn(),
    transaction: vi.fn(
      (fn: Function) =>
        (...args: unknown[]) =>
          fn(...args),
    ),
    stmtRun,
    stmtGet,
    stmtAll,
  };
}

function createMockLogger() {
  return {
    logPath: "/dev/null",
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };
}

function createMockSender() {
  return { id: 1, send: vi.fn() } as unknown as Electron.WebContents;
}

function senderCalls(sender: Electron.WebContents): Array<unknown[]> {
  return (sender.send as unknown as Mock).mock.calls;
}

type Recognizer = {
  recognize: (args: {
    projectId: string;
    documentId: string;
    sessionId: string;
    contentText: string;
    traceId: string;
  }) => Promise<ServiceResult<{
    candidates: Array<{
      name: string;
      type: "character" | "location" | "event" | "item" | "faction";
      evidence?: { source: "pattern" | "quoted" | "context"; matchedText: string };
    }>;
    degraded: boolean;
  }>>;
};

/**
 * Creates a recognizer whose promise never resolves during the test.
 * Useful for testing queue / stats while tasks remain in "running" state.
 */
function createBlockingRecognizer(): Recognizer {
  return {
    recognize: vi.fn(
      () => new Promise<ServiceResult<{ candidates: []; degraded: false }>>(() => {
        /* intentionally never resolves */
      }),
    ),
  };
}

function createImmediateRecognizer(
  candidates: Array<{
    name: string;
    type: "character" | "location" | "event" | "item" | "faction";
    evidence?: { source: "pattern" | "quoted" | "context"; matchedText: string };
  }> = [],
  degraded = false,
): Recognizer {
  return {
    recognize: vi.fn(async () => ({
      ok: true as const,
      data: { candidates, degraded },
    })),
  };
}

function createFailingRecognizer(
  code = "KG_RECOGNITION_UNAVAILABLE" as const,
  message = "recognition service unavailable",
): Recognizer {
  return {
    recognize: vi.fn(async () => ({
      ok: false as const,
      error: { code, message },
    })),
  };
}

// Convenience base args
const BASE_ENQUEUE = {
  projectId: "proj-1",
  documentId: "doc-1",
  sessionId: "sess-1",
  contentText: "some text",
  traceId: "trace-1",
  sender: null as Electron.WebContents | null,
};

/**
 * Let floating promise chains from pump() / processTask() settle.
 *
 * processTask chains resolve via microtasks, but pump() is called inside
 * .finally() which spawns more chains. A short real setTimeout yields
 * to the event loop so all chains can fully settle.
 */
async function flushAsync() {
  await new Promise((r) => setTimeout(r, 50));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("kgRecognitionRuntime – queue behaviour", () => {
  let db: MockDb;
  let logger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    db = createMockDb();
    logger = createMockLogger();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // Enqueue
  // =========================================================================
  describe("enqueue", () => {
    it("1. returns taskId and status 'started' with valid input", () => {
      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        recognizer: createImmediateRecognizer(),
      });
      const res = rt.enqueue(BASE_ENQUEUE);
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.data.taskId).toEqual(expect.any(String));
      expect(res.data.taskId!.length).toBeGreaterThan(0);
      expect(res.data.status).toBe("started");
    });

    it("2. returns 'skipped' when contentText is empty", () => {
      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        recognizer: createImmediateRecognizer(),
      });
      const res = rt.enqueue({ ...BASE_ENQUEUE, contentText: "" });
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.data.status).toBe("skipped");
      expect(res.data.taskId).toBeNull();
    });

    it("3. returns 'skipped' when contentText is whitespace only", () => {
      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        recognizer: createImmediateRecognizer(),
      });
      const res = rt.enqueue({ ...BASE_ENQUEUE, contentText: "   \t\n  " });
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.data.status).toBe("skipped");
      expect(res.data.taskId).toBeNull();
    });

    it("4. rejects empty projectId", () => {
      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        recognizer: createImmediateRecognizer(),
      });
      const res = rt.enqueue({ ...BASE_ENQUEUE, projectId: "" });
      expect(res.ok).toBe(false);
      if (res.ok) return;
      expect(res.error.code).toBe("INVALID_ARGUMENT");
    });

    it("5. rejects empty documentId", () => {
      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        recognizer: createImmediateRecognizer(),
      });
      const res = rt.enqueue({ ...BASE_ENQUEUE, documentId: "" });
      expect(res.ok).toBe(false);
      if (res.ok) return;
      expect(res.error.code).toBe("INVALID_ARGUMENT");
    });

    it("6. rejects empty sessionId", () => {
      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        recognizer: createImmediateRecognizer(),
      });
      const res = rt.enqueue({ ...BASE_ENQUEUE, sessionId: "" });
      expect(res.ok).toBe(false);
      if (res.ok) return;
      expect(res.error.code).toBe("INVALID_ARGUMENT");
    });

    it("7. rejects empty traceId", () => {
      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        recognizer: createImmediateRecognizer(),
      });
      const res = rt.enqueue({ ...BASE_ENQUEUE, traceId: "" });
      expect(res.ok).toBe(false);
      if (res.ok) return;
      expect(res.error.code).toBe("INVALID_ARGUMENT");
    });

    it("8. tasks beyond maxConcurrency receive 'queued' status", () => {
      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        recognizer: createBlockingRecognizer(),
        maxConcurrency: 1,
      });

      const first = rt.enqueue({ ...BASE_ENQUEUE, traceId: "t1" });
      expect(first.ok).toBe(true);
      if (!first.ok) return;
      expect(first.data.status).toBe("started");

      const second = rt.enqueue({ ...BASE_ENQUEUE, traceId: "t2" });
      expect(second.ok).toBe(true);
      if (!second.ok) return;
      expect(second.data.status).toBe("queued");
    });

    it("9. returns valid queuePosition (0-based within queue)", () => {
      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        recognizer: createBlockingRecognizer(),
        maxConcurrency: 1,
      });

      const r1 = rt.enqueue({ ...BASE_ENQUEUE, traceId: "t1" });
      expect(r1.ok && r1.data.queuePosition).toBe(0);

      const r2 = rt.enqueue({ ...BASE_ENQUEUE, traceId: "t2" });
      expect(r2.ok && r2.data.queuePosition).toBe(0);

      const r3 = rt.enqueue({ ...BASE_ENQUEUE, traceId: "t3" });
      expect(r3.ok && r3.data.queuePosition).toBe(1);
    });

    it("10. sender can be null without error", () => {
      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        recognizer: createImmediateRecognizer(),
      });
      const res = rt.enqueue({ ...BASE_ENQUEUE, sender: null });
      expect(res.ok).toBe(true);
    });

    it("11. maxConcurrency=1 only starts one task at a time", () => {
      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        recognizer: createBlockingRecognizer(),
        maxConcurrency: 1,
      });

      rt.enqueue({ ...BASE_ENQUEUE, traceId: "t1" });
      rt.enqueue({ ...BASE_ENQUEUE, traceId: "t2" });
      rt.enqueue({ ...BASE_ENQUEUE, traceId: "t3" });

      const stats = rt.stats({ projectId: "proj-1", sessionId: "sess-1" });
      expect(stats.ok).toBe(true);
      if (!stats.ok) return;
      expect(stats.data.running).toBe(1);
      expect(stats.data.queued).toBe(2);
    });

    it("12. maxConcurrency defaults to 4", () => {
      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        recognizer: createBlockingRecognizer(),
      });

      for (let i = 0; i < 6; i++) {
        rt.enqueue({ ...BASE_ENQUEUE, traceId: `t${i}` });
      }

      const stats = rt.stats({ projectId: "proj-1", sessionId: "sess-1" });
      expect(stats.ok).toBe(true);
      if (!stats.ok) return;
      expect(stats.data.maxConcurrency).toBe(4);
      expect(stats.data.running).toBe(4);
      expect(stats.data.queued).toBe(2);
    });

    it("13. trims whitespace from projectId before validation", () => {
      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        recognizer: createImmediateRecognizer(),
      });
      const res = rt.enqueue({ ...BASE_ENQUEUE, projectId: "  proj-1  " });
      expect(res.ok).toBe(true);
    });
  });

  // =========================================================================
  // Cancel
  // =========================================================================
  describe("cancel", () => {
    it("14. cancels a queued task", () => {
      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        recognizer: createBlockingRecognizer(),
        maxConcurrency: 1,
      });

      rt.enqueue({ ...BASE_ENQUEUE, traceId: "t1" });
      const r2 = rt.enqueue({ ...BASE_ENQUEUE, traceId: "t2" });
      expect(r2.ok).toBe(true);
      if (!r2.ok) return;
      const taskId2 = r2.data.taskId!;

      const cancelRes = rt.cancel({
        projectId: "proj-1",
        sessionId: "sess-1",
        taskId: taskId2,
      });
      expect(cancelRes.ok).toBe(true);
      if (!cancelRes.ok) return;
      expect(cancelRes.data.canceled).toBe(true);

      const stats = rt.stats({ projectId: "proj-1", sessionId: "sess-1" });
      expect(stats.ok && stats.data.queued).toBe(0);
    });

    it("15. marks a running task as canceled", () => {
      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        recognizer: createBlockingRecognizer(),
        maxConcurrency: 1,
      });

      const r1 = rt.enqueue({ ...BASE_ENQUEUE, traceId: "t1" });
      expect(r1.ok).toBe(true);
      if (!r1.ok) return;
      const taskId1 = r1.data.taskId!;

      const cancelRes = rt.cancel({
        projectId: "proj-1",
        sessionId: "sess-1",
        taskId: taskId1,
      });
      expect(cancelRes.ok).toBe(true);
      if (!cancelRes.ok) return;
      expect(cancelRes.data.canceled).toBe(true);
    });

    it("16. returns NOT_FOUND for non-existent task", () => {
      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        recognizer: createImmediateRecognizer(),
      });

      const res = rt.cancel({
        projectId: "proj-1",
        sessionId: "sess-1",
        taskId: "no-such-task",
      });
      expect(res.ok).toBe(false);
      if (res.ok) return;
      expect(res.error.code).toBe("NOT_FOUND");
    });

    it("17. rejects empty projectId", () => {
      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        recognizer: createImmediateRecognizer(),
      });
      const res = rt.cancel({ projectId: "", sessionId: "s", taskId: "t" });
      expect(res.ok).toBe(false);
      if (res.ok) return;
      expect(res.error.code).toBe("INVALID_ARGUMENT");
    });

    it("18. rejects empty sessionId", () => {
      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        recognizer: createImmediateRecognizer(),
      });
      const res = rt.cancel({ projectId: "p", sessionId: "", taskId: "t" });
      expect(res.ok).toBe(false);
      if (res.ok) return;
      expect(res.error.code).toBe("INVALID_ARGUMENT");
    });

    it("19. rejects empty taskId", () => {
      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        recognizer: createImmediateRecognizer(),
      });
      const res = rt.cancel({ projectId: "p", sessionId: "s", taskId: "" });
      expect(res.ok).toBe(false);
      if (res.ok) return;
      expect(res.error.code).toBe("INVALID_ARGUMENT");
    });

    it("20. records canceled task in canceledTaskIds metric", async () => {
      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        recognizer: createBlockingRecognizer(),
        maxConcurrency: 1,
      });

      rt.enqueue({ ...BASE_ENQUEUE, traceId: "t1" });
      const r2 = rt.enqueue({ ...BASE_ENQUEUE, traceId: "t2" });
      if (!r2.ok) return;
      const taskId2 = r2.data.taskId!;

      rt.cancel({ projectId: "proj-1", sessionId: "sess-1", taskId: taskId2 });

      const stats = rt.stats({ projectId: "proj-1", sessionId: "sess-1" });
      expect(stats.ok).toBe(true);
      if (!stats.ok) return;
      expect(stats.data.canceledTaskIds).toContain(taskId2);
    });

    it("21. requires matching projectId and sessionId", () => {
      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        recognizer: createBlockingRecognizer(),
        maxConcurrency: 1,
      });

      rt.enqueue({ ...BASE_ENQUEUE, traceId: "t1" });
      const r2 = rt.enqueue({ ...BASE_ENQUEUE, traceId: "t2" });
      if (!r2.ok) return;
      const taskId2 = r2.data.taskId!;

      // Wrong projectId
      const res1 = rt.cancel({
        projectId: "wrong-proj",
        sessionId: "sess-1",
        taskId: taskId2,
      });
      expect(res1.ok).toBe(false);

      // Wrong sessionId
      const res2 = rt.cancel({
        projectId: "proj-1",
        sessionId: "wrong-sess",
        taskId: taskId2,
      });
      expect(res2.ok).toBe(false);
    });
  });

  // =========================================================================
  // Stats
  // =========================================================================
  describe("stats", () => {
    it("22. returns initial stats (0 running, 0 queued)", () => {
      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        recognizer: createImmediateRecognizer(),
      });
      const res = rt.stats({ projectId: "proj-1", sessionId: "sess-1" });
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.data.running).toBe(0);
      expect(res.data.queued).toBe(0);
      expect(res.data.completed).toBe(0);
      expect(res.data.peakRunning).toBe(0);
      expect(res.data.completionOrder).toEqual([]);
      expect(res.data.canceledTaskIds).toEqual([]);
    });

    it("23. rejects empty projectId", () => {
      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        recognizer: createImmediateRecognizer(),
      });
      const res = rt.stats({ projectId: "", sessionId: "sess-1" });
      expect(res.ok).toBe(false);
      if (res.ok) return;
      expect(res.error.code).toBe("INVALID_ARGUMENT");
    });

    it("24. rejects empty sessionId", () => {
      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        recognizer: createImmediateRecognizer(),
      });
      const res = rt.stats({ projectId: "proj-1", sessionId: "" });
      expect(res.ok).toBe(false);
      if (res.ok) return;
      expect(res.error.code).toBe("INVALID_ARGUMENT");
    });

    it("25. reflects maxConcurrency setting", () => {
      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        recognizer: createImmediateRecognizer(),
        maxConcurrency: 7,
      });
      const res = rt.stats({ projectId: "p", sessionId: "s" });
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.data.maxConcurrency).toBe(7);
    });

    it("26. tracks peakRunning", () => {
      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        recognizer: createBlockingRecognizer(),
        maxConcurrency: 3,
      });

      rt.enqueue({ ...BASE_ENQUEUE, traceId: "t1" });
      rt.enqueue({ ...BASE_ENQUEUE, traceId: "t2" });
      rt.enqueue({ ...BASE_ENQUEUE, traceId: "t3" });

      const stats = rt.stats({ projectId: "proj-1", sessionId: "sess-1" });
      expect(stats.ok).toBe(true);
      if (!stats.ok) return;
      expect(stats.data.peakRunning).toBe(3);
    });
  });

  // =========================================================================
  // AcceptSuggestion
  // =========================================================================
  describe("acceptSuggestion", () => {
    it("27. rejects empty projectId", () => {
      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        recognizer: createImmediateRecognizer(),
      });
      const res = rt.acceptSuggestion({
        projectId: "",
        sessionId: "s",
        suggestionId: "sg",
      });
      expect(res.ok).toBe(false);
      if (res.ok) return;
      expect(res.error.code).toBe("INVALID_ARGUMENT");
    });

    it("28. rejects empty sessionId", () => {
      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        recognizer: createImmediateRecognizer(),
      });
      const res = rt.acceptSuggestion({
        projectId: "p",
        sessionId: "",
        suggestionId: "sg",
      });
      expect(res.ok).toBe(false);
      if (res.ok) return;
      expect(res.error.code).toBe("INVALID_ARGUMENT");
    });

    it("29. rejects empty suggestionId", () => {
      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        recognizer: createImmediateRecognizer(),
      });
      const res = rt.acceptSuggestion({
        projectId: "p",
        sessionId: "s",
        suggestionId: "",
      });
      expect(res.ok).toBe(false);
      if (res.ok) return;
      expect(res.error.code).toBe("INVALID_ARGUMENT");
    });

    it("30. returns NOT_FOUND for unknown suggestionId", () => {
      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        recognizer: createImmediateRecognizer(),
      });
      const res = rt.acceptSuggestion({
        projectId: "proj-1",
        sessionId: "sess-1",
        suggestionId: "nonexistent",
      });
      expect(res.ok).toBe(false);
      if (res.ok) return;
      expect(res.error.code).toBe("NOT_FOUND");
    });

    it("31. returns NOT_FOUND when suggestion belongs to different session", async () => {
      const sender = createMockSender();
      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        recognizer: createImmediateRecognizer([
          { name: "张三", type: "character" },
        ]),
      });

      rt.enqueue({
        ...BASE_ENQUEUE,
        sessionId: "sess-A",
        contentText: "张三来了",
        sender,
      });

      await flushAsync();

      const sentCall = senderCalls(sender).find(
        (c: unknown[]) => c[0] === KG_SUGGESTION_CHANNEL,
      );
      if (!sentCall) {
        expect.fail("expected suggestion event to be sent");
        return;
      }
      const event = sentCall[1] as KgSuggestionEvent;

      const res = rt.acceptSuggestion({
        projectId: "proj-1",
        sessionId: "sess-OTHER",
        suggestionId: event.suggestionId,
      });
      expect(res.ok).toBe(false);
      if (res.ok) return;
      expect(res.error.code).toBe("NOT_FOUND");
    });

    it("32. returns NOT_FOUND when suggestion belongs to different project", async () => {
      const sender = createMockSender();
      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        recognizer: createImmediateRecognizer([
          { name: "张三", type: "character" },
        ]),
      });

      rt.enqueue({
        ...BASE_ENQUEUE,
        projectId: "proj-A",
        sessionId: "sess-1",
        contentText: "张三来了",
        sender,
      });

      await flushAsync();

      const sentCall = senderCalls(sender).find(
        (c: unknown[]) => c[0] === KG_SUGGESTION_CHANNEL,
      );
      if (!sentCall) {
        expect.fail("expected suggestion event to be sent");
        return;
      }
      const event = sentCall[1] as KgSuggestionEvent;

      const res = rt.acceptSuggestion({
        projectId: "proj-OTHER",
        sessionId: "sess-1",
        suggestionId: event.suggestionId,
      });
      expect(res.ok).toBe(false);
      if (res.ok) return;
      expect(res.error.code).toBe("NOT_FOUND");
    });

    it("33. accepts valid suggestion and removes it from session", async () => {
      const sender = createMockSender();

      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        recognizer: createImmediateRecognizer([
          { name: "张三", type: "character" },
        ]),
      });

      rt.enqueue({
        ...BASE_ENQUEUE,
        contentText: "张三来了",
        sender,
      });

      await flushAsync();

      const sentCall = senderCalls(sender).find(
        (c: unknown[]) => c[0] === KG_SUGGESTION_CHANNEL,
      );
      if (!sentCall) {
        expect.fail("expected suggestion event");
        return;
      }
      const event = sentCall[1] as KgSuggestionEvent;

      // entityCreate hits KG_ENTITY_DUPLICATE (stmtGet always truthy).
      // The fallback path calls entityList; mock it to return a matching entity.
      db.stmtAll.mockReturnValue([
        {
          id: "ent-1",
          projectId: "proj-1",
          type: "character",
          name: "张三",
          description: "",
          attributesJson: "{}",
          lastSeenState: null,
          aiContextLevel: "when_detected",
          aliasesJson: "[]",
          version: 1,
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ]);

      const acceptRes = rt.acceptSuggestion({
        projectId: "proj-1",
        sessionId: "sess-1",
        suggestionId: event.suggestionId,
      });
      expect(acceptRes.ok).toBe(true);

      // Second accept should NOT_FOUND since suggestion was removed
      const secondAccept = rt.acceptSuggestion({
        projectId: "proj-1",
        sessionId: "sess-1",
        suggestionId: event.suggestionId,
      });
      expect(secondAccept.ok).toBe(false);
    });
  });

  // =========================================================================
  // DismissSuggestion
  // =========================================================================
  describe("dismissSuggestion", () => {
    it("34. rejects empty projectId", () => {
      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        recognizer: createImmediateRecognizer(),
      });
      const res = rt.dismissSuggestion({
        projectId: "",
        sessionId: "s",
        suggestionId: "sg",
      });
      expect(res.ok).toBe(false);
      if (res.ok) return;
      expect(res.error.code).toBe("INVALID_ARGUMENT");
    });

    it("35. rejects empty sessionId", () => {
      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        recognizer: createImmediateRecognizer(),
      });
      const res = rt.dismissSuggestion({
        projectId: "p",
        sessionId: "",
        suggestionId: "sg",
      });
      expect(res.ok).toBe(false);
      if (res.ok) return;
      expect(res.error.code).toBe("INVALID_ARGUMENT");
    });

    it("36. rejects empty suggestionId", () => {
      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        recognizer: createImmediateRecognizer(),
      });
      const res = rt.dismissSuggestion({
        projectId: "p",
        sessionId: "s",
        suggestionId: "",
      });
      expect(res.ok).toBe(false);
      if (res.ok) return;
      expect(res.error.code).toBe("INVALID_ARGUMENT");
    });

    it("37. returns NOT_FOUND for unknown suggestionId", () => {
      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        recognizer: createImmediateRecognizer(),
      });
      const res = rt.dismissSuggestion({
        projectId: "proj-1",
        sessionId: "sess-1",
        suggestionId: "nonexistent",
      });
      expect(res.ok).toBe(false);
      if (res.ok) return;
      expect(res.error.code).toBe("NOT_FOUND");
    });

    it("38. returns NOT_FOUND for suggestion in wrong session", async () => {
      const sender = createMockSender();
      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        recognizer: createImmediateRecognizer([
          { name: "李四", type: "character" },
        ]),
      });

      rt.enqueue({
        ...BASE_ENQUEUE,
        sessionId: "sess-A",
        contentText: "李四走了",
        sender,
      });

      await flushAsync();

      const sentCall = senderCalls(sender).find(
        (c: unknown[]) => c[0] === KG_SUGGESTION_CHANNEL,
      );
      if (!sentCall) {
        expect.fail("expected suggestion event");
        return;
      }
      const event = sentCall[1] as KgSuggestionEvent;

      const res = rt.dismissSuggestion({
        projectId: "proj-1",
        sessionId: "sess-OTHER",
        suggestionId: event.suggestionId,
      });
      expect(res.ok).toBe(false);
      if (res.ok) return;
      expect(res.error.code).toBe("NOT_FOUND");
    });

    it("39. dismisses valid suggestion and removes it from session", async () => {
      const sender = createMockSender();
      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        recognizer: createImmediateRecognizer([
          { name: "李四", type: "character" },
        ]),
      });

      rt.enqueue({
        ...BASE_ENQUEUE,
        contentText: "李四来了",
        sender,
      });

      await flushAsync();

      const sentCall = senderCalls(sender).find(
        (c: unknown[]) => c[0] === KG_SUGGESTION_CHANNEL,
      );
      if (!sentCall) {
        expect.fail("expected suggestion event");
        return;
      }
      const event = sentCall[1] as KgSuggestionEvent;

      const dismissRes = rt.dismissSuggestion({
        projectId: "proj-1",
        sessionId: "sess-1",
        suggestionId: event.suggestionId,
      });
      expect(dismissRes.ok).toBe(true);
      if (!dismissRes.ok) return;
      expect(dismissRes.data.dismissed).toBe(true);

      // Second dismiss should NOT_FOUND
      const secondDismiss = rt.dismissSuggestion({
        projectId: "proj-1",
        sessionId: "sess-1",
        suggestionId: event.suggestionId,
      });
      expect(secondDismiss.ok).toBe(false);
    });
  });

  // =========================================================================
  // Processing Pipeline
  // =========================================================================
  describe("processing pipeline", () => {
    it("40. recognizer is called with correct args", async () => {
      const recognizer = createImmediateRecognizer();
      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        recognizer,
      });

      rt.enqueue({
        projectId: "proj-X",
        documentId: "doc-Y",
        sessionId: "sess-Z",
        contentText: "Hello world",
        traceId: "trace-W",
        sender: null,
      });

      await flushAsync();

      expect(recognizer.recognize).toHaveBeenCalledWith({
        projectId: "proj-X",
        documentId: "doc-Y",
        sessionId: "sess-Z",
        contentText: "Hello world",
        traceId: "trace-W",
      });
    });

    it("41. sends suggestion events to sender via KG_SUGGESTION_CHANNEL", async () => {
      const sender = createMockSender();
      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        recognizer: createImmediateRecognizer([
          { name: "王五", type: "character" },
        ]),
      });

      rt.enqueue({ ...BASE_ENQUEUE, contentText: "王五来了", sender });

      await flushAsync();

      const suggestionCalls = senderCalls(sender).filter(
        (c: unknown[]) => c[0] === KG_SUGGESTION_CHANNEL,
      );
      expect(suggestionCalls.length).toBeGreaterThanOrEqual(1);

      const payload = suggestionCalls[0][1] as KgSuggestionEvent;
      expect(payload.name).toBe("王五");
      expect(payload.type).toBe("character");
      expect(payload.projectId).toBe("proj-1");
      expect(payload.sessionId).toBe("sess-1");
      expect(payload.taskId).toEqual(expect.any(String));
      expect(payload.suggestionId).toEqual(expect.any(String));
    });

    it("42. skips candidates that match existing entities", async () => {
      const sender = createMockSender();
      // entityList returns an existing entity named 张三
      db.stmtAll.mockReturnValue([
        {
          id: "ent-existing",
          project_id: "proj-1",
          type: "character",
          name: "张三",
          description: "",
          attributes_json: "{}",
          last_seen_state: null,
          ai_context_level: "when_detected",
          aliases_json: "[]",
          version: 1,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ]);

      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        recognizer: createImmediateRecognizer([
          { name: "张三", type: "character" },
          { name: "李四", type: "character" },
        ]),
      });

      rt.enqueue({ ...BASE_ENQUEUE, contentText: "张三和李四", sender });

      await flushAsync();

      const suggestionCalls = senderCalls(sender).filter(
        (c: unknown[]) => c[0] === KG_SUGGESTION_CHANNEL,
      );

      // Only 李四 should be suggested, 张三 is already an entity
      const names = suggestionCalls.map(
        (c: unknown[]) => (c[1] as KgSuggestionEvent).name,
      );
      expect(names).not.toContain("张三");
      expect(names).toContain("李四");
    });

    it("43. skips dismissed candidates", async () => {
      const sender = createMockSender();
      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        recognizer: createImmediateRecognizer([
          { name: "赵六", type: "character" },
        ]),
      });

      // First enqueue to get a suggestion
      rt.enqueue({
        ...BASE_ENQUEUE,
        contentText: "赵六出场",
        sender,
        traceId: "t-first",
      });
      await flushAsync();

      const firstCalls = senderCalls(sender).filter(
        (c: unknown[]) => c[0] === KG_SUGGESTION_CHANNEL,
      );
      expect(firstCalls.length).toBe(1);
      const event = firstCalls[0][1] as KgSuggestionEvent;

      // Dismiss it
      rt.dismissSuggestion({
        projectId: "proj-1",
        sessionId: "sess-1",
        suggestionId: event.suggestionId,
      });

      // Reset send mock to count only new calls
      (sender.send as unknown as Mock).mockClear();

      // Second enqueue with same candidate
      rt.enqueue({
        ...BASE_ENQUEUE,
        contentText: "赵六再次出场",
        sender,
        traceId: "t-second",
      });
      await flushAsync();

      const secondCalls = senderCalls(sender).filter(
        (c: unknown[]) => c[0] === KG_SUGGESTION_CHANNEL,
      );
      // 赵六 should not appear again since it was dismissed
      const names = secondCalls.map(
        (c: unknown[]) => (c[1] as KgSuggestionEvent).name,
      );
      expect(names).not.toContain("赵六");
    });

    it("44. handles recognizer failure gracefully", async () => {
      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        recognizer: createFailingRecognizer(),
      });

      rt.enqueue(BASE_ENQUEUE);
      await flushAsync();

      expect(logger.error).toHaveBeenCalled();
      // Runtime should still be operational
      const stats = rt.stats({ projectId: "proj-1", sessionId: "sess-1" });
      expect(stats.ok).toBe(true);
    });

    it("45. handles recognizer returning degraded=true", async () => {
      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        recognizer: createImmediateRecognizer([], true),
      });

      rt.enqueue({ ...BASE_ENQUEUE, contentText: "some text" });
      await flushAsync();

      const degradedCalls = logger.error.mock.calls.filter(
        (c: unknown[]) => c[0] === "kg_recognition_degraded",
      );
      expect(degradedCalls.length).toBe(1);
    });

    it("46. canceled running task produces no suggestions", async () => {
      const sender = createMockSender();
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      let resolveRecognize: () => void = () => {};

      const recognizer: Recognizer = {
        recognize: () =>
          new Promise((resolve) => {
            resolveRecognize = () =>
              resolve({
                ok: true,
                data: {
                  candidates: [{ name: "周七", type: "character" as const }],
                  degraded: false,
                },
              });
          }),
      };

      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        recognizer,
        maxConcurrency: 1,
      });

      const r1 = rt.enqueue({
        ...BASE_ENQUEUE,
        contentText: "周七出场",
        sender,
      });
      if (!r1.ok) return;

      // Cancel while recognizer is still running
      rt.cancel({
        projectId: "proj-1",
        sessionId: "sess-1",
        taskId: r1.data.taskId!,
      });

      // Now resolve the recognizer
      resolveRecognize();
      await flushAsync();

      const suggestionCalls = senderCalls(sender).filter(
        (c: unknown[]) => c[0] === KG_SUGGESTION_CHANNEL,
      );
      expect(suggestionCalls.length).toBe(0);
    });

    it("47. multiple suggestions from one task", async () => {
      const sender = createMockSender();
      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        recognizer: createImmediateRecognizer([
          { name: "陈九", type: "character" },
          { name: "风雪城", type: "location" },
          { name: "倚天神剑", type: "item" },
        ]),
      });

      rt.enqueue({ ...BASE_ENQUEUE, contentText: "陈九在风雪城找到倚天神剑", sender });
      await flushAsync();

      const suggestionCalls = senderCalls(sender).filter(
        (c: unknown[]) => c[0] === KG_SUGGESTION_CHANNEL,
      );
      expect(suggestionCalls.length).toBe(3);

      const names = suggestionCalls.map(
        (c: unknown[]) => (c[1] as KgSuggestionEvent).name,
      );
      expect(names).toContain("陈九");
      expect(names).toContain("风雪城");
      expect(names).toContain("倚天神剑");
    });

    it("48. pump drains queue after task completion", async () => {
      let resolvers: Array<() => void> = [];

      const recognizer: Recognizer = {
        recognize: vi.fn(
          () =>
            new Promise<ServiceResult<{ candidates: []; degraded: false }>>((resolve) => {
              resolvers.push(() =>
                resolve({ ok: true, data: { candidates: [], degraded: false } }),
              );
            }),
        ),
      };

      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        recognizer,
        maxConcurrency: 1,
      });

      rt.enqueue({ ...BASE_ENQUEUE, traceId: "t1" });
      rt.enqueue({ ...BASE_ENQUEUE, traceId: "t2" });
      rt.enqueue({ ...BASE_ENQUEUE, traceId: "t3" });

      let stats = rt.stats({ projectId: "proj-1", sessionId: "sess-1" });
      expect(stats.ok && stats.data.running).toBe(1);
      expect(stats.ok && stats.data.queued).toBe(2);

      // Complete first task
      resolvers[0]?.();
      await flushAsync();

      stats = rt.stats({ projectId: "proj-1", sessionId: "sess-1" });
      expect(stats.ok && stats.data.running).toBe(1);
      expect(stats.ok && stats.data.queued).toBe(1);

      // Complete second task
      resolvers[1]?.();
      await flushAsync();

      stats = rt.stats({ projectId: "proj-1", sessionId: "sess-1" });
      expect(stats.ok && stats.data.running).toBe(1);
      expect(stats.ok && stats.data.queued).toBe(0);
    });

    it("49. pump respects maxConcurrency during concurrent processing", () => {
      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        recognizer: createBlockingRecognizer(),
        maxConcurrency: 2,
      });

      for (let i = 0; i < 5; i++) {
        rt.enqueue({ ...BASE_ENQUEUE, traceId: `t${i}` });
      }

      const stats = rt.stats({ projectId: "proj-1", sessionId: "sess-1" });
      expect(stats.ok).toBe(true);
      if (!stats.ok) return;
      expect(stats.data.running).toBe(2);
      expect(stats.data.queued).toBe(3);
    });

    it("50. completionOrder tracks completed tasks in order", async () => {
      let resolvers: Array<() => void> = [];

      const recognizer: Recognizer = {
        recognize: vi.fn(
          () =>
            new Promise<ServiceResult<{ candidates: []; degraded: false }>>((resolve) => {
              resolvers.push(() =>
                resolve({ ok: true, data: { candidates: [], degraded: false } }),
              );
            }),
        ),
      };

      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        recognizer,
        maxConcurrency: 2,
      });

      const r1 = rt.enqueue({ ...BASE_ENQUEUE, traceId: "t1" });
      const r2 = rt.enqueue({ ...BASE_ENQUEUE, traceId: "t2" });
      if (!r1.ok || !r2.ok) return;

      // Complete second first
      resolvers[1]?.();
      await flushAsync();
      resolvers[0]?.();
      await flushAsync();

      const stats = rt.stats({ projectId: "proj-1", sessionId: "sess-1" });
      expect(stats.ok).toBe(true);
      if (!stats.ok) return;
      expect(stats.data.completionOrder).toHaveLength(2);
      expect(stats.data.completionOrder[0]).toBe(r2.data.taskId);
      expect(stats.data.completionOrder[1]).toBe(r1.data.taskId);
    });
  });

  // =========================================================================
  // Mock Recognizer (built-in default)
  // =========================================================================
  describe("default mock recognizer", () => {
    it("51. detects Chinese character names (surname patterns)", async () => {
      const sender = createMockSender();
      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        // No recognizer → uses built-in mock
      });

      rt.enqueue({
        ...BASE_ENQUEUE,
        contentText: "张三走进了大厅，看到李四正在等候。",
        sender,
      });
      await flushAsync();

      const calls = senderCalls(sender).filter(
        (c: unknown[]) => c[0] === KG_SUGGESTION_CHANNEL,
      );
      const names = calls.map((c: unknown[]) => (c[1] as KgSuggestionEvent).name);
      expect(names).toContain("张三");
      expect(names).toContain("李四");

      // All should be "character" type
      for (const call of calls) {
        const payload = call[1] as KgSuggestionEvent;
        if (payload.name === "张三" || payload.name === "李四") {
          expect(payload.type).toBe("character");
        }
      }
    });

    it("52. detects quoted entities with 「…」", async () => {
      const sender = createMockSender();
      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
      });

      rt.enqueue({
        ...BASE_ENQUEUE,
        contentText: "他拿出了「九阳真经」开始修炼。",
        sender,
      });
      await flushAsync();

      const calls = senderCalls(sender).filter(
        (c: unknown[]) => c[0] === KG_SUGGESTION_CHANNEL,
      );
      const names = calls.map((c: unknown[]) => (c[1] as KgSuggestionEvent).name);
      expect(names).toContain("九阳真经");
    });

    it("53. detects location suffixes (e.g., 风雪城)", async () => {
      const sender = createMockSender();
      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
      });

      rt.enqueue({
        ...BASE_ENQUEUE,
        contentText: "一行人抵达了风雪城，城门紧闭。",
        sender,
      });
      await flushAsync();

      const calls = senderCalls(sender).filter(
        (c: unknown[]) => c[0] === KG_SUGGESTION_CHANNEL,
      );
      const events = calls.map((c: unknown[]) => c[1] as KgSuggestionEvent);
      const locationEvent = events.find((e) => e.name === "风雪城");
      expect(locationEvent).toBeDefined();
      expect(locationEvent?.type).toBe("location");
    });

    it("54. detects event suffixes (e.g., 武林大会)", async () => {
      const sender = createMockSender();
      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
      });

      rt.enqueue({
        ...BASE_ENQUEUE,
        contentText: "三年一度的武林大会即将开始。",
        sender,
      });
      await flushAsync();

      const calls = senderCalls(sender).filter(
        (c: unknown[]) => c[0] === KG_SUGGESTION_CHANNEL,
      );
      const events = calls.map((c: unknown[]) => c[1] as KgSuggestionEvent);
      const eventSuggestion = events.find((e) => e.name === "武林大会");
      expect(eventSuggestion).toBeDefined();
      expect(eventSuggestion?.type).toBe("event");
    });

    it("55. detects item suffixes (e.g., 倚天神剑)", async () => {
      const sender = createMockSender();
      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
      });

      rt.enqueue({
        ...BASE_ENQUEUE,
        contentText: "传说中的倚天神剑终于现世。",
        sender,
      });
      await flushAsync();

      const calls = senderCalls(sender).filter(
        (c: unknown[]) => c[0] === KG_SUGGESTION_CHANNEL,
      );
      const events = calls.map((c: unknown[]) => c[1] as KgSuggestionEvent);
      const itemSuggestion = events.find((e) => e.name === "倚天神剑");
      expect(itemSuggestion).toBeDefined();
      expect(itemSuggestion?.type).toBe("item");
    });
  });

  // =========================================================================
  // Edge Cases
  // =========================================================================
  describe("edge cases", () => {
    it("56. maxConcurrency < 1 is normalized to 1", () => {
      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        recognizer: createBlockingRecognizer(),
        maxConcurrency: 0,
      });

      rt.enqueue({ ...BASE_ENQUEUE, traceId: "t1" });
      rt.enqueue({ ...BASE_ENQUEUE, traceId: "t2" });

      const stats = rt.stats({ projectId: "proj-1", sessionId: "sess-1" });
      expect(stats.ok).toBe(true);
      if (!stats.ok) return;
      expect(stats.data.maxConcurrency).toBe(1);
      expect(stats.data.running).toBe(1);
      expect(stats.data.queued).toBe(1);
    });

    it("57. negative maxConcurrency is normalized to 1", () => {
      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        recognizer: createImmediateRecognizer(),
        maxConcurrency: -5,
      });

      const stats = rt.stats({ projectId: "p", sessionId: "s" });
      expect(stats.ok).toBe(true);
      if (!stats.ok) return;
      expect(stats.data.maxConcurrency).toBe(1);
    });

    it("58. concurrent enqueue + cancel interaction", () => {
      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        recognizer: createBlockingRecognizer(),
        maxConcurrency: 1,
      });

      rt.enqueue({ ...BASE_ENQUEUE, traceId: "t1" });
      const r2 = rt.enqueue({ ...BASE_ENQUEUE, traceId: "t2" });
      const r3 = rt.enqueue({ ...BASE_ENQUEUE, traceId: "t3" });

      if (!r2.ok || !r3.ok) return;

      // Cancel middle task from queue
      rt.cancel({ projectId: "proj-1", sessionId: "sess-1", taskId: r2.data.taskId! });

      const stats = rt.stats({ projectId: "proj-1", sessionId: "sess-1" });
      expect(stats.ok).toBe(true);
      if (!stats.ok) return;
      expect(stats.data.running).toBe(1);
      expect(stats.data.queued).toBe(1); // Only t3 should remain
    });

    it("59. multiple sessions are isolated (dismissed keys don't leak)", async () => {
      const senderA = createMockSender();
      const senderB = createMockSender();

      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        recognizer: createImmediateRecognizer([
          { name: "孙八", type: "character" },
        ]),
      });

      // Session A: enqueue, get suggestion, dismiss it
      rt.enqueue({
        ...BASE_ENQUEUE,
        sessionId: "sess-A",
        contentText: "孙八来了",
        sender: senderA,
        traceId: "tA1",
      });
      await flushAsync();

      const callsA = senderCalls(senderA).filter(
        (c: unknown[]) => c[0] === KG_SUGGESTION_CHANNEL,
      );
      expect(callsA.length).toBe(1);
      const eventA = callsA[0][1] as KgSuggestionEvent;

      rt.dismissSuggestion({
        projectId: "proj-1",
        sessionId: "sess-A",
        suggestionId: eventA.suggestionId,
      });

      // Session B: same candidate should still appear since it's a different session
      rt.enqueue({
        ...BASE_ENQUEUE,
        sessionId: "sess-B",
        contentText: "孙八来了",
        sender: senderB,
        traceId: "tB1",
      });
      await flushAsync();

      const callsB = senderCalls(senderB).filter(
        (c: unknown[]) => c[0] === KG_SUGGESTION_CHANNEL,
      );
      const namesB = callsB.map(
        (c: unknown[]) => (c[1] as KgSuggestionEvent).name,
      );
      expect(namesB).toContain("孙八");
    });

    it("60. deduplication: same candidate not suggested twice in same session", async () => {
      const sender = createMockSender();
      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        recognizer: createImmediateRecognizer([
          { name: "钱十", type: "character" },
        ]),
      });

      // First enqueue
      rt.enqueue({
        ...BASE_ENQUEUE,
        contentText: "钱十出场",
        sender,
        traceId: "t-dup-1",
      });
      await flushAsync();

      // Second enqueue with same candidate (without dismissing or accepting)
      rt.enqueue({
        ...BASE_ENQUEUE,
        contentText: "钱十再次出场",
        sender,
        traceId: "t-dup-2",
      });
      await flushAsync();

      const calls = senderCalls(sender).filter(
        (c: unknown[]) => c[0] === KG_SUGGESTION_CHANNEL,
      );

      // 钱十 should only appear once across both tasks
      const qianNames = calls.filter(
        (c: unknown[]) => (c[1] as KgSuggestionEvent).name === "钱十",
      );
      expect(qianNames.length).toBe(1);
    });

    it("61. sender.send throwing does not crash the runtime", async () => {
      const badSender = {
        id: 1,
        send: vi.fn(() => {
          throw new Error("WebContents destroyed");
        }),
      } as unknown as Electron.WebContents;

      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        recognizer: createImmediateRecognizer([
          { name: "郑十一", type: "character" },
        ]),
      });

      rt.enqueue({
        ...BASE_ENQUEUE,
        contentText: "郑十一来了",
        sender: badSender,
      });
      await flushAsync();

      // Runtime should log error but not crash
      expect(logger.error).toHaveBeenCalled();

      // Runtime still operational
      const stats = rt.stats({ projectId: "proj-1", sessionId: "sess-1" });
      expect(stats.ok).toBe(true);
    });

    it("62. whitespace-only fields are treated as empty and rejected", () => {
      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        recognizer: createImmediateRecognizer(),
      });

      const res = rt.enqueue({ ...BASE_ENQUEUE, projectId: "   " });
      expect(res.ok).toBe(false);
      if (res.ok) return;
      expect(res.error.code).toBe("INVALID_ARGUMENT");
    });

    it("63. recognizer throwing an exception is handled gracefully", async () => {
      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        recognizer: {
          recognize: vi.fn(async () => {
            throw new Error("unexpected crash");
          }),
        },
      });

      rt.enqueue(BASE_ENQUEUE);
      await flushAsync();

      // Error should be logged
      expect(logger.error).toHaveBeenCalled();

      // Runtime still operational
      const stats = rt.stats({ projectId: "proj-1", sessionId: "sess-1" });
      expect(stats.ok).toBe(true);
    });

    it("64. enqueue many tasks rapidly does not lose any", () => {
      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        recognizer: createBlockingRecognizer(),
        maxConcurrency: 2,
      });

      const taskIds: string[] = [];
      for (let i = 0; i < 10; i++) {
        const res = rt.enqueue({ ...BASE_ENQUEUE, traceId: `rapid-${i}` });
        expect(res.ok).toBe(true);
        if (res.ok) taskIds.push(res.data.taskId!);
      }

      expect(taskIds).toHaveLength(10);
      // All taskIds should be unique
      expect(new Set(taskIds).size).toBe(10);

      const stats = rt.stats({ projectId: "proj-1", sessionId: "sess-1" });
      expect(stats.ok).toBe(true);
      if (!stats.ok) return;
      expect(stats.data.running + stats.data.queued).toBe(10);
    });

    it("65. compound surname detection (e.g., 欧阳, 司马)", async () => {
      const sender = createMockSender();
      const rt = createKgRecognitionRuntime({
        db: db as any,
        logger,
        // Uses built-in mock recognizer
      });

      // Separate names with punctuation to avoid greedy CJK matching overlap
      rt.enqueue({
        ...BASE_ENQUEUE,
        contentText: "欧阳锋出现了。司马懿也来了。",
        sender,
      });
      await flushAsync();

      const calls = senderCalls(sender).filter(
        (c: unknown[]) => c[0] === KG_SUGGESTION_CHANNEL,
      );
      const names = calls.map((c: unknown[]) => (c[1] as KgSuggestionEvent).name);
      expect(names).toContain("欧阳锋");
      expect(names).toContain("司马懿");
    });
  });
});
