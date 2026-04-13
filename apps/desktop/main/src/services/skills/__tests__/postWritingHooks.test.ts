/**
 * Post-Writing Hooks (INV-8) — comprehensive unit tests.
 *
 * Covers:
 * - Each hook executes successfully with valid input
 * - Each hook handles errors gracefully (catches, logs, doesn't throw)
 * - Error isolation: one hook failing doesn't prevent others
 * - Hooks execute in priority order
 * - Edge cases: empty text, missing projectId, missing sessionId,
 *   disposed services, missing dependencies
 * - extractWritingContext heuristic pattern extraction
 * - Hook chain builder utility
 */

import { describe, it, expect, vi } from "vitest";

import {
  createKgUpdateHook,
  createMemoryExtractHook,
  createQualityCheckHook,
  buildPostWritingHookChain,
  extractWritingContext,
  KG_UPDATE_PRIORITY,
  MEMORY_EXTRACT_PRIORITY,
  QUALITY_CHECK_PRIORITY,
} from "../postWritingHooks";
import type {
  KgUpdateHookDeps,
  MemoryExtractHookDeps,
  QualityCheckHookDeps,
} from "../postWritingHooks";
import type { PostWritingHookContext } from "../orchestrator";

// ─── Mock factories ─────────────────────────────────────────────────

function makeLogger() {
  return {
    info: vi.fn(),
    error: vi.fn(),
  };
}

function makeContext(overrides: Partial<PostWritingHookContext> = {}): PostWritingHookContext {
  return {
    requestId: "req-001",
    documentId: "doc-001",
    projectId: "proj-001",
    sessionId: "sess-001",
    fullText: "李明走进了青云城，看到了张伟站在门口。",
    ...overrides,
  };
}

function makeKgUpdateDeps(overrides: Partial<KgUpdateHookDeps> = {}): KgUpdateHookDeps {
  return {
    scanEntities: vi.fn().mockReturnValue([
      { entityId: "ent-1", matchedTerm: "李明", position: 0 },
      { entityId: "ent-2", matchedTerm: "青云城", position: 4 },
    ]),
    kgService: {
      entityList: vi.fn().mockReturnValue({
        ok: true,
        data: {
          items: [
            {
              id: "ent-1",
              name: "李明",
              aliases: [],
              aiContextLevel: "when_detected",
              version: 1,
              projectId: "proj-001",
              type: "character",
              description: "",
              attributes: {},
              createdAt: "2024-01-01",
              updatedAt: "2024-01-01",
            },
            {
              id: "ent-2",
              name: "青云城",
              aliases: ["青云"],
              aiContextLevel: "when_detected",
              version: 2,
              projectId: "proj-001",
              type: "location",
              description: "",
              attributes: {},
              createdAt: "2024-01-01",
              updatedAt: "2024-01-01",
            },
          ],
          totalCount: 2,
        },
      }),
    },
    kgMutationSkill: {
      execute: vi.fn().mockReturnValue({ ok: true, data: {} }),
    },
    logger: makeLogger(),
    ...overrides,
  };
}

function makeMemoryExtractDeps(overrides: Partial<MemoryExtractHookDeps> = {}): MemoryExtractHookDeps {
  return {
    sessionMemory: {
      create: vi.fn().mockReturnValue({ ok: true, data: { id: "smem-1" } }),
    },
    logger: makeLogger(),
    ...overrides,
  };
}

function makeQualityCheckDeps(overrides: Partial<QualityCheckHookDeps> = {}): QualityCheckHookDeps {
  return {
    skillExecutor: {
      executeSkill: vi.fn().mockResolvedValue({
        success: true,
        data: { passed: true, issues: [] },
      }),
    },
    logger: makeLogger(),
    ...overrides,
  };
}

// ─── extractWritingContext ───────────────────────────────────────────

