import { describe, expect, it, vi } from "vitest";

import {
  createAutoCompact,
  estimateConversationTokens,
} from "../autoCompact";
import {
  CIRCUIT_BREAKER_COOLDOWN_MS,
  createCompactConfig,
} from "../compactConfig";
import {
  createNarrativeCompact,
  type CompactMessage,
  type NarrativeKnowledgeSnapshot,
} from "../narrativeCompact";

function makeMessages(): CompactMessage[] {
  return [
    { id: "sys", role: "system", content: "你是小说写作助手。", compactable: false },
    { id: "u1", role: "user", content: "第一轮提问：描写白塔城。".repeat(8) },
    { id: "a1", role: "assistant", content: "第一轮回答：白塔城终年雾海。".repeat(8) },
    {
      id: "pinned",
      role: "assistant",
      content: "角色设定：林远是白塔守护者。",
      compactable: false,
    },
    { id: "u2", role: "user", content: "第二轮提问：补充冲突。".repeat(8) },
    { id: "a2", role: "assistant", content: "第二轮回答：冲突升级。".repeat(8) },
    { id: "u3", role: "user", content: "第三轮提问：推进伏笔。".repeat(8) },
    { id: "a3", role: "assistant", content: "第三轮回答：伏笔尚未揭晓。".repeat(8) },
  ];
}

function makeKg(): NarrativeKnowledgeSnapshot {
  return {
    entities: ["林远", "白塔"],
    relations: ["林远->白塔守护者"],
    characterSettings: ["林远寡言谨慎"],
    unresolvedPlotPoints: ["白塔钟声来源未揭示"],
  };
}

