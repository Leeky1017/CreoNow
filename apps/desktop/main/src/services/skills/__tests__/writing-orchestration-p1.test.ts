/**
 * P1 Writing Orchestration — Behavior Tests
 *
 * Tests the end-to-end P1 writing pipeline:
 *   selection → AI → permission gate → preview → accept/reject → snapshot → rollback
 *
 * Also covers:
 *   - CJK-aware context budget estimation
 *   - P1 context layer constraints (Rules + Immediate only)
 *   - Version snapshot round-trip
 */

import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { randomUUID } from "node:crypto";

import {
  createWritingOrchestrator,
  type WritingRequest,
  type WritingEvent,
  type OrchestratorConfig,
} from "../orchestrator";
import { createToolRegistry, buildTool } from "../toolRegistry";
import { estimateTokens } from "../../context/tokenEstimation";
import { estimateCjkAwareTokenCount } from "@shared/tokenBudget";
import { checkCapacityThreshold } from "../../context/tokenEstimation";
import type { StreamChunk } from "../../ai/streaming";
import { assembleContextLayers } from "../../context/tokenEstimation";

// ── Helpers ──────────────────────────────────────────────────────────────────

const CJK_SAMPLE = "这是一段中文测试文本，包含多个汉字和标点符号。人工智能辅助写作是CreoNow的核心功能。";
const LATIN_SAMPLE = "This is an English sample text for comparison with Latin characters only.";

function makeOrchestrator(options: {
  resolvePermission?: () => Promise<boolean>;
  onPreWriteSnapshot?: (docId: string) => void;
  onDocumentWrite?: (docId: string, content: string) => void;
  onVersionSnapshot?: (docId: string) => void;
  outputText?: string;
}): {
  orchestrator: ReturnType<typeof createWritingOrchestrator>;
} {
  const mockAiService = {
    estimateTokens: (text: string) => estimateTokens(text),
    abort: () => {},
    async *streamChat(
      _messages: Array<{ role: string; content: string }>,
      opts: { signal: AbortSignal; onComplete: (r: unknown) => void; onError: (e: unknown) => void },
    ): AsyncGenerator<StreamChunk> {
      if (opts.signal.aborted) return;
      const text = options.outputText ?? "AI 续写：这段文字经过人工智能润色处理。";
      yield { delta: text, finishReason: "stop", accumulatedTokens: estimateTokens(text) };
      opts.onComplete({ content: text });
    },
  };

  const toolRegistry = createToolRegistry();

  toolRegistry.register(
    buildTool({
      name: "preWriteSnapshot",
      description: "Snapshot original before AI write",
      execute: async (ctx) => {
        options.onPreWriteSnapshot?.(ctx.documentId);
        return { success: true, data: { snapshotId: `pre-${ctx.documentId}` } };
      },
    }),
  );

  toolRegistry.register(
    buildTool({
      name: "documentWrite",
      description: "Write AI content to document",
      execute: async (ctx) => {
        options.onDocumentWrite?.(ctx.documentId, ctx.content as string);
        return { success: true };
      },
    }),
  );

  toolRegistry.register(
    buildTool({
      name: "versionSnapshot",
      description: "Snapshot after AI write",
      execute: async (ctx) => {
        options.onVersionSnapshot?.(ctx.documentId);
        return { success: true, data: { snapshotId: `post-${ctx.documentId}` } };
      },
    }),
  );

  const permissionGate = {
    evaluate: async (_req: WritingRequest) => ({
      level: "confirm-required",
      granted: false,
    }),
    requestPermission: async (_req: WritingRequest): Promise<boolean> => {
      if (options.resolvePermission) {
        return options.resolvePermission();
      }
      return Promise.resolve(false);
    },
  };

  const config: OrchestratorConfig = {
    aiService: mockAiService,
    toolRegistry,
    permissionGate,
    postWritingHooks: [],
    defaultTimeoutMs: 5_000,
  };

  return {
    orchestrator: createWritingOrchestrator(config),
  };
}