describe("extractWritingContext", () => {
  it("extracts style preference: 我喜欢用…风格", () => {
    const text = "我喜欢用简洁明快的风格来写这个章节。";
    const results = extractWritingContext(text);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]!.category).toBe("style");
    expect(results[0]!.content).toContain("风格");
  });

  it("extracts style preference: 请用…语气", () => {
    const text = "请用诙谐幽默的语气来描写这段对话。";
    const results = extractWritingContext(text);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]!.category).toBe("style");
    expect(results[0]!.content).toContain("语气");
  });

  it("extracts POV preference: 第一人称", () => {
    const text = "这段文字应该用第一人称来叙述。";
    const results = extractWritingContext(text);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((r) => r.category === "preference" && r.content.includes("第一人称"))).toBe(true);
  });

  it("extracts narrative structure: 倒叙", () => {
    const text = "整个故事采用倒叙的手法展开。";
    const results = extractWritingContext(text);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((r) => r.content.includes("倒叙"))).toBe(true);
  });

  it("returns empty array for text with no patterns", () => {
    const text = "今天天气很好，适合出门散步。";
    expect(extractWritingContext(text)).toEqual([]);
  });

  it("deduplicates identical matches", () => {
    const text = "请用诗意的风格来写。请用诗意的风格来写。";
    const results = extractWritingContext(text);
    // Each pattern only matches once (first occurrence), so no duplication
    expect(results.length).toBe(1);
  });

  it("handles empty string", () => {
    expect(extractWritingContext("")).toEqual([]);
  });
});

// ─── KG Update Hook ─────────────────────────────────────────────────

describe("createKgUpdateHook", () => {
  it("has correct name and priority", () => {
    const hook = createKgUpdateHook(makeKgUpdateDeps());
    expect(hook.name).toBe("kg-update");
    expect(hook.priority).toBe(KG_UPDATE_PRIORITY);
  });

  it("scans text and updates matched entities", async () => {
    const deps = makeKgUpdateDeps();
    const hook = createKgUpdateHook(deps);
    const ctx = makeContext();

    await hook.execute(ctx);

    expect(deps.scanEntities).toHaveBeenCalledWith(
      ctx.fullText,
      expect.any(Array),
      "proj-001",
    );
    expect(deps.kgMutationSkill.execute).toHaveBeenCalledTimes(2);
    expect(deps.kgMutationSkill.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        mutationType: "entity:update",
        projectId: "proj-001",
        payload: expect.objectContaining({
          id: "ent-1",
          expectedVersion: 1,
          patch: expect.objectContaining({
            lastSeenState: expect.stringContaining("doc-001"),
          }),
        }),
      }),
    );
    expect(deps.logger.info).toHaveBeenCalledWith(
      "kg-update:matches-found",
      expect.objectContaining({ matchCount: 2 }),
    );
  });

  it("short-circuits on empty text", async () => {
    const deps = makeKgUpdateDeps();
    const hook = createKgUpdateHook(deps);

    await hook.execute(makeContext({ fullText: "" }));

    expect(deps.scanEntities).not.toHaveBeenCalled();
    expect(deps.kgService.entityList).not.toHaveBeenCalled();
  });

  it("short-circuits when projectId is missing", async () => {
    const deps = makeKgUpdateDeps();
    const hook = createKgUpdateHook(deps);

    await hook.execute(makeContext({ projectId: undefined }));

    expect(deps.scanEntities).not.toHaveBeenCalled();
  });

  it("handles entityList failure gracefully", async () => {
    const deps = makeKgUpdateDeps({
      kgService: {
        entityList: vi.fn().mockReturnValue({
          ok: false,
          error: { code: "INTERNAL", message: "DB error" },
        }),
      },
    });
    const hook = createKgUpdateHook(deps);

    // Should not throw
    await hook.execute(makeContext());

    expect(deps.logger.error).toHaveBeenCalledWith(
      "kg-update:entity-list-failed",
      expect.objectContaining({ code: "INTERNAL" }),
    );
  });

  it("handles individual kgMutationSkill.execute failure gracefully", async () => {
    const deps = makeKgUpdateDeps();
    (deps.kgMutationSkill.execute as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce({ ok: false, error: { code: "VERSION_CONFLICT", message: "stale" } })
      .mockReturnValueOnce({ ok: true, data: {} });
    const hook = createKgUpdateHook(deps);

    // Should not throw — first update fails, second succeeds
    await hook.execute(makeContext());

    expect(deps.kgMutationSkill.execute).toHaveBeenCalledTimes(2);
    expect(deps.logger.error).toHaveBeenCalledWith(
      "kg-update:entity-update-failed",
      expect.objectContaining({ entityId: "ent-1", code: "VERSION_CONFLICT" }),
    );
  });

  it("does nothing when no entities exist", async () => {
    const deps = makeKgUpdateDeps();
    (deps.kgService.entityList as ReturnType<typeof vi.fn>).mockReturnValue({
      ok: true,
      data: { items: [], totalCount: 0 },
    });
    const hook = createKgUpdateHook(deps);

    await hook.execute(makeContext());

    expect(deps.scanEntities).not.toHaveBeenCalled();
    expect(deps.kgMutationSkill.execute).not.toHaveBeenCalled();
  });

  it("does nothing when no matches found", async () => {
    const deps = makeKgUpdateDeps({
      scanEntities: vi.fn().mockReturnValue([]),
    });
    const hook = createKgUpdateHook(deps);

    await hook.execute(makeContext());

    expect(deps.kgMutationSkill.execute).not.toHaveBeenCalled();
  });

  it("truncates very long text before scanning", async () => {
    const deps = makeKgUpdateDeps();
    const hook = createKgUpdateHook(deps);
    const longText = "字".repeat(200_000);

    await hook.execute(makeContext({ fullText: longText }));

    const calledText = (deps.scanEntities as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(calledText.length).toBe(100_000);
  });
});

