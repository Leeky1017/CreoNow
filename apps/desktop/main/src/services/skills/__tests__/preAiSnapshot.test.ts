import { describe, expect, it, vi } from "vitest";

import { createSkillExecutor } from "../skillExecutor";
import type { SkillExecutorRunArgs } from "../skillExecutor";

function makeRunArgs(overrides?: Partial<SkillExecutorRunArgs>): SkillExecutorRunArgs {
  return {
    skillId: "polish",
    input: "这是一段需要润色的文本",
    mode: "plan" as const,
    model: "test-model",
    stream: false,
    ts: Date.now(),
    emitEvent: vi.fn(),
    context: { projectId: "proj-snap", documentId: "doc-snap" },
    ...overrides,
  };
}

describe("SkillExecutor — pre-AI snapshot", () => {
  it("should call createPreAiSnapshot before running skill", async () => {
    const createPreAiSnapshot = vi.fn(() =>
      Promise.resolve({ ok: true, versionId: "v-pre-1" }),
    );
    const runSkill = vi.fn(() =>
      Promise.resolve({
        ok: true as const,
        data: {
          executionId: "exec-1",
          runId: "run-1",
          outputText: "润色后的文本",
        },
      }),
    );
    const resolveSkill = vi.fn(() => ({
      ok: true as const,
      data: {
        id: "polish",
        enabled: true,
        valid: true,
        prompt: { system: "You are a writing assistant.", user: "{{input}}" },
      },
    }));

    const executor = createSkillExecutor({
      resolveSkill,
      runSkill,
      createPreAiSnapshot,
    });

    const result = await executor.execute(makeRunArgs());

    expect(createPreAiSnapshot).toHaveBeenCalledWith({
      projectId: "proj-snap",
      documentId: "doc-snap",
    });
    expect(result.ok).toBe(true);
    // Snapshot should be called before runSkill
    const snapshotOrder = createPreAiSnapshot.mock.invocationCallOrder[0];
    const runOrder = runSkill.mock.invocationCallOrder[0];
    expect(snapshotOrder).toBeDefined();
    expect(runOrder).toBeDefined();
    expect(snapshotOrder!).toBeLessThan(runOrder!);
  });

  it("should degrade gracefully when snapshot fails", async () => {
    const createPreAiSnapshot = vi.fn(() =>
      Promise.reject(new Error("snapshot failed")),
    );
    const runSkill = vi.fn(() =>
      Promise.resolve({
        ok: true as const,
        data: {
          executionId: "exec-1",
          runId: "run-1",
          outputText: "输出文本",
        },
      }),
    );
    const logger = { warn: vi.fn() };

    const executor = createSkillExecutor({
      resolveSkill: () => ({
        ok: true as const,
        data: { id: "polish", enabled: true, valid: true,
          prompt: { system: "", user: "{{input}}" } },
      }),
      runSkill,
      createPreAiSnapshot,
      logger,
    });

    const result = await executor.execute(makeRunArgs());

    expect(result.ok).toBe(true);
    expect(logger.warn).toHaveBeenCalledWith(
      "pre_ai_snapshot_degraded",
      expect.objectContaining({ skillId: "polish" }),
    );
    expect(runSkill).toHaveBeenCalled();
  });

  it("should skip snapshot when no project/document context", async () => {
    const createPreAiSnapshot = vi.fn(() =>
      Promise.resolve({ ok: true }),
    );
    const runSkill = vi.fn(() =>
      Promise.resolve({
        ok: true as const,
        data: {
          executionId: "exec-1",
          runId: "run-1",
          outputText: "输出文本",
        },
      }),
    );

    const executor = createSkillExecutor({
      resolveSkill: () => ({
        ok: true as const,
        data: { id: "polish", enabled: true, valid: true,
          prompt: { system: "", user: "{{input}}" } },
      }),
      runSkill,
      createPreAiSnapshot,
    });

    const result = await executor.execute(
      makeRunArgs({ context: undefined }),
    );

    expect(result.ok).toBe(true);
    expect(createPreAiSnapshot).not.toHaveBeenCalled();
  });

  it("should work without createPreAiSnapshot dep", async () => {
    const runSkill = vi.fn(() =>
      Promise.resolve({
        ok: true as const,
        data: {
          executionId: "exec-1",
          runId: "run-1",
          outputText: "输出文本",
        },
      }),
    );

    const executor = createSkillExecutor({
      resolveSkill: () => ({
        ok: true as const,
        data: { id: "polish", enabled: true, valid: true,
          prompt: { system: "", user: "{{input}}" } },
      }),
      runSkill,
    });

    const result = await executor.execute(makeRunArgs());

    expect(result.ok).toBe(true);
  });
});
