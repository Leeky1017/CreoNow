/**
 * SkillOrchestrator 单元测试
 *
 * INV-6 / INV-7 合规验证：
 *   1. execute() → 路由到 WritingOrchestrator.execute()
 *   2. abort() → 路由到 WritingOrchestrator.abort()
 *   3. cancel() → 路由到 AiService.cancel()，不暴露 AiService 给调用方
 *   4. recordFeedback() → 路由到 AiService.feedback()
 *   5. listModels() → 路由到 AiService.listModels()
 *   6. dispose() → 路由到 WritingOrchestrator.dispose()
 *
 * 所有测试只对接口（SkillOrchestrator）断言，不感知底层实现细节。
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  createSkillOrchestrator,
  type SkillOrchestratorConfig,
  type SkillOrchestrator,
} from "../skillOrchestrator";
import type {
  WritingOrchestrator,
  WritingRequest,
  WritingEvent,
} from "../../services/skills/orchestrator";

// ── helpers ──────────────────────────────────────────────────────────

function makeRequest(overrides: Partial<WritingRequest> = {}): WritingRequest {
  return {
    requestId: "req-001",
    skillId: "builtin:polish",
    input: { selectedText: "test text" },
    documentId: "doc-001",
    selection: {
      from: 0,
      to: 9,
      text: "test text",
      selectionTextHash: "abc",
    },
    ...overrides,
  };
}

async function* makeEventGen(
  events: WritingEvent[],
): AsyncGenerator<WritingEvent> {
  for (const e of events) {
    yield e;
  }
}

// ── mocks ────────────────────────────────────────────────────────────

function makeMockWritingOrchestrator(): WritingOrchestrator & {
  executeSpy: ReturnType<typeof vi.fn>;
  abortSpy: ReturnType<typeof vi.fn>;
  disposeSpy: ReturnType<typeof vi.fn>;
} {
  const executeSpy = vi.fn();
  const abortSpy = vi.fn();
  const disposeSpy = vi.fn();
  return {
    execute: executeSpy,
    abort: abortSpy,
    dispose: disposeSpy,
    getTaskState: vi.fn().mockReturnValue("pending" as const),
    executeSpy,
    abortSpy,
    disposeSpy,
  };
}

function makeMockAiService() {
  return {
    runSkill: vi.fn(),
    listModels: vi.fn(),
    cancel: vi.fn(),
    feedback: vi.fn(),
  };
}

// ── tests ────────────────────────────────────────────────────────────

describe("createSkillOrchestrator", () => {
  let mockOrchestrator: ReturnType<typeof makeMockWritingOrchestrator>;
  let mockAiService: ReturnType<typeof makeMockAiService>;
  let sut: SkillOrchestrator;

  beforeEach(() => {
    mockOrchestrator = makeMockWritingOrchestrator();
    mockAiService = makeMockAiService();
    const config: SkillOrchestratorConfig = {
      writingOrchestrator: mockOrchestrator,
      aiService: mockAiService as unknown as SkillOrchestratorConfig["aiService"],
    };
    sut = createSkillOrchestrator(config);
  });

  // ── INV-6: execute → WritingOrchestrator ─────────────────────────

  describe("execute()", () => {
    it("delegates to WritingOrchestrator.execute() with the same request", async () => {
      const request = makeRequest();
      const fakeEvent: WritingEvent = {
        type: "intent-resolved",
        timestamp: Date.now(),
        requestId: request.requestId,
      };
      mockOrchestrator.executeSpy.mockReturnValue(makeEventGen([fakeEvent]));

      const gen = sut.execute(request);
      const result = await gen.next();

      expect(mockOrchestrator.executeSpy).toHaveBeenCalledOnce();
      expect(mockOrchestrator.executeSpy).toHaveBeenCalledWith(request);
      expect(result.value).toEqual(fakeEvent);
    });

    it("streams multiple events from WritingOrchestrator", async () => {
      const request = makeRequest();
      const events: WritingEvent[] = [
        { type: "intent-resolved", timestamp: 1, requestId: request.requestId },
        { type: "ai-chunk", timestamp: 2, requestId: request.requestId, delta: "hi" },
        { type: "ai-done", timestamp: 3, requestId: request.requestId, fullText: "hi" },
      ];
      mockOrchestrator.executeSpy.mockReturnValue(makeEventGen(events));

      const collected: WritingEvent[] = [];
      for await (const event of sut.execute(request)) {
        collected.push(event);
      }

      expect(collected).toHaveLength(3);
      expect(collected.map((e) => e.type)).toEqual([
        "intent-resolved",
        "ai-chunk",
        "ai-done",
      ]);
    });

    it("does NOT call aiService for writing execution (INV-6 isolation)", async () => {
      const request = makeRequest();
      mockOrchestrator.executeSpy.mockReturnValue(makeEventGen([]));

      for await (const _ of sut.execute(request)) {
        // drain
      }

      expect(mockAiService.runSkill).not.toHaveBeenCalled();
    });
  });

  // ── INV-7: abort → WritingOrchestrator ───────────────────────────

  describe("abort()", () => {
    it("delegates to WritingOrchestrator.abort() with the requestId", () => {
      sut.abort("req-001");

      expect(mockOrchestrator.abortSpy).toHaveBeenCalledOnce();
      expect(mockOrchestrator.abortSpy).toHaveBeenCalledWith("req-001");
    });
  });

  // ── INV-7: cancel → AiService.cancel ─────────────────────────────

  describe("cancel()", () => {
    it("delegates to AiService.cancel() with the same args", () => {
      const args = { executionId: "exec-1", ts: 12345 };
      mockAiService.cancel.mockReturnValue({ ok: true, data: { canceled: true } });

      const result = sut.cancel(args);

      expect(mockAiService.cancel).toHaveBeenCalledOnce();
      expect(mockAiService.cancel).toHaveBeenCalledWith(args);
      expect(result).toEqual({ ok: true, data: { canceled: true } });
    });

    it("propagates error from AiService.cancel()", () => {
      const args = { runId: "run-1", ts: 99999 };
      mockAiService.cancel.mockReturnValue({
        ok: false,
        error: { code: "NOT_FOUND", message: "run not found" },
      });

      const result = sut.cancel(args);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("NOT_FOUND");
      }
    });

    it("does NOT touch writingOrchestrator when cancelling", () => {
      mockAiService.cancel.mockReturnValue({ ok: true, data: { canceled: true } });

      sut.cancel({ executionId: "exec-x", ts: 1 });

      expect(mockOrchestrator.executeSpy).not.toHaveBeenCalled();
      expect(mockOrchestrator.abortSpy).not.toHaveBeenCalled();
    });
  });

  // ── INV-7: recordFeedback → AiService.feedback ───────────────────

  describe("recordFeedback()", () => {
    it("delegates to AiService.feedback() with the same args", () => {
      const args = {
        runId: "run-001",
        action: "accept" as const,
        evidenceRef: "ref-abc",
        ts: 100,
      };
      mockAiService.feedback.mockReturnValue({ ok: true, data: { recorded: true } });

      const result = sut.recordFeedback(args);

      expect(mockAiService.feedback).toHaveBeenCalledOnce();
      expect(mockAiService.feedback).toHaveBeenCalledWith(args);
      expect(result).toEqual({ ok: true, data: { recorded: true } });
    });

    it("propagates error from AiService.feedback()", () => {
      mockAiService.feedback.mockReturnValue({
        ok: false,
        error: { code: "INTERNAL", message: "feedback failed" },
      });

      const result = sut.recordFeedback({
        runId: "run-x",
        action: "reject",
        evidenceRef: "ref",
        ts: 1,
      });

      expect(result.ok).toBe(false);
    });

    it("does NOT touch writingOrchestrator when recording feedback", () => {
      mockAiService.feedback.mockReturnValue({ ok: true, data: { recorded: true } });

      sut.recordFeedback({ runId: "r", action: "partial", evidenceRef: "e", ts: 1 });

      expect(mockOrchestrator.executeSpy).not.toHaveBeenCalled();
    });
  });

  // ── INV-7: listModels → AiService.listModels ─────────────────────

  describe("listModels()", () => {
    it("delegates to AiService.listModels()", async () => {
      const modelData = {
        source: "openai" as const,
        items: [{ id: "gpt-4", name: "GPT-4", provider: "openai" }],
      };
      mockAiService.listModels.mockResolvedValue({ ok: true, data: modelData });

      const result = await sut.listModels();

      expect(mockAiService.listModels).toHaveBeenCalledOnce();
      expect(result).toEqual({ ok: true, data: modelData });
    });

    it("propagates error from AiService.listModels()", async () => {
      mockAiService.listModels.mockResolvedValue({
        ok: false,
        error: { code: "AI_PROVIDER_UNAVAILABLE", message: "no provider" },
      });

      const result = await sut.listModels();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("AI_PROVIDER_UNAVAILABLE");
      }
    });
  });

  // ── dispose → WritingOrchestrator ────────────────────────────────

  describe("dispose()", () => {
    it("delegates to WritingOrchestrator.dispose()", () => {
      sut.dispose();

      expect(mockOrchestrator.disposeSpy).toHaveBeenCalledOnce();
    });
  });
});