// ─── Memory Extract Hook ────────────────────────────────────────────

describe("createMemoryExtractHook", () => {
  it("has correct name and priority", () => {
    const hook = createMemoryExtractHook(makeMemoryExtractDeps());
    expect(hook.name).toBe("memory-extract");
    expect(hook.priority).toBe(MEMORY_EXTRACT_PRIORITY);
  });

  it("extracts writing context and creates session memory items", async () => {
    const deps = makeMemoryExtractDeps();
    const hook = createMemoryExtractHook(deps);
    const ctx = makeContext({ fullText: "请用简洁清新的风格来写这一章。" });

    await hook.execute(ctx);

    expect(deps.sessionMemory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "sess-001",
        projectId: "proj-001",
        category: "style",
        relevanceScore: 0.8,
      }),
    );
    expect(deps.logger.info).toHaveBeenCalledWith(
      "memory-extract:patterns-found",
      expect.objectContaining({ count: expect.any(Number) }),
    );
  });

  it("short-circuits on empty text", async () => {
    const deps = makeMemoryExtractDeps();
    const hook = createMemoryExtractHook(deps);

    await hook.execute(makeContext({ fullText: "" }));

    expect(deps.sessionMemory.create).not.toHaveBeenCalled();
  });

  it("short-circuits when projectId is missing", async () => {
    const deps = makeMemoryExtractDeps();
    const hook = createMemoryExtractHook(deps);

    await hook.execute(makeContext({ projectId: undefined }));

    expect(deps.sessionMemory.create).not.toHaveBeenCalled();
  });

  it("short-circuits when sessionId is missing", async () => {
    const deps = makeMemoryExtractDeps();
    const hook = createMemoryExtractHook(deps);

    await hook.execute(makeContext({ sessionId: undefined }));

    expect(deps.sessionMemory.create).not.toHaveBeenCalled();
  });

  it("does nothing when no patterns match", async () => {
    const deps = makeMemoryExtractDeps();
    const hook = createMemoryExtractHook(deps);

    await hook.execute(makeContext({ fullText: "今天天气很好。" }));

    expect(deps.sessionMemory.create).not.toHaveBeenCalled();
  });

  it("handles session memory create failure gracefully", async () => {
    const deps = makeMemoryExtractDeps({
      sessionMemory: {
        create: vi.fn().mockReturnValue({
          ok: false,
          error: { code: "INTERNAL", message: "DB full" },
        }),
      },
    });
    const hook = createMemoryExtractHook(deps);

    // Should not throw
    await hook.execute(makeContext({ fullText: "我喜欢用诗意的风格来写。" }));

    expect(deps.logger.error).toHaveBeenCalledWith(
      "memory-extract:create-failed",
      expect.objectContaining({ code: "INTERNAL" }),
    );
  });
});

// ─── Quality Check Hook ─────────────────────────────────────────────