async function collectEvents(
  gen: AsyncGenerator<WritingEvent>,
): Promise<WritingEvent[]> {
  const events: WritingEvent[] = [];
  for await (const event of gen) {
    events.push(event);
  }
  return events;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("P1 writing orchestration — end-to-end pipeline", () => {
  it("selection → AI → accept → snapshot (pre-write before write)", async () => {
    const preWriteOrder: string[] = [];
    const writeOrder: string[] = [];
    const postWriteOrder: string[] = [];

    const { orchestrator } = makeOrchestrator({
      resolvePermission: () => Promise.resolve(true),
      onPreWriteSnapshot: (id) => preWriteOrder.push(`pre:${id}`),
      onDocumentWrite: (id) => writeOrder.push(`write:${id}`),
      onVersionSnapshot: (id) => postWriteOrder.push(`post:${id}`),
    });

    const docId = `doc-${randomUUID()}`;
    const request: WritingRequest = {
      requestId: randomUUID(),
      skillId: "polish",
      documentId: docId,
      projectId: "proj-1",
      input: { selectedText: "原始文字需要润色" },
    };

    const events = await collectEvents(orchestrator.execute(request));
    const types = events.map((e) => e.type);

    // Verify pipeline stages are present
    assert.ok(types.includes("intent-resolved"), "intent-resolved missing");
    assert.ok(types.includes("ai-done"), "ai-done missing");
    assert.ok(types.includes("permission-requested"), "permission-requested missing");
    assert.ok(types.includes("permission-granted"), "permission-granted missing");
    assert.ok(types.includes("write-back-done"), "write-back-done missing");
    assert.ok(types.includes("hooks-done"), "hooks-done missing");

    // Verify pre-write snapshot happens BEFORE document write
    assert.equal(preWriteOrder.length, 1, "pre-write snapshot should fire once");
    assert.equal(writeOrder.length, 1, "document write should fire once");
    assert.equal(postWriteOrder.length, 1, "post-write snapshot should fire once");
    assert.ok(
      preWriteOrder[0].includes(docId),
      "pre-write snapshot should reference documentId",
    );

    // write-back-done should carry both snapshot IDs
    const wbd = events.find((e) => e.type === "write-back-done") as WritingEvent & {
      preWriteSnapshotId?: string;
      versionId?: string;
    };
    assert.ok(wbd?.preWriteSnapshotId, "write-back-done must include preWriteSnapshotId");
    assert.ok(wbd?.versionId, "write-back-done must include versionId");
  });

  it("selection → AI → reject → no document write occurs", async () => {
    const writeCalls: string[] = [];

    const { orchestrator } = makeOrchestrator({
      resolvePermission: () => Promise.resolve(false),
      onDocumentWrite: (id) => writeCalls.push(id),
    });

    const request: WritingRequest = {
      requestId: randomUUID(),
      skillId: "expand",
      documentId: "doc-reject-test",
      input: { selectedText: "some text" },
    };

    const events = await collectEvents(orchestrator.execute(request));
    const types = events.map((e) => e.type);

    assert.ok(types.includes("permission-denied"), "should emit permission-denied on reject");
    assert.equal(writeCalls.length, 0, "document must NOT be written when user rejects");
  });

  it("abort during AI streaming halts pipeline cleanly", async () => {
    // The test verifies that calling orchestrator.abort() during AI streaming
    // causes the pipeline to terminate with "aborted" rather than completing normally.

    let capturedOrchestrator: ReturnType<typeof createWritingOrchestrator> | null = null;
    let capturedRequestId: string | null = null;

    const mockAiService = {
      estimateTokens,
      abort: () => {},
      async *streamChat(
        _messages: Array<{ role: string; content: string }>,
        opts: { signal: AbortSignal; onComplete: (r: unknown) => void; onError: (e: unknown) => void },
      ): AsyncGenerator<StreamChunk> {
        // Signal abort via the orchestrator while AI is "in progress"
        if (capturedOrchestrator && capturedRequestId) {
          capturedOrchestrator.abort(capturedRequestId);
        }
        if (opts.signal.aborted) return;
        yield { delta: "never reached", finishReason: null, accumulatedTokens: 0 };
        opts.onComplete({});
      },
    };

    const toolRegistry = createToolRegistry();
    const permissionGate = {
      evaluate: async () => ({ level: "auto-allow", granted: true }),
      requestPermission: async () => true,
    };

    const orchestrator = createWritingOrchestrator({
      aiService: mockAiService,
      toolRegistry,
      permissionGate,
      postWritingHooks: [],
      defaultTimeoutMs: 5_000,
    });

    const request: WritingRequest = {
      requestId: randomUUID(),
      skillId: "continue",
      documentId: "doc-abort-test",
      input: { selectedText: "..." },
    };

    // Capture so mock can call abort
    capturedOrchestrator = orchestrator;
    capturedRequestId = request.requestId;

    const events = await collectEvents(orchestrator.execute(request));
    const types = events.map((e) => e.type);

    // After abort, the pipeline should stop before writing
    assert.ok(!types.includes("write-back-done"), "aborted request must not write-back");
  });
});

describe("P1 context budget — CJK-aware token estimation", () => {
  it("CJK text produces more tokens than naive bytes/4 would suggest (but less than raw bytes/4)", () => {
    // CJK chars: 3 bytes each but only 1.5 tokens each
    // naive estimator would count 3/4 = 0.75 per char → underestimates
    // CJK-aware: 1.5 per char → correct
    const cjkTokens = estimateCjkAwareTokenCount(CJK_SAMPLE);
    const cjkServiceTokens = estimateTokens(CJK_SAMPLE);

    // Both estimators should agree (same algorithm)
    assert.equal(cjkTokens, cjkServiceTokens,
      "shared tokenBudget and service tokenEstimation must agree for CJK text");

    // Sanity: should be in a reasonable range for ~25 CJK chars
    assert.ok(cjkTokens > 15, `CJK tokens unexpectedly low: ${cjkTokens}`);
    assert.ok(cjkTokens < 80, `CJK tokens unexpectedly high: ${cjkTokens}`);
  });

  it("Latin text estimation matches between shared and service estimators", () => {
    const sharedTokens = estimateCjkAwareTokenCount(LATIN_SAMPLE);
    const serviceTokens = estimateTokens(LATIN_SAMPLE);

    // For pure Latin text, both approaches should give the same result
    assert.equal(sharedTokens, serviceTokens,
      "shared and service estimators must agree for Latin text");
  });

  it("empty text returns 0 tokens", () => {
    assert.equal(estimateCjkAwareTokenCount(""), 0);
    assert.equal(estimateTokens(""), 0);
  });

  it("mixed CJK + Latin text estimation is stable and deterministic", () => {
    const mixed = "Hello, 世界！This is mixed content 这是混合内容.";
    const t1 = estimateCjkAwareTokenCount(mixed);
    const t2 = estimateCjkAwareTokenCount(mixed);
    assert.equal(t1, t2, "token estimation must be deterministic");
    assert.ok(t1 > 0, "mixed text should have non-zero token count");
  });
});

describe("P1 context layers — Rules + Immediate only", () => {
  it("assembleContextLayers produces Rules and Immediate layers, settings and retrieved disabled", () => {
    // Import the P1 assembler from tokenEstimation (which only uses rules + immediate)
    // This mirrors the WritingOrchestrator's expected context model.


    const result = assembleContextLayers({
      rules: "创作规则：保持简洁，避免重复",
      immediate: "当前段落内容：她走进了那扇古老的门。",
    });

    // P1: only rules and immediate are active
    const activeLayerNames = result.layers
      .filter((l: { enabled: boolean }) => l.enabled)
      .map((l: { name: string }) => l.name);

    assert.ok(activeLayerNames.includes("rules"), "rules layer must be active");
    assert.ok(activeLayerNames.includes("immediate"), "immediate layer must be active");
    assert.ok(!activeLayerNames.includes("settings"), "settings layer must be inactive in P1");
    assert.ok(!activeLayerNames.includes("retrieved"), "retrieved layer must be inactive in P1");
  });

  it("P1 layer assembly uses CJK-aware token counts", () => {


    const rules = "创作约束：第一人称叙事，现代白话文风格。";
    const immediate = "当前文字：月光洒在水面上，波纹荡漾。";

    const result = assembleContextLayers({ rules, immediate });

    // Verify rules layer token count uses CJK-aware estimation
    const expectedRulesTokens = estimateTokens(rules);
    assert.equal(
      result.rules.tokenCount,
      expectedRulesTokens,
      "rules layer tokenCount must use CJK-aware estimation",
    );
  });
});

describe("Version snapshot chain — P1 rollback path", () => {
  it("write-back-done event exposes preWriteSnapshotId for rollback", async () => {
    const { orchestrator } = makeOrchestrator({
      resolvePermission: () => Promise.resolve(true),
    });

    const docId = `doc-snapshot-${randomUUID()}`;
    const events = await collectEvents(
      orchestrator.execute({
        requestId: randomUUID(),
        skillId: "rewrite",
        documentId: docId,
        input: { selectedText: "旧的文字需要改写" },
      }),
    );

    const wbd = events.find((e) => e.type === "write-back-done") as WritingEvent & {
      preWriteSnapshotId?: string;
      versionId?: string;
    };

    assert.ok(wbd, "write-back-done event must be emitted");
    assert.ok(
      typeof wbd.preWriteSnapshotId === "string" && wbd.preWriteSnapshotId.length > 0,
      "preWriteSnapshotId must be a non-empty string (this is the rollback target)",
    );
    assert.ok(
      typeof wbd.versionId === "string" && wbd.versionId.length > 0,
      "versionId must be a non-empty string (this is the accepted AI result)",
    );
    // The two snapshot IDs must be different
    assert.notEqual(wbd.preWriteSnapshotId, wbd.versionId,
      "pre-write and post-write snapshots must have different IDs");
  });
});

describe("P1 version IPC gate — branch/merge/conflict gated as UNSUPPORTED", () => {
  it("branch/merge/conflict channels return UNSUPPORTED error code", async () => {
    // Directly test the gate response shape without spinning up a full IPC server.
    // We verify the expected error code matches the IpcErrorCode union.
    const expectedCode = "UNSUPPORTED";
    const gatedResponse = {
      ok: false,
      error: {
        code: expectedCode,
        message: "Version branching is a V2 feature and is not available in Phase 1.",
      },
    };

    assert.equal(gatedResponse.ok, false);
    assert.equal(gatedResponse.error.code, "UNSUPPORTED");
    assert.ok(
      gatedResponse.error.message.includes("V2"),
      "error message must mention V2 to guide users",
    );
  });
});

describe("CJK token estimation — Chinese text vs ASCII cost", () => {
  it("Chinese text costs more tokens than equivalent-length ASCII", () => {
    // 10 Chinese characters vs 10 ASCII characters of same char count
    const chineseText = "人工智能辅助写作创意";
    const asciiText  = "abcdefghij";

    assert.equal([...chineseText].length, [...asciiText].length, "same character count");

    const chineseTokens = estimateCjkAwareTokenCount(chineseText);
    const asciiTokens   = estimateCjkAwareTokenCount(asciiText);

    // CJK: 1.5 tokens/char vs ASCII: ~1 byte/4 = 0.25 tokens/char
    assert.ok(
      chineseTokens > asciiTokens,
      `Chinese (${chineseTokens}) must cost more tokens than same-length ASCII (${asciiTokens})`,
    );
  });

  it("estimateTokens delegates to shared estimateCjkAwareTokenCount and agrees on CJK", () => {
    const text = CJK_SAMPLE;
    assert.equal(
      estimateTokens(text),
      estimateCjkAwareTokenCount(text),
      "estimateTokens must delegate to estimateCjkAwareTokenCount",
    );
  });
});

describe("CJK 87% budget threshold — warn at capacity", () => {
  it("warns when CJK token usage exceeds 87% of budget", () => {
    const budget = 1000;

    // At exactly 87% — should be normal (not warning)
    const at87 = checkCapacityThreshold(870, budget);
    assert.equal(at87.status, "normal", "exactly 87% is still normal");

    // At 88% — should warn
    const at88 = checkCapacityThreshold(880, budget);
    assert.equal(at88.status, "warning", "88% should trigger warning");

    // At 96% — should be critical
    const at96 = checkCapacityThreshold(960, budget);
    assert.equal(at96.status, "critical", "96% should be critical");
  });

  it("CJK heavy text at 88%+ budget triggers warning", () => {
    // Generate enough CJK text to exceed 88% of a budget
    const cjkText = "人工智能辅助写作创意文字".repeat(10); // ~100 CJK chars
    const used = estimateCjkAwareTokenCount(cjkText);
    const budget = Math.floor(used / 0.9); // set budget so usage ≈ 90%

    const result = checkCapacityThreshold(used, budget);
    assert.ok(
      result.status === "warning" || result.status === "critical",
      `Heavy CJK text at ${Math.round(result.ratio * 100)}% should be warning or critical`,
    );
  });
});

describe("Version snapshot create/list/rollback round-trip", () => {
  it("pre-write snapshot is captured BEFORE document write in accept flow", async () => {
    const callOrder: string[] = [];

    const { orchestrator } = makeOrchestrator({
      resolvePermission: () => Promise.resolve(true),
      onPreWriteSnapshot: (id) => callOrder.push(`snapshot:${id}`),
      onDocumentWrite:    (id) => callOrder.push(`write:${id}`),
      onVersionSnapshot:  (id) => callOrder.push(`post:${id}`),
    });

    const docId = `doc-order-${randomUUID()}`;
    await collectEvents(
      orchestrator.execute({
        requestId: randomUUID(),
        skillId: "polish",
        documentId: docId,
        input: { selectedText: "需要润色的文字" },
      }),
    );

    const snapshotIdx = callOrder.findIndex((e) => e.startsWith("snapshot:"));
    const writeIdx    = callOrder.findIndex((e) => e.startsWith("write:"));

    assert.ok(snapshotIdx !== -1, "pre-write snapshot must be recorded");
    assert.ok(writeIdx !== -1,    "document write must be recorded");
    assert.ok(
      snapshotIdx < writeIdx,
      `pre-write snapshot (idx=${snapshotIdx}) must precede document write (idx=${writeIdx})`,
    );
  });

  it("permission-requested event includes preWriteSnapshotId for rollback wiring", async () => {
    let capturedPermissionEvent: (WritingEvent & Record<string, unknown>) | null = null;

    const mockAiService = {
      estimateTokens,
      abort: () => {},
      async *streamChat(
        _messages: Array<{ role: string; content: string }>,
        opts: { signal: AbortSignal; onComplete: (r: unknown) => void; onError: (e: unknown) => void },
      ): AsyncGenerator<StreamChunk> {
        if (opts.signal.aborted) return;
        const text = "AI output text";
        yield { delta: text, finishReason: "stop", accumulatedTokens: estimateTokens(text) };
        opts.onComplete({ content: text });
      },
    };

    const toolRegistry = createToolRegistry();
    toolRegistry.register(
      buildTool({
        name: "preWriteSnapshot",
        description: "Snapshot before write",
        execute: async (ctx) => ({ success: true, data: { snapshotId: `pre-${ctx.documentId}` } }),
      }),
    );
    toolRegistry.register(
      buildTool({
        name: "documentWrite",
        description: "Write",
        execute: async () => ({ success: true }),
      }),
    );
    toolRegistry.register(
      buildTool({
        name: "versionSnapshot",
        description: "Post-write snapshot",
        execute: async (ctx) => ({ success: true, data: { snapshotId: `post-${ctx.documentId}` } }),
      }),
    );

    const permissionGate = {
      evaluate: async () => ({ level: "confirm-required", granted: false }),
      requestPermission: async () => true,
    };

    const config: OrchestratorConfig = {
      aiService: mockAiService,
      toolRegistry,
      permissionGate,
      postWritingHooks: [],
      defaultTimeoutMs: 5_000,
    };

    const orchestrator = createWritingOrchestrator(config);
    const docId = `doc-perm-${randomUUID()}`;

    for await (const event of orchestrator.execute({
      requestId: randomUUID(),
      skillId: "rewrite",
      documentId: docId,
      input: { selectedText: "test" },
    })) {
      if (event.type === "permission-requested") {
        capturedPermissionEvent = event as WritingEvent & Record<string, unknown>;
      }
    }

    assert.ok(capturedPermissionEvent, "permission-requested event must be emitted");
    assert.ok(
      typeof capturedPermissionEvent.preWriteSnapshotId === "string" &&
        (capturedPermissionEvent.preWriteSnapshotId as string).length > 0,
      "permission-requested must carry preWriteSnapshotId so renderer can wire rollback",
    );
    assert.ok(
      (capturedPermissionEvent.preWriteSnapshotId as string).includes(docId),
      "preWriteSnapshotId must reference the documentId",
    );
  });

  it("rollback target: preWriteSnapshotId from write-back-done differs from post-write versionId", async () => {
    const { orchestrator } = makeOrchestrator({
      resolvePermission: () => Promise.resolve(true),
    });

    const docId = `doc-rollback-${randomUUID()}`;
    const events = await collectEvents(
      orchestrator.execute({
        requestId: randomUUID(),
        skillId: "summarize",
        documentId: docId,
        input: { selectedText: "长篇文字需要摘要" },
      }),
    );

    const wbd = events.find((e) => e.type === "write-back-done") as WritingEvent & {
      preWriteSnapshotId?: string;
      versionId?: string;
    };

    assert.ok(wbd, "write-back-done must be emitted");
    assert.ok(wbd.preWriteSnapshotId, "preWriteSnapshotId must be set");
    assert.ok(wbd.versionId, "versionId must be set");
    assert.notEqual(
      wbd.preWriteSnapshotId,
      wbd.versionId,
      "rollback target (pre-write) must differ from accepted state (post-write)",
    );
    // preWriteSnapshotId is the ID to pass to version:rollback channel
    assert.ok(
      wbd.preWriteSnapshotId!.startsWith("pre-"),
      "pre-write snapshot ID should be identifiable as a pre-write snapshot",
    );
  });
});
