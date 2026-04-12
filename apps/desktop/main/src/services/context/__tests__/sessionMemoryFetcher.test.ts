/**
 * sessionMemoryFetcher.test.ts — L1 context fetcher tests
 *
 * Covers:
 *  - Injects session memory into context chunks
 *  - Returns empty chunks + warning when sessionId absent
 *  - Returns empty chunks + warning on service error
 *  - Returns SESSION_MEMORY_EMPTY warning on empty result
 *  - Passes truncated flag through
 *  - Degradation counter behaviour
 */

import { describe, it, expect, vi } from "vitest";
import { createSessionMemoryFetcher } from "../fetchers/sessionMemoryFetcher";
import type { ContextAssembleRequest } from "../types";

// ─── helpers ────────────────────────────────────────────────────────────────

function makeRequest(overrides?: Partial<ContextAssembleRequest>): ContextAssembleRequest {
  return {
    projectId: "proj-1",
    documentId: "doc-1",
    cursorPosition: 0,
    skillId: "continue",
    ...overrides,
  };
}

function makeInjectOk(injectedText: string, truncated = false) {
  return vi.fn().mockResolvedValue({
    ok: true as const,
    data: {
      entries: [],
      injectedText,
      tokenCount: injectedText.length,
      truncated,
    },
  });
}

function makeInjectErr(code: string, message: string) {
  return vi.fn().mockResolvedValue({
    ok: false as const,
    error: { code, message },
  });
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe("createSessionMemoryFetcher", () => {
  it("returns empty chunks when sessionId is not provided", async () => {
    const injectForContext = makeInjectOk("some text");
    const fetcher = createSessionMemoryFetcher({
      sessionMemoryService: { injectForContext },
      // no sessionId
    });

    const result = await fetcher(makeRequest());
    expect(result.chunks).toHaveLength(0);
    expect(injectForContext).not.toHaveBeenCalled();
  });

  it("injects content as a session_memory:l1 chunk", async () => {
    const text = "[会话记忆 — L1 自动注入]\n[style] formal";
    const injectForContext = makeInjectOk(text);
    const fetcher = createSessionMemoryFetcher({
      sessionMemoryService: { injectForContext },
      sessionId: "sess-1",
    });

    const result = await fetcher(makeRequest());
    expect(result.chunks).toHaveLength(1);
    expect(result.chunks[0]?.source).toBe("session_memory:l1");
    expect(result.chunks[0]?.content).toBe(text);
    expect(result.chunks[0]?.projectId).toBe("proj-1");
  });

  it("passes truncated flag when injection was truncated", async () => {
    const injectForContext = makeInjectOk("long text", true);
    const fetcher = createSessionMemoryFetcher({
      sessionMemoryService: { injectForContext },
      sessionId: "sess-1",
    });

    const result = await fetcher(makeRequest());
    expect(result.truncated).toBe(true);
  });

  it("passes additionalInput as queryText to injectForContext", async () => {
    const injectForContext = makeInjectOk("result");
    const fetcher = createSessionMemoryFetcher({
      sessionMemoryService: { injectForContext },
      sessionId: "sess-1",
    });

    await fetcher(makeRequest({ additionalInput: "dark theme" }));
    expect(injectForContext).toHaveBeenCalledWith(
      expect.objectContaining({ queryText: "dark theme" }),
    );
  });

  it("returns warning when injectedText is empty", async () => {
    const injectForContext = makeInjectOk("");
    const fetcher = createSessionMemoryFetcher({
      sessionMemoryService: { injectForContext },
      sessionId: "sess-1",
    });

    const result = await fetcher(makeRequest());
    expect(result.chunks).toHaveLength(0);
    expect(result.warnings).toContain(
      "SESSION_MEMORY_EMPTY: 无可用会话记忆",
    );
  });

  it("returns warning and empty chunks on service error", async () => {
    const injectForContext = makeInjectErr("DB_ERROR", "db failed");
    const logger = { info: vi.fn(), error: vi.fn() };
    const fetcher = createSessionMemoryFetcher({
      sessionMemoryService: { injectForContext },
      sessionId: "sess-1",
      logger,
    });

    const result = await fetcher(makeRequest());
    expect(result.chunks).toHaveLength(0);
    expect(result.warnings).toContain(
      "SESSION_MEMORY_UNAVAILABLE: L1 会话记忆未注入",
    );
  });

  it("returns warning and empty chunks on exception", async () => {
    const injectForContext = vi.fn().mockRejectedValue(new Error("unexpected"));
    const logger = { info: vi.fn(), error: vi.fn() };
    const fetcher = createSessionMemoryFetcher({
      sessionMemoryService: { injectForContext },
      sessionId: "sess-1",
      logger,
    });

    const result = await fetcher(makeRequest());
    expect(result.chunks).toHaveLength(0);
    expect(result.warnings).toContain(
      "SESSION_MEMORY_UNAVAILABLE: L1 会话记忆未注入",
    );
  });

  it("increments degradation counter on repeated failures", async () => {
    const injectForContext = makeInjectErr("DB_ERROR", "fail");
    const logger = { info: vi.fn(), error: vi.fn() };
    const fetcher = createSessionMemoryFetcher({
      sessionMemoryService: { injectForContext },
      sessionId: "sess-1",
      logger,
    });

    const req = makeRequest();
    await fetcher(req);
    await fetcher(req);
    await fetcher(req);

    // logger.error should have been called by degradation escalation after repeated failures
    // (DegradationCounter default threshold triggers escalation)
    expect(logger.error).toHaveBeenCalled();
  });

  it("resets degradation counter on success", async () => {
    const injectForContext = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, error: { code: "DB_ERROR", message: "fail" } })
      .mockResolvedValue({
        ok: true,
        data: { entries: [], injectedText: "content", tokenCount: 7, truncated: false },
      });

    const logger = { info: vi.fn(), error: vi.fn() };
    const fetcher = createSessionMemoryFetcher({
      sessionMemoryService: { injectForContext },
      sessionId: "sess-1",
      logger,
    });

    const req = makeRequest();
    await fetcher(req); // failure
    const result = await fetcher(req); // success

    expect(result.chunks).toHaveLength(1);
    expect(result.chunks[0]?.source).toBe("session_memory:l1");
  });

  it("uses request.sessionId when deps.sessionId is absent", async () => {
    const injectForContext = makeInjectOk("[会话记忆 — L1 自动注入]\n[note] from request");
    const fetcher = createSessionMemoryFetcher({
      sessionMemoryService: { injectForContext },
      // No deps.sessionId — should fall through to request.sessionId
    });

    const result = await fetcher(makeRequest({ sessionId: "req-sess-42" }));
    expect(result.chunks).toHaveLength(1);
    expect(injectForContext).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: "req-sess-42" }),
    );
  });

  it("prefers request.sessionId over deps.sessionId", async () => {
    const injectForContext = makeInjectOk("[会话记忆 — L1 自动注入]\n[note] request wins");
    const fetcher = createSessionMemoryFetcher({
      sessionMemoryService: { injectForContext },
      sessionId: "deps-sess",
    });

    const result = await fetcher(makeRequest({ sessionId: "request-sess" }));
    expect(result.chunks).toHaveLength(1);
    // request.sessionId should take precedence
    expect(injectForContext).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: "request-sess" }),
    );
  });
});