describe("AutoCompact / NarrativeCompact", () => {
  it("below threshold does not trigger compaction", async () => {
    const narrativeCompact = {
      compact: vi.fn(),
    };
    const autoCompact = createAutoCompact({
      config: {
        minTokenThreshold: 500,
        triggerThresholdPercent: 0.87,
        preserveRecentRounds: 3,
        maxConsecutiveFailures: 3,
        contextBudget: 20_000,
        summaryMaxTokens: 400,
      },
      narrativeCompact,
    });
    const messages = [
      { id: "u1", role: "user", content: "你好" },
    ] satisfies CompactMessage[];

    const result = await autoCompact.maybeCompact({
      messages,
      auxiliaryModel: "gpt-4o-mini",
      kgSnapshot: makeKg(),
    });

    expect(result.compacted).toBe(false);
    expect(result.reason).toBe("below-threshold");
    expect(narrativeCompact.compact).not.toHaveBeenCalled();
    expect(result.messages).toEqual(messages);
  });

  it("returns no-change when threshold exceeded but compaction output is unchanged", async () => {
    const messages: CompactMessage[] = [
      { id: "sys", role: "system", content: "系统提示", compactable: false },
      {
        id: "pinned-1",
        role: "assistant",
        content: "角色设定：苏岚是守门人。".repeat(8),
        compactable: false,
      },
      {
        id: "pinned-2",
        role: "user",
        content: "未解伏笔：钟楼密室钥匙下落。".repeat(8),
        compactable: false,
      },
    ];
    const narrativeCompact = {
      compact: vi.fn().mockResolvedValue({
        compactedMessages: messages,
      }),
    };
    const autoCompact = createAutoCompact({
      config: {
        minTokenThreshold: 10,
        triggerThresholdPercent: 0.5,
        preserveRecentRounds: 2,
        maxConsecutiveFailures: 3,
        contextBudget: 80,
        summaryMaxTokens: 200,
      },
      narrativeCompact: narrativeCompact as ReturnType<typeof createNarrativeCompact>,
    });

    const result = await autoCompact.maybeCompact({
      messages,
      auxiliaryModel: "gpt-4o-mini",
      kgSnapshot: makeKg(),
      requestId: "req-no-change",
    });

    expect(narrativeCompact.compact).toHaveBeenCalledTimes(1);
    expect(result.compacted).toBe(false);
    expect(result.reason).toBe("no-change");
    expect(result.messages).toEqual(messages);
  });

  it("rejects compaction output when token count expands and counts it as failure", async () => {
    const messages: CompactMessage[] = [
      { id: "sys", role: "system", content: "系统提示", compactable: false },
      { id: "u1", role: "user", content: "白塔夜色。".repeat(12) },
      { id: "a1", role: "assistant", content: "林远巡塔。".repeat(12) },
    ];
    const narrativeCompact = {
      compact: vi
        .fn()
        .mockRejectedValueOnce(new Error("llm unavailable"))
        .mockResolvedValueOnce({
          compactedMessages: [
            ...messages,
            {
              id: "summary",
              role: "assistant",
              content: "冗长摘要".repeat(120),
            },
          ] satisfies CompactMessage[],
        }),
    };
    const autoCompact = createAutoCompact({
      config: {
        minTokenThreshold: 10,
        triggerThresholdPercent: 0.2,
        preserveRecentRounds: 2,
        maxConsecutiveFailures: 3,
        contextBudget: 100,
        summaryMaxTokens: 200,
      },
      narrativeCompact: narrativeCompact as ReturnType<typeof createNarrativeCompact>,
    });

    const first = await autoCompact.maybeCompact({
      messages,
      auxiliaryModel: "gpt-4o-mini",
      kgSnapshot: makeKg(),
      requestId: "req-fail-then-expand-1",
    });
    const second = await autoCompact.maybeCompact({
      messages,
      auxiliaryModel: "gpt-4o-mini",
      kgSnapshot: makeKg(),
      requestId: "req-fail-then-expand-2",
    });

    expect(first.reason).toBe("compact-failed");
    expect(second.reason).toBe("expansion-rejected");
    expect(second.compacted).toBe(false);
    expect(second.messages).toEqual(messages);
    expect(second.totalTokensAfter).toBeGreaterThanOrEqual(second.totalTokensBefore);
    expect(autoCompact.getConsecutiveFailures()).toBe(2);
  });

  it("returns compacted-insufficient when reduced tokens still exceed threshold and increments failures", async () => {
    const messages: CompactMessage[] = [
      { id: "sys", role: "system", content: "系统提示", compactable: false },
      { id: "u1", role: "user", content: "长".repeat(60) },
      { id: "a1", role: "assistant", content: "答".repeat(60) },
    ];
    const compactedMessages: CompactMessage[] = [
      { id: "sys", role: "system", content: "系统提示", compactable: false },
      { id: "summary", role: "assistant", content: "压缩".repeat(40) },
    ];
    const warn = vi.fn();
    const narrativeCompact = {
      compact: vi.fn().mockResolvedValue({
        compactedMessages,
      }),
    };
    const autoCompact = createAutoCompact({
      config: {
        minTokenThreshold: 10,
        triggerThresholdPercent: 0.9,
        preserveRecentRounds: 1,
        maxConsecutiveFailures: 3,
        contextBudget: 100,
        summaryMaxTokens: 120,
      },
      narrativeCompact: narrativeCompact as ReturnType<typeof createNarrativeCompact>,
      logger: { warn },
    });

    const result = await autoCompact.maybeCompact({
      messages,
      auxiliaryModel: "gpt-4o-mini",
      kgSnapshot: makeKg(),
      requestId: "req-insufficient",
    });

    expect(result.compacted).toBe(true);
    expect(result.reason).toBe("compacted-insufficient");
    expect(result.insufficientCompaction).toBe(true);
    expect(result.messages).toEqual(compactedMessages);
    expect(result.totalTokensAfter).toBeLessThan(result.totalTokensBefore);
    expect(result.totalTokensAfter).toBeGreaterThan(result.thresholdTokens);
    expect(autoCompact.getConsecutiveFailures()).toBe(1);
    expect(warn).toHaveBeenCalledWith(
      "auto_compact_insufficient",
      expect.objectContaining({
        consecutiveFailures: 1,
      }),
    );
  });

  it("above threshold triggers compaction and produces summary via skill pattern", async () => {
    const invokeSkillSummary = vi.fn().mockResolvedValue({
      summary: "## Narrative Summary\n林远调查白塔钟声。",
      usage: { promptTokens: 120, completionTokens: 40 },
    });
    const narrativeCompact = createNarrativeCompact({
      invokeSkillSummary,
    });
    const autoCompact = createAutoCompact({
      config: {
        minTokenThreshold: 500,
        triggerThresholdPercent: 0.87,
        preserveRecentRounds: 2,
        maxConsecutiveFailures: 3,
        contextBudget: 700,
        summaryMaxTokens: 300,
      },
      narrativeCompact,
    });

    const result = await autoCompact.maybeCompact({
      messages: makeMessages(),
      auxiliaryModel: "gpt-4o-mini",
      kgSnapshot: makeKg(),
      requestId: "req-compact-1",
    });

    expect(result.compacted).toBe(true);
    expect(["compacted", "compacted-insufficient"]).toContain(result.reason);
    expect(result.messages.some((m) => m.id.startsWith("compact-summary-"))).toBe(true);
    expect(invokeSkillSummary).toHaveBeenCalledWith(
      expect.objectContaining({
        skillId: "builtin:summarize",
        modelId: "gpt-4o-mini",
        summaryMaxTokens: 300,
        input: expect.stringContaining("请将摘要控制在约 300 tokens 以内。"),
      }),
    );
    const prompt = invokeSkillSummary.mock.calls[0]?.[0]?.input ?? "";
    expect(prompt).toContain("Narrative tone markers and current POV");
    expect(prompt).toContain("Foreshadowing clues and suspense threads");
    expect(prompt).toContain("Timeline markers and sequence constraints");
    expect(prompt).toContain("Explicit user writing constraints");
    expect(prompt).toContain(
      "Do NOT use markdown headings, section labels, bullet lists, numbered lists, or tables.",
    );
    expect(prompt).not.toContain("## Narrative Summary");
  });

  it("preserves compactable:false messages", async () => {
    const narrativeCompact = createNarrativeCompact({
      invokeSkillSummary: vi.fn().mockResolvedValue({
        summary: "压缩摘要。",
      }),
    });

    const result = await narrativeCompact.compact({
      messages: makeMessages(),
      preserveRecentRounds: 1,
      summaryMaxTokens: 200,
      auxiliaryModel: "gpt-4o-mini",
      kgSnapshot: makeKg(),
      requestId: "req-pinned",
    });

    const ids = result.compactedMessages.map((message) => message.id);
    expect(ids).toContain("pinned");
  });

  it("uses CJK-aware token estimation accuracy", () => {
    const tokens = estimateConversationTokens([
      { id: "cjk", role: "user", content: "你好世界" },
    ]);
    expect(tokens).toBe(6);
  });

  it("records compaction call cost", async () => {
    const recordUsage = vi.fn();
    const narrativeCompact = createNarrativeCompact({
      invokeSkillSummary: vi.fn().mockResolvedValue({
        summary: "## Narrative Summary\n完成压缩。",
        usage: { promptTokens: 88, completionTokens: 22 },
      }),
      costTracker: {
        recordUsage,
      },
    });

    await narrativeCompact.compact({
      messages: makeMessages(),
      preserveRecentRounds: 1,
      summaryMaxTokens: 200,
      auxiliaryModel: "gpt-4o-mini",
      kgSnapshot: makeKg(),
      requestId: "req-cost",
    });

    expect(recordUsage).toHaveBeenCalledWith(
      { promptTokens: 88, completionTokens: 22 },
      "gpt-4o-mini",
      "req-cost",
      "builtin:narrative-compact",
    );
  });

  it("preserves KG entities and relations in summary", async () => {
    const narrativeCompact = createNarrativeCompact({
      invokeSkillSummary: vi.fn().mockResolvedValue({
        summary: "## Narrative Summary\n林远继续调查。",
      }),
    });

    const result = await narrativeCompact.compact({
      messages: makeMessages(),
      preserveRecentRounds: 1,
      summaryMaxTokens: 200,
      auxiliaryModel: "gpt-4o-mini",
      kgSnapshot: makeKg(),
      requestId: "req-kg",
    });

    expect(result.summaryMessage.content).toContain("林远");
    expect(result.summaryMessage.content).toContain("林远->白塔守护者");
    expect(result.summaryMessage.content).toContain("白塔钟声来源未揭示");
  });

  it("preserves recent N rounds", async () => {
    const narrativeCompact = createNarrativeCompact({
      invokeSkillSummary: vi.fn().mockResolvedValue({
        summary: "## Narrative Summary\n历史已压缩。",
      }),
    });

    const result = await narrativeCompact.compact({
      messages: makeMessages(),
      preserveRecentRounds: 2,
      summaryMaxTokens: 200,
      auxiliaryModel: "gpt-4o-mini",
      kgSnapshot: makeKg(),
      requestId: "req-rounds",
    });

    const ids = result.compactedMessages.map((message) => message.id);
    expect(ids).toContain("u2");
    expect(ids).toContain("a2");
    expect(ids).toContain("u3");
    expect(ids).toContain("a3");
  });

  it("returns original messages when compaction fails and trips circuit breaker", async () => {
    const config = createCompactConfig({
      modelConfig: {
        primaryModel: "gpt-4o",
        auxiliaryModel: "gpt-4o-mini",
        sharedModel: false,
      },
      overrides: {
        contextBudget: 100,
        summaryMaxTokens: 120,
        preserveRecentRounds: 1,
      },
    });
    const narrativeCompact = createNarrativeCompact({
      invokeSkillSummary: vi.fn().mockRejectedValue(new Error("llm unavailable")),
    });
    const warn = vi.fn();
    const autoCompact = createAutoCompact({
      config,
      narrativeCompact,
      logger: { warn },
    });
    const messages = makeMessages();

    const first = await autoCompact.maybeCompact({
      messages,
      auxiliaryModel: "gpt-4o-mini",
      kgSnapshot: makeKg(),
    });
    const second = await autoCompact.maybeCompact({
      messages,
      auxiliaryModel: "gpt-4o-mini",
      kgSnapshot: makeKg(),
    });
    const third = await autoCompact.maybeCompact({
      messages,
      auxiliaryModel: "gpt-4o-mini",
      kgSnapshot: makeKg(),
    });
    const fourth = await autoCompact.maybeCompact({
      messages,
      auxiliaryModel: "gpt-4o-mini",
      kgSnapshot: makeKg(),
    });

    expect(first.reason).toBe("compact-failed");
    expect(second.reason).toBe("compact-failed");
    expect(third.reason).toBe("compact-failed");
    expect(fourth.reason).toBe("circuit-open");
    expect(fourth.messages).toEqual(messages);
    expect(first.error).toBeInstanceOf(Error);
    expect(warn).toHaveBeenCalledWith(
      "auto_compact_failed",
      expect.objectContaining({
        reason: "narrative_compact_error",
      }),
    );
  });

  it("allows one half-open probe after cooldown and closes breaker on probe success", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));
    try {
      const messages = makeMessages();
      const compactedMessages: CompactMessage[] = [
        { id: "sys", role: "system", content: "系统提示", compactable: false },
        { id: "summary", role: "assistant", content: "压缩摘要", compactable: false },
      ];
      const narrativeCompact = {
        compact: vi
          .fn()
          .mockRejectedValueOnce(new Error("llm unavailable-1"))
          .mockRejectedValueOnce(new Error("llm unavailable-2"))
          .mockRejectedValueOnce(new Error("llm unavailable-3"))
          .mockResolvedValueOnce({ compactedMessages }),
      };
      const onCircuitBreakerStateChange = vi.fn();
      const autoCompact = createAutoCompact({
        config: {
          minTokenThreshold: 10,
          triggerThresholdPercent: 0.2,
          preserveRecentRounds: 1,
          maxConsecutiveFailures: 3,
          contextBudget: 200,
          summaryMaxTokens: 120,
        },
        narrativeCompact: narrativeCompact as ReturnType<typeof createNarrativeCompact>,
        onCircuitBreakerStateChange,
      });

      await autoCompact.maybeCompact({
        messages,
        auxiliaryModel: "gpt-4o-mini",
        kgSnapshot: makeKg(),
      });
      await autoCompact.maybeCompact({
        messages,
        auxiliaryModel: "gpt-4o-mini",
        kgSnapshot: makeKg(),
      });
      await autoCompact.maybeCompact({
        messages,
        auxiliaryModel: "gpt-4o-mini",
        kgSnapshot: makeKg(),
      });
      const blocked = await autoCompact.maybeCompact({
        messages,
        auxiliaryModel: "gpt-4o-mini",
        kgSnapshot: makeKg(),
      });
      expect(blocked.reason).toBe("circuit-open");

      vi.advanceTimersByTime(CIRCUIT_BREAKER_COOLDOWN_MS + 1);
      const probe = await autoCompact.maybeCompact({
        messages,
        auxiliaryModel: "gpt-4o-mini",
        kgSnapshot: makeKg(),
      });

      expect(probe.reason).toBe("compacted");
      expect(autoCompact.getConsecutiveFailures()).toBe(0);
      expect(narrativeCompact.compact).toHaveBeenCalledTimes(4);
      expect(onCircuitBreakerStateChange).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          open: true,
          reason: "threshold-reached",
        }),
      );
      expect(onCircuitBreakerStateChange).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          open: false,
          reason: "half-open-probe-succeeded",
        }),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("re-opens breaker when the half-open probe fails", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));
    try {
      const messages = makeMessages();
      const narrativeCompact = {
        compact: vi.fn().mockRejectedValue(new Error("llm unavailable")),
      };
      const onCircuitBreakerStateChange = vi.fn();
      const autoCompact = createAutoCompact({
        config: {
          minTokenThreshold: 10,
          triggerThresholdPercent: 0.2,
          preserveRecentRounds: 1,
          maxConsecutiveFailures: 3,
          contextBudget: 200,
          summaryMaxTokens: 120,
        },
        narrativeCompact: narrativeCompact as ReturnType<typeof createNarrativeCompact>,
        onCircuitBreakerStateChange,
      });

      await autoCompact.maybeCompact({
        messages,
        auxiliaryModel: "gpt-4o-mini",
        kgSnapshot: makeKg(),
      });
      await autoCompact.maybeCompact({
        messages,
        auxiliaryModel: "gpt-4o-mini",
        kgSnapshot: makeKg(),
      });
      await autoCompact.maybeCompact({
        messages,
        auxiliaryModel: "gpt-4o-mini",
        kgSnapshot: makeKg(),
      });
      vi.advanceTimersByTime(CIRCUIT_BREAKER_COOLDOWN_MS + 1);

      const probeFailure = await autoCompact.maybeCompact({
        messages,
        auxiliaryModel: "gpt-4o-mini",
        kgSnapshot: makeKg(),
      });
      expect(probeFailure.reason).toBe("compact-failed");

      const afterProbeFailure = await autoCompact.maybeCompact({
        messages,
        auxiliaryModel: "gpt-4o-mini",
        kgSnapshot: makeKg(),
      });
      expect(afterProbeFailure.reason).toBe("circuit-open");
      expect(onCircuitBreakerStateChange).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          open: true,
          reason: "threshold-reached",
        }),
      );
      expect(onCircuitBreakerStateChange).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          open: true,
          reason: "half-open-probe-failed",
        }),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps breaker open when the half-open probe returns no-change", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));
    try {
      const messages = makeMessages();
      const narrativeCompact = {
        compact: vi
          .fn()
          .mockRejectedValueOnce(new Error("llm unavailable-1"))
          .mockRejectedValueOnce(new Error("llm unavailable-2"))
          .mockRejectedValueOnce(new Error("llm unavailable-3"))
          .mockResolvedValueOnce({
            compactedMessages: messages,
          }),
      };
      const onCircuitBreakerStateChange = vi.fn();
      const autoCompact = createAutoCompact({
        config: {
          minTokenThreshold: 10,
          triggerThresholdPercent: 0.2,
          preserveRecentRounds: 1,
          maxConsecutiveFailures: 3,
          contextBudget: 200,
          summaryMaxTokens: 120,
        },
        narrativeCompact: narrativeCompact as ReturnType<typeof createNarrativeCompact>,
        onCircuitBreakerStateChange,
      });

      await autoCompact.maybeCompact({
        messages,
        auxiliaryModel: "gpt-4o-mini",
        kgSnapshot: makeKg(),
      });
      await autoCompact.maybeCompact({
        messages,
        auxiliaryModel: "gpt-4o-mini",
        kgSnapshot: makeKg(),
      });
      await autoCompact.maybeCompact({
        messages,
        auxiliaryModel: "gpt-4o-mini",
        kgSnapshot: makeKg(),
      });
      vi.advanceTimersByTime(CIRCUIT_BREAKER_COOLDOWN_MS + 1);

      const probeNoChange = await autoCompact.maybeCompact({
        messages,
        auxiliaryModel: "gpt-4o-mini",
        kgSnapshot: makeKg(),
      });
      expect(probeNoChange.reason).toBe("no-change");

      const blocked = await autoCompact.maybeCompact({
        messages,
        auxiliaryModel: "gpt-4o-mini",
        kgSnapshot: makeKg(),
      });
      expect(blocked.reason).toBe("circuit-open");
      expect(onCircuitBreakerStateChange).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          open: true,
          reason: "threshold-reached",
        }),
      );
      expect(onCircuitBreakerStateChange).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          open: true,
          reason: "half-open-probe-failed",
        }),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps breaker open when the half-open probe expands token count", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));
    try {
      const messages = makeMessages();
      const expandedMessages: CompactMessage[] = [
        ...messages,
        {
          id: "summary-expanded",
          role: "assistant",
          content: "冗长扩展摘要".repeat(200),
        },
      ];
      const narrativeCompact = {
        compact: vi
          .fn()
          .mockRejectedValueOnce(new Error("llm unavailable-1"))
          .mockRejectedValueOnce(new Error("llm unavailable-2"))
          .mockRejectedValueOnce(new Error("llm unavailable-3"))
          .mockResolvedValueOnce({
            compactedMessages: expandedMessages,
          }),
      };
      const onCircuitBreakerStateChange = vi.fn();
      const autoCompact = createAutoCompact({
        config: {
          minTokenThreshold: 10,
          triggerThresholdPercent: 0.2,
          preserveRecentRounds: 1,
          maxConsecutiveFailures: 3,
          contextBudget: 200,
          summaryMaxTokens: 120,
        },
        narrativeCompact: narrativeCompact as ReturnType<typeof createNarrativeCompact>,
        onCircuitBreakerStateChange,
      });

      await autoCompact.maybeCompact({
        messages,
        auxiliaryModel: "gpt-4o-mini",
        kgSnapshot: makeKg(),
      });
      await autoCompact.maybeCompact({
        messages,
        auxiliaryModel: "gpt-4o-mini",
        kgSnapshot: makeKg(),
      });
      await autoCompact.maybeCompact({
        messages,
        auxiliaryModel: "gpt-4o-mini",
        kgSnapshot: makeKg(),
      });
      vi.advanceTimersByTime(CIRCUIT_BREAKER_COOLDOWN_MS + 1);

      const probeExpanded = await autoCompact.maybeCompact({
        messages,
        auxiliaryModel: "gpt-4o-mini",
        kgSnapshot: makeKg(),
      });
      expect(probeExpanded.reason).toBe("expansion-rejected");

      const blocked = await autoCompact.maybeCompact({
        messages,
        auxiliaryModel: "gpt-4o-mini",
        kgSnapshot: makeKg(),
      });
      expect(blocked.reason).toBe("circuit-open");
      expect(onCircuitBreakerStateChange).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          open: true,
          reason: "threshold-reached",
        }),
      );
      expect(onCircuitBreakerStateChange).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          open: true,
          reason: "half-open-probe-failed",
        }),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("resetCircuitBreaker closes breaker and allows subsequent compaction attempts", async () => {
    const messages = makeMessages();
    const compactedMessages: CompactMessage[] = [
      { id: "sys", role: "system", content: "系统提示", compactable: false },
      { id: "summary", role: "assistant", content: "压缩摘要", compactable: false },
    ];
    const narrativeCompact = {
      compact: vi
        .fn()
        .mockRejectedValueOnce(new Error("llm unavailable-1"))
        .mockRejectedValueOnce(new Error("llm unavailable-2"))
        .mockRejectedValueOnce(new Error("llm unavailable-3"))
        .mockResolvedValueOnce({ compactedMessages }),
    };
    const onCircuitBreakerStateChange = vi.fn();
    const autoCompact = createAutoCompact({
      config: {
        minTokenThreshold: 10,
        triggerThresholdPercent: 0.2,
        preserveRecentRounds: 1,
        maxConsecutiveFailures: 3,
        contextBudget: 200,
        summaryMaxTokens: 120,
      },
      narrativeCompact: narrativeCompact as ReturnType<typeof createNarrativeCompact>,
      onCircuitBreakerStateChange,
    });

    await autoCompact.maybeCompact({
      messages,
      auxiliaryModel: "gpt-4o-mini",
      kgSnapshot: makeKg(),
    });
    await autoCompact.maybeCompact({
      messages,
      auxiliaryModel: "gpt-4o-mini",
      kgSnapshot: makeKg(),
    });
    await autoCompact.maybeCompact({
      messages,
      auxiliaryModel: "gpt-4o-mini",
      kgSnapshot: makeKg(),
    });
    const blocked = await autoCompact.maybeCompact({
      messages,
      auxiliaryModel: "gpt-4o-mini",
      kgSnapshot: makeKg(),
    });
    expect(blocked.reason).toBe("circuit-open");

    autoCompact.resetCircuitBreaker();
    expect(autoCompact.getConsecutiveFailures()).toBe(0);

    const afterReset = await autoCompact.maybeCompact({
      messages,
      auxiliaryModel: "gpt-4o-mini",
      kgSnapshot: makeKg(),
    });
    expect(afterReset.reason).toBe("compacted");
    expect(narrativeCompact.compact).toHaveBeenCalledTimes(4);
    expect(onCircuitBreakerStateChange).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        open: true,
        reason: "threshold-reached",
      }),
    );
    expect(onCircuitBreakerStateChange).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        open: false,
        reason: "manual-reset",
      }),
    );
  });

  it("uses model context window from configured model id", () => {
    const config = createCompactConfig({
      modelConfig: {
        primaryModel: "gpt-4.1-mini",
        auxiliaryModel: "gpt-4o-mini",
        sharedModel: false,
      },
    });
    expect(config.contextBudget).toBe(1_000_000);
    expect(config.minTokenThreshold).toBe(500);
    expect(config.triggerThresholdPercent).toBe(0.87);
  });

  it("falls back when configured model is unknown", () => {
    const config = createCompactConfig({
      modelConfig: {
        primaryModel: "unknown-model",
        auxiliaryModel: "also-unknown-model",
        sharedModel: false,
      },
    });
    expect(config.contextBudget).toBe(128_000);
  });

  it("returns fallback summary when no history message is compactable", async () => {
    const invokeSkillSummary = vi.fn().mockResolvedValue({
      summary: "不应被调用",
    });
    const narrativeCompact = createNarrativeCompact({
      invokeSkillSummary,
    });
    const messages: CompactMessage[] = [
      { id: "sys", role: "system", content: "系统提示", compactable: false },
      { id: "pinned-history", role: "assistant", content: "角色设定：苏岚", compactable: false },
      { id: "u-recent", role: "user", content: "最近一轮用户消息", compactable: false },
      { id: "a-recent", role: "assistant", content: "最近一轮助手消息", compactable: false },
    ];

    const result = await narrativeCompact.compact({
      messages,
      preserveRecentRounds: 1,
      summaryMaxTokens: 200,
      auxiliaryModel: "gpt-4o-mini",
      kgSnapshot: makeKg(),
      requestId: "req-no-compactable",
    });

    expect(result.summaryMessage.content).toBe("无需压缩：历史中没有可压缩内容。");
    expect(invokeSkillSummary).not.toHaveBeenCalled();
    expect(result.compactedMessages).toEqual(messages);
    expect(result.compactedMessages.some((message) => message.id.startsWith("compact-summary-"))).toBe(false);
  });

  it("uses configured auxiliary model before request fallback model", async () => {
    const invokeSkillSummary = vi.fn().mockResolvedValue({
      summary: "## Narrative Summary\n使用辅助模型进行压缩。",
    });
    const narrativeCompact = createNarrativeCompact({
      invokeSkillSummary,
    });
    const autoCompact = createAutoCompact({
      config: {
        minTokenThreshold: 500,
        triggerThresholdPercent: 0.87,
        preserveRecentRounds: 1,
        maxConsecutiveFailures: 3,
        contextBudget: 100,
        summaryMaxTokens: 200,
        auxiliaryModel: "gpt-4o-mini",
      },
      narrativeCompact,
    });

    await autoCompact.maybeCompact({
      messages: makeMessages(),
      auxiliaryModel: "gpt-4o",
      kgSnapshot: makeKg(),
      requestId: "req-aux-priority",
    });

    expect(invokeSkillSummary).toHaveBeenCalledWith(
      expect.objectContaining({
        modelId: "gpt-4o-mini",
      }),
    );
  });

  it("uses the smaller request-model context window for threshold calculation", async () => {
    const narrativeCompact = {
      compact: vi.fn().mockResolvedValue({
        compactedMessages: [
          { id: "sys", role: "system", content: "系统提示", compactable: false },
          { id: "summary", role: "assistant", content: "压缩摘要", compactable: false },
        ] satisfies CompactMessage[],
      }),
    };
    const autoCompact = createAutoCompact({
      config: {
        minTokenThreshold: 500,
        triggerThresholdPercent: 0.87,
        preserveRecentRounds: 2,
        maxConsecutiveFailures: 3,
        contextBudget: 10_000,
        summaryMaxTokens: 200,
      },
      narrativeCompact: narrativeCompact as ReturnType<typeof createNarrativeCompact>,
    });
    const messages: CompactMessage[] = [
      { id: "sys", role: "system", content: "系统提示", compactable: false },
      { id: "u1", role: "user", content: "长".repeat(5_000) },
      { id: "a1", role: "assistant", content: "长".repeat(5_000) },
    ];

    const result = await autoCompact.maybeCompact({
      messages,
      auxiliaryModel: "gpt-4.1-mini",
      requestModelId: "gpt-4o-mini",
      kgSnapshot: makeKg(),
      requestId: "req-small-window",
    });

    expect(result.thresholdTokens).toBe(8_700);
    expect(result.reason).toBe("compacted");
    expect(result.compacted).toBe(true);
    expect(narrativeCompact.compact).toHaveBeenCalledTimes(1);
  });

  it("resolves compact config lazily per request", async () => {
    const narrativeCompact = {
      compact: vi.fn().mockResolvedValue({
        compactedMessages: [
          { id: "sys", role: "system", content: "系统提示", compactable: false },
          { id: "summary", role: "assistant", content: "压缩摘要", compactable: false },
          { id: "u3", role: "user", content: "第三轮提问：推进伏笔。".repeat(8) },
          { id: "a3", role: "assistant", content: "第三轮回答：伏笔尚未揭晓。".repeat(8) },
        ] satisfies CompactMessage[],
      }),
    };
    const getConfig = vi
      .fn()
      .mockReturnValueOnce({
        minTokenThreshold: 500,
        triggerThresholdPercent: 0.87,
        preserveRecentRounds: 1,
        maxConsecutiveFailures: 3,
        contextBudget: 700,
        summaryMaxTokens: 200,
        auxiliaryModel: "gpt-4o-mini",
      })
      .mockReturnValueOnce({
        minTokenThreshold: 500,
        triggerThresholdPercent: 0.87,
        preserveRecentRounds: 1,
        maxConsecutiveFailures: 3,
        contextBudget: 1_000_000,
        summaryMaxTokens: 200,
        auxiliaryModel: "gpt-4o-mini",
      });
    const autoCompact = createAutoCompact({
      getConfig,
      narrativeCompact: narrativeCompact as ReturnType<typeof createNarrativeCompact>,
    });

    const first = await autoCompact.maybeCompact({
      messages: makeMessages(),
      kgSnapshot: makeKg(),
      requestId: "req-lazy-1",
    });
    const second = await autoCompact.maybeCompact({
      messages: makeMessages(),
      kgSnapshot: makeKg(),
      requestId: "req-lazy-2",
    });

    expect(first.reason).toBe("compacted");
    expect(second.reason).toBe("below-threshold");
    expect(getConfig).toHaveBeenCalledTimes(2);
    expect(narrativeCompact.compact).toHaveBeenCalledTimes(1);
  });
  it("does not trigger when below minimum absolute token threshold", async () => {
    const narrativeCompact = {
      compact: vi.fn(),
    };
    const autoCompact = createAutoCompact({
      config: {
        minTokenThreshold: 500,
        triggerThresholdPercent: 0.2,
        preserveRecentRounds: 2,
        maxConsecutiveFailures: 3,
        contextBudget: 100,
        summaryMaxTokens: 200,
      },
      narrativeCompact: narrativeCompact as ReturnType<typeof createNarrativeCompact>,
    });
    const messages: CompactMessage[] = [
      { id: "u1", role: "user", content: "长".repeat(30) },
      { id: "a1", role: "assistant", content: "答".repeat(30) },
    ];

    const result = await autoCompact.maybeCompact({
      messages,
      auxiliaryModel: "gpt-4o-mini",
      kgSnapshot: makeKg(),
      requestId: "req-min-token-threshold",
    });

    expect(result.compacted).toBe(false);
    expect(result.reason).toBe("below-threshold");
    expect(narrativeCompact.compact).not.toHaveBeenCalled();
  });
});