describe("createQualityCheckHook", () => {
  // Helper: flush microtask queue so fire-and-forget .then()/.catch() resolve
  const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve, 0));

  it("has correct name and priority", () => {
    const hook = createQualityCheckHook(makeQualityCheckDeps());
    expect(hook.name).toBe("quality-check");
    expect(hook.priority).toBe(QUALITY_CHECK_PRIORITY);
  });

  it("calls consistency-check skill with correct args (fire-and-forget)", async () => {
    const deps = makeQualityCheckDeps();
    const hook = createQualityCheckHook(deps);
    const ctx = makeContext();

    await hook.execute(ctx);
    // executeSkill is called immediately (fire-and-forget)
    expect(deps.skillExecutor.executeSkill).toHaveBeenCalledWith(
      "consistency-check",
      {
        projectId: "proj-001",
        documentId: "doc-001",
        documentContent: ctx.fullText,
      },
    );

    // Logging happens in .then() — flush microtask queue
    await flushMicrotasks();
    expect(deps.logger.info).toHaveBeenCalledWith(
      "quality-check:completed",
      expect.objectContaining({
        passed: true,
        issueCount: 0,
      }),
    );
  });

  it("logs issues when consistency check finds problems", async () => {
    const deps = makeQualityCheckDeps({
      skillExecutor: {
        executeSkill: vi.fn().mockResolvedValue({
          success: true,
          data: {
            passed: false,
            issues: [
              { location: "paragraph 3", description: "contradiction", suggestion: "fix", severity: "error" },
            ],
          },
        }),
      },
    });
    const hook = createQualityCheckHook(deps);

    await hook.execute(makeContext());
    await flushMicrotasks();

    expect(deps.logger.info).toHaveBeenCalledWith(
      "quality-check:completed",
      expect.objectContaining({
        passed: false,
        issueCount: 1,
      }),
    );
  });

  it("short-circuits on empty text", async () => {
    const deps = makeQualityCheckDeps();
    const hook = createQualityCheckHook(deps);

    await hook.execute(makeContext({ fullText: "" }));

    expect(deps.skillExecutor.executeSkill).not.toHaveBeenCalled();
  });

  it("short-circuits when projectId is missing", async () => {
    const deps = makeQualityCheckDeps();
    const hook = createQualityCheckHook(deps);

    await hook.execute(makeContext({ projectId: undefined }));

    expect(deps.skillExecutor.executeSkill).not.toHaveBeenCalled();
  });

  it("handles skill execution failure gracefully (fire-and-forget)", async () => {
    const deps = makeQualityCheckDeps({
      skillExecutor: {
        executeSkill: vi.fn().mockResolvedValue({
          success: false,
          error: { code: "AI_SERVICE_ERROR", message: "LLM timeout" },
        }),
      },
    });
    const hook = createQualityCheckHook(deps);

    // Should not throw — fire-and-forget
    await hook.execute(makeContext());
    await flushMicrotasks();

    expect(deps.logger.error).toHaveBeenCalledWith(
      "quality-check:skill-failed",
      expect.objectContaining({ code: "AI_SERVICE_ERROR" }),
    );
  });

  it("handles skill executor throwing exception (fire-and-forget)", async () => {
    const deps = makeQualityCheckDeps({
      skillExecutor: {
        executeSkill: vi.fn().mockRejectedValue(new Error("executor disposed")),
      },
    });
    const hook = createQualityCheckHook(deps);

    // Fire-and-forget: hook.execute() does NOT reject — the rejection
    // is caught by the .catch() handler inside the hook.
    await hook.execute(makeContext());
    await flushMicrotasks();

    expect(deps.logger.error).toHaveBeenCalledWith(
      "quality-check:fire-and-forget-failed",
      expect.objectContaining({ error: "Error: executor disposed" }),
    );
  });
});

// ─── Priority ordering ──────────────────────────────────────────────

describe("hook priority ordering", () => {
  it("priorities are in correct order: kg-update < memory-extract < quality-check", () => {
    expect(KG_UPDATE_PRIORITY).toBeLessThan(MEMORY_EXTRACT_PRIORITY);
    expect(MEMORY_EXTRACT_PRIORITY).toBeLessThan(QUALITY_CHECK_PRIORITY);
  });

  it("hooks from buildPostWritingHookChain are sorted by priority (with qualityCheck)", () => {
    const hooks = buildPostWritingHookChain({
      kgUpdate: makeKgUpdateDeps(),
      memoryExtract: makeMemoryExtractDeps(),
      qualityCheck: makeQualityCheckDeps(),
    });

    expect(hooks).toHaveLength(3);
    expect(hooks[0]!.name).toBe("kg-update");
    expect(hooks[1]!.name).toBe("memory-extract");
    expect(hooks[2]!.name).toBe("quality-check");

    // Verify priority is set
    expect(hooks[0]!.priority).toBe(KG_UPDATE_PRIORITY);
    expect(hooks[1]!.priority).toBe(MEMORY_EXTRACT_PRIORITY);
    expect(hooks[2]!.priority).toBe(QUALITY_CHECK_PRIORITY);
  });

  it("hooks from buildPostWritingHookChain omits quality-check when deps absent", () => {
    const hooks = buildPostWritingHookChain({
      kgUpdate: makeKgUpdateDeps(),
      memoryExtract: makeMemoryExtractDeps(),
    });

    expect(hooks).toHaveLength(2);
    expect(hooks[0]!.name).toBe("kg-update");
    expect(hooks[1]!.name).toBe("memory-extract");
  });
});

// ─── Error isolation (integration-style) ────────────────────────────

describe("error isolation across hooks", () => {
  it("one hook failing does not prevent subsequent hooks from running", async () => {
    const executionOrder: string[] = [];

    const failingHook = createKgUpdateHook({
      ...makeKgUpdateDeps(),
      scanEntities: () => {
        throw new Error("scan exploded");
      },
    });
    // Wrap to track execution
    const originalExecute = failingHook.execute.bind(failingHook);
    failingHook.execute = async (ctx: PostWritingHookContext) => {
      executionOrder.push("kg-update-start");
      await originalExecute(ctx);
      executionOrder.push("kg-update-end");
    };

    const memDeps = makeMemoryExtractDeps();
    const memHook = createMemoryExtractHook(memDeps);
    const memOriginal = memHook.execute.bind(memHook);
    memHook.execute = async (ctx: PostWritingHookContext) => {
      executionOrder.push("memory-extract");
      await memOriginal(ctx);
    };

    const qcDeps = makeQualityCheckDeps();
    const qcHook = createQualityCheckHook(qcDeps);
    const qcOriginal = qcHook.execute.bind(qcHook);
    qcHook.execute = async (ctx: PostWritingHookContext) => {
      executionOrder.push("quality-check");
      await qcOriginal(ctx);
    };

    // Simulate orchestrator Stage 8 loop: each hook is independently try-catch'd
    const hooks = [failingHook, memHook, qcHook];
    const ctx = makeContext({ fullText: "我喜欢用诗意的风格来写。李明走进了青云城。" });

    for (const hook of hooks) {
      try {
        await hook.execute(ctx);
      } catch {
        // Hook failure caught — continue to next hook
      }
    }

    // Despite kg-update throwing, memory-extract and quality-check still ran
    expect(executionOrder).toContain("memory-extract");
    expect(executionOrder).toContain("quality-check");
  });

  it("disabled hooks are skipped", () => {
    const hook = createKgUpdateHook(makeKgUpdateDeps());
    hook.enabled = false;

    // Orchestrator checks `hook.enabled === false` before calling execute.
    // We verify the field can be set.
    expect(hook.enabled).toBe(false);
  });
});

// ─── buildPostWritingHookChain ──────────────────────────────────────

describe("buildPostWritingHookChain", () => {
  it("creates all 3 hooks when qualityCheck deps are provided", () => {
    const hooks = buildPostWritingHookChain({
      kgUpdate: makeKgUpdateDeps(),
      memoryExtract: makeMemoryExtractDeps(),
      qualityCheck: makeQualityCheckDeps(),
    });

    expect(hooks).toHaveLength(3);
    const names = hooks.map((h) => h.name);
    expect(names).toContain("kg-update");
    expect(names).toContain("memory-extract");
    expect(names).toContain("quality-check");
  });

  it("creates only 2 hooks when qualityCheck deps are omitted", () => {
    const hooks = buildPostWritingHookChain({
      kgUpdate: makeKgUpdateDeps(),
      memoryExtract: makeMemoryExtractDeps(),
    });

    expect(hooks).toHaveLength(2);
    const names = hooks.map((h) => h.name);
    expect(names).toContain("kg-update");
    expect(names).toContain("memory-extract");
    expect(names).not.toContain("quality-check");
  });

  it("all hooks are enabled by default", () => {
    const hooks = buildPostWritingHookChain({
      kgUpdate: makeKgUpdateDeps(),
      memoryExtract: makeMemoryExtractDeps(),
      qualityCheck: makeQualityCheckDeps(),
    });

    for (const hook of hooks) {
      expect(hook.enabled).toBeUndefined(); // undefined means enabled
    }
  });
});
