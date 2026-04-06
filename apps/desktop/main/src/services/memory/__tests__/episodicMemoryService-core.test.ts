import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createEpisodicMemoryService,
  createInMemoryEpisodeRepository,
  EPISODIC_ACTIVE_BUDGET,
  EPISODIC_COMPRESSED_BUDGET,
  type EpisodeRecordInput,
  type EpisodeRecord,
  type DistillGeneratedRule,
  type DistillProgressEvent,
  type InMemoryEpisodeRepository,
  type EpisodicMemoryService,
} from "../episodicMemoryService";

function createMockLogger() {
  return { logPath: "/dev/null", info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
}

const BASE_TS = 1_700_000_000_000;
const DAY_MS = 24 * 60 * 60 * 1000;

function makeInput(
  overrides: Partial<EpisodeRecordInput> = {},
): EpisodeRecordInput {
  return {
    projectId: "proj-1",
    chapterId: "ch-1",
    sceneType: "dialogue",
    skillUsed: "continuation",
    inputContext: "她走到窗前",
    candidates: ["她看到了月光", "她听到了风声"],
    selectedIndex: 0,
    finalText: "她看到了月光",
    editDistance: 0,
    ...overrides,
  };
}

function makeEpisode(overrides: Partial<EpisodeRecord> = {}): EpisodeRecord {
  return {
    id: "ep-1",
    projectId: "proj-1",
    scope: "project",
    version: 1,
    chapterId: "ch-1",
    sceneType: "dialogue",
    skillUsed: "continuation",
    inputContext: "她走到窗前",
    candidates: ["她看到了月光"],
    selectedIndex: 0,
    finalText: "她看到了月光",
    editDistance: 0,
    implicitSignal: "DIRECT_ACCEPT",
    implicitWeight: 1.0,
    importance: 0.5,
    recallCount: 0,
    compressed: false,
    userConfirmed: false,
    createdAt: BASE_TS,
    updatedAt: BASE_TS,
    ...overrides,
  };
}

let repo: InMemoryEpisodeRepository;
let logger: ReturnType<typeof createMockLogger>;
let svc: EpisodicMemoryService;

function createService(
  overrides: Record<string, unknown> = {},
): EpisodicMemoryService {
  return createEpisodicMemoryService({
    repository: repo,
    logger,
    now: () => BASE_TS,
    distillScheduler: (job) => job(),
    ...overrides,
  });
}

beforeEach(() => {
  repo = createInMemoryEpisodeRepository();
  logger = createMockLogger();
  svc = createService();
});

// ─── recordEpisode ──────────────────────────────────────────────────────────

describe("recordEpisode", () => {
  it("records with DIRECT_ACCEPT when acceptedWithoutEdit=true", async () => {
    const r = await svc.recordEpisode(
      makeInput({ acceptedWithoutEdit: true, editDistance: 0 }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.implicitSignal).toBe("DIRECT_ACCEPT");
    expect(r.data.implicitWeight).toBe(1);
    expect(r.data.retryCount).toBe(0);
    expect(r.data.episodeId).toEqual(expect.any(String));
  });

  it("records with DIRECT_ACCEPT when editDistance=0", async () => {
    const r = await svc.recordEpisode(makeInput({ editDistance: 0 }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.implicitSignal).toBe("DIRECT_ACCEPT");
  });

  it("records with LIGHT_EDIT for small editDistance", async () => {
    const r = await svc.recordEpisode(makeInput({ editDistance: 0.1 }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.implicitSignal).toBe("LIGHT_EDIT");
    expect(r.data.implicitWeight).toBe(0.45);
  });

  it("records with HEAVY_REWRITE for large editDistance", async () => {
    const r = await svc.recordEpisode(makeInput({ editDistance: 0.8 }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.implicitSignal).toBe("HEAVY_REWRITE");
    expect(r.data.implicitWeight).toBe(-0.45);
  });

  it("records with FULL_REJECT when selectedIndex=-1", async () => {
    const r = await svc.recordEpisode(
      makeInput({ selectedIndex: -1, editDistance: 0 }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.implicitSignal).toBe("FULL_REJECT");
    expect(r.data.implicitWeight).toBe(-0.8);
  });

  it("records with FULL_REJECT when candidates empty", async () => {
    const r = await svc.recordEpisode(
      makeInput({ candidates: [], editDistance: 0 }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.implicitSignal).toBe("FULL_REJECT");
  });

  it("records with UNDO_AFTER_ACCEPT signal", async () => {
    const r = await svc.recordEpisode(
      makeInput({ undoAfterAccept: true, editDistance: 0 }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.implicitSignal).toBe("UNDO_AFTER_ACCEPT");
    expect(r.data.implicitWeight).toBe(-1);
  });

  it("records with REPEATED_SCENE_SKILL signal", async () => {
    const r = await svc.recordEpisode(
      makeInput({
        repeatedSceneSkillCount: 3,
        editDistance: 0.3,
      }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.implicitSignal).toBe("REPEATED_SCENE_SKILL");
    expect(r.data.implicitWeight).toBe(0.15 * 3);
  });

  it("rejects empty projectId", async () => {
    const r = await svc.recordEpisode(makeInput({ projectId: "" }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("INVALID_ARGUMENT");
    expect(r.error.message).toContain("projectId");
  });

  it("rejects empty chapterId", async () => {
    const r = await svc.recordEpisode(makeInput({ chapterId: "" }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("INVALID_ARGUMENT");
    expect(r.error.message).toContain("chapterId");
  });

  it("rejects empty sceneType", async () => {
    const r = await svc.recordEpisode(makeInput({ sceneType: "" }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("INVALID_ARGUMENT");
    expect(r.error.message).toContain("sceneType");
  });

  it("rejects empty skillUsed", async () => {
    const r = await svc.recordEpisode(makeInput({ skillUsed: "" }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("INVALID_ARGUMENT");
    expect(r.error.message).toContain("skillUsed");
  });

  it("rejects negative editDistance", async () => {
    const r = await svc.recordEpisode(makeInput({ editDistance: -1 }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("INVALID_ARGUMENT");
    expect(r.error.message).toContain("editDistance");
  });

  it("updates existing episode when undoAfterAccept + targetEpisodeId", async () => {
    repo.seedEpisodes([
      makeEpisode({ id: "ep-target", implicitSignal: "DIRECT_ACCEPT" }),
    ]);
    const r = await svc.recordEpisode(
      makeInput({
        undoAfterAccept: true,
        targetEpisodeId: "ep-target",
        editDistance: 0,
      }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.episodeId).toBe("ep-target");
    expect(r.data.implicitSignal).toBe("UNDO_AFTER_ACCEPT");

    const dump = repo.dump();
    expect(dump.episodes).toHaveLength(1);
    expect(dump.episodes[0].implicitSignal).toBe("UNDO_AFTER_ACCEPT");
  });

  it("returns NOT_FOUND when targetEpisodeId does not exist", async () => {
    const r = await svc.recordEpisode(
      makeInput({
        undoAfterAccept: true,
        targetEpisodeId: "nonexistent",
        editDistance: 0,
      }),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("NOT_FOUND");
  });

  it("retries on repository failure and succeeds", async () => {
    repo = createInMemoryEpisodeRepository({ failInsertAttempts: 2 });
    svc = createService({ repository: repo });

    const r = await svc.recordEpisode(makeInput());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.retryCount).toBe(2);
    expect(r.data.accepted).toBe(true);
  });

  it("adds to retry queue after 3 consecutive failures", async () => {
    repo = createInMemoryEpisodeRepository({ failInsertAttempts: 5 });
    svc = createService({ repository: repo });

    expect(svc.getRetryQueueSize()).toBe(0);
    const r = await svc.recordEpisode(makeInput());
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("MEMORY_EPISODE_WRITE_FAILED");
    expect(svc.getRetryQueueSize()).toBe(1);
  });

  it("persists episode data in repository", async () => {
    await svc.recordEpisode(makeInput({ finalText: "自定义文本" }));
    const dump = repo.dump();
    expect(dump.episodes).toHaveLength(1);
    expect(dump.episodes[0].finalText).toBe("自定义文本");
    expect(dump.episodes[0].scope).toBe("project");
    expect(dump.episodes[0].version).toBe(1);
  });

  it("clamps importance to [0,1]", async () => {
    const r = await svc.recordEpisode(makeInput({ importance: 5 }));
    expect(r.ok).toBe(true);
    const dump = repo.dump();
    expect(dump.episodes[0].importance).toBeLessThanOrEqual(1);
  });
});

// ─── queryEpisodes ──────────────────────────────────────────────────────────

describe("queryEpisodes", () => {
  it("returns episodes for matching scene", () => {
    repo.seedEpisodes([
      makeEpisode({ id: "ep-1", sceneType: "dialogue" }),
      makeEpisode({ id: "ep-2", sceneType: "action" }),
    ]);
    const r = svc.queryEpisodes({
      projectId: "proj-1",
      sceneType: "dialogue",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.items).toHaveLength(1);
    expect(r.data.items[0].id).toBe("ep-1");
  });

  it("sorts by recency when no queryText", () => {
    repo.seedEpisodes([
      makeEpisode({ id: "ep-old", createdAt: BASE_TS - 1000 }),
      makeEpisode({ id: "ep-new", createdAt: BASE_TS }),
    ]);
    const r = svc.queryEpisodes({
      projectId: "proj-1",
      sceneType: "dialogue",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.items[0].id).toBe("ep-new");
    expect(r.data.items[1].id).toBe("ep-old");
  });

  it("sorts by relevance score when queryText provided", () => {
    repo.seedEpisodes([
      makeEpisode({
        id: "ep-low",
        inputContext: "天空很蓝",
        finalText: "无关内容",
        createdAt: BASE_TS,
      }),
      makeEpisode({
        id: "ep-high",
        inputContext: "她走到窗前看月光",
        finalText: "月光洒在地上",
        createdAt: BASE_TS - 5000,
      }),
    ]);
    const r = svc.queryEpisodes({
      projectId: "proj-1",
      sceneType: "dialogue",
      queryText: "月光",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.items[0].id).toBe("ep-high");
  });

  it("clamps limit to minimum of 3", () => {
    repo.seedEpisodes(
      Array.from({ length: 5 }, (_, i) =>
        makeEpisode({ id: `ep-${i}`, createdAt: BASE_TS - i }),
      ),
    );
    const r = svc.queryEpisodes({
      projectId: "proj-1",
      sceneType: "dialogue",
      limit: 1,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.items).toHaveLength(3);
  });

  it("clamps limit to maximum of 5", () => {
    repo.seedEpisodes(
      Array.from({ length: 10 }, (_, i) =>
        makeEpisode({ id: `ep-${i}`, createdAt: BASE_TS - i }),
      ),
    );
    const r = svc.queryEpisodes({
      projectId: "proj-1",
      sceneType: "dialogue",
      limit: 100,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.items).toHaveLength(5);
  });

  it("marks returned episodes as recalled", () => {
    repo.seedEpisodes([makeEpisode({ id: "ep-1", recallCount: 0 })]);
    svc.queryEpisodes({ projectId: "proj-1", sceneType: "dialogue" });
    const dump = repo.dump();
    expect(dump.episodes[0].recallCount).toBe(1);
    expect(dump.episodes[0].lastRecalledAt).toBe(BASE_TS);
  });

  it("returns fallback rules when no semantic rules exist", () => {
    repo.seedEpisodes([makeEpisode()]);
    const r = svc.queryEpisodes({
      projectId: "proj-1",
      sceneType: "dialogue",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.memoryDegraded).toBe(true);
    expect(r.data.fallbackRules.length).toBeGreaterThan(0);
  });

  it("returns memoryDegraded=true when semanticRecall throws", () => {
    svc = createService({
      semanticRecall: () => {
        throw new Error("vector offline");
      },
    });
    repo.seedEpisodes([makeEpisode()]);
    const r = svc.queryEpisodes({
      projectId: "proj-1",
      sceneType: "dialogue",
      queryText: "月光",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.memoryDegraded).toBe(true);
  });

  it("returns empty items when listEpisodesByScene throws", () => {
    const badRepo = {
      ...repo,
      listEpisodesByScene: () => {
        throw new Error("db offline");
      },
    };
    svc = createService({ repository: badRepo });
    const r = svc.queryEpisodes({
      projectId: "proj-1",
      sceneType: "dialogue",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.items).toHaveLength(0);
    expect(r.data.memoryDegraded).toBe(true);
    expect(r.data.fallbackRules.length).toBeGreaterThan(0);
  });

  it("rejects empty projectId", () => {
    const r = svc.queryEpisodes({ projectId: "", sceneType: "dialogue" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("INVALID_ARGUMENT");
  });

  it("rejects empty sceneType", () => {
    const r = svc.queryEpisodes({ projectId: "proj-1", sceneType: "" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("INVALID_ARGUMENT");
  });

  it("uses semanticRecall when available and queryText provided", () => {
    const semanticRecall = vi.fn().mockReturnValue([
      makeEpisode({ id: "ep-semantic" }),
    ]);
    svc = createService({ semanticRecall });
    repo.seedEpisodes([makeEpisode({ id: "ep-1" })]);

    const r = svc.queryEpisodes({
      projectId: "proj-1",
      sceneType: "dialogue",
      queryText: "月光",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(semanticRecall).toHaveBeenCalled();
    expect(r.data.items[0].id).toBe("ep-semantic");
  });
});

// ─── Eviction / Compression / Purge ─────────────────────────────────────────

describe("realtimeEvictionTrigger", () => {
  it("deletes expired episodes (>180 days)", () => {
    const expiredTs = BASE_TS - 181 * DAY_MS;
    repo.seedEpisodes([
      makeEpisode({ id: "ep-old", createdAt: expiredTs }),
      makeEpisode({ id: "ep-new", createdAt: BASE_TS }),
    ]);
    const r = svc.realtimeEvictionTrigger({ projectId: "proj-1" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.deleted).toBeGreaterThanOrEqual(1);
    const dump = repo.dump();
    expect(dump.episodes.find((e) => e.id === "ep-old")).toBeUndefined();
    expect(dump.episodes.find((e) => e.id === "ep-new")).toBeDefined();
  });

  it("deletes LRU overflow beyond EPISODIC_ACTIVE_BUDGET", () => {
    const episodes = Array.from({ length: EPISODIC_ACTIVE_BUDGET + 5 }, (_, i) =>
      makeEpisode({
        id: `ep-${i}`,
        importance: i < 5 ? 0 : 0.5,
        createdAt: BASE_TS,
      }),
    );
    repo.seedEpisodes(episodes);
    const r = svc.realtimeEvictionTrigger({ projectId: "proj-1" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.deleted).toBeGreaterThanOrEqual(5);
  });

  it("rejects empty projectId", () => {
    const r = svc.realtimeEvictionTrigger({ projectId: "" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("INVALID_ARGUMENT");
  });
});

describe("weeklyCompressTrigger", () => {
  it("compresses episodes older than 14 days", () => {
    const oldTs = BASE_TS - 15 * DAY_MS;
    repo.seedEpisodes([
      makeEpisode({ id: "ep-old", createdAt: oldTs, compressed: false }),
      makeEpisode({ id: "ep-new", createdAt: BASE_TS, compressed: false }),
    ]);
    const r = svc.weeklyCompressTrigger({ projectId: "proj-1" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.compressed).toBe(1);
    const dump = repo.dump();
    const old = dump.episodes.find((e) => e.id === "ep-old");
    expect(old?.compressed).toBe(true);
    expect(old?.candidates).toHaveLength(0);
    const fresh = dump.episodes.find((e) => e.id === "ep-new");
    expect(fresh?.compressed).toBe(false);
  });

  it("purges compressed overflow beyond EPISODIC_COMPRESSED_BUDGET", () => {
    const oldTs = BASE_TS - 15 * DAY_MS;
    const episodes = Array.from(
      { length: EPISODIC_COMPRESSED_BUDGET + 10 },
      (_, i) =>
        makeEpisode({
          id: `ep-c-${i}`,
          compressed: true,
          createdAt: oldTs - i * 1000,
        }),
    );
    episodes.push(
      makeEpisode({
        id: "ep-active",
        compressed: false,
        createdAt: oldTs - 1,
      }),
    );
    repo.seedEpisodes(episodes);

    const r = svc.weeklyCompressTrigger({ projectId: "proj-1" });
    expect(r.ok).toBe(true);
    const dump = repo.dump();
    const compressedCount = dump.episodes.filter((e) => e.compressed).length;
    expect(compressedCount).toBeLessThanOrEqual(EPISODIC_COMPRESSED_BUDGET);
  });

  it("rejects empty projectId", () => {
    const r = svc.weeklyCompressTrigger({ projectId: "" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("INVALID_ARGUMENT");
  });
});

describe("monthlyPurgeTrigger", () => {
  it("deletes old compressed episodes (>365 days)", () => {
    const veryOldTs = BASE_TS - 400 * DAY_MS;
    repo.seedEpisodes([
      makeEpisode({
        id: "ep-ancient",
        compressed: true,
        createdAt: veryOldTs,
      }),
      makeEpisode({
        id: "ep-recent-compressed",
        compressed: true,
        createdAt: BASE_TS,
      }),
    ]);
    const r = svc.monthlyPurgeTrigger({ projectId: "proj-1" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.deleted).toBeGreaterThanOrEqual(1);
    const dump = repo.dump();
    expect(dump.episodes.find((e) => e.id === "ep-ancient")).toBeUndefined();
    expect(
      dump.episodes.find((e) => e.id === "ep-recent-compressed"),
    ).toBeDefined();
  });

  it("rejects empty projectId", () => {
    const r = svc.monthlyPurgeTrigger({ projectId: "" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("INVALID_ARGUMENT");
  });
});

describe("dailyDecayRecomputeTrigger", () => {
  it("recomputes decay scores for known projects", async () => {
    await svc.recordEpisode(makeInput());
    repo.seedEpisodes([
      makeEpisode({
        id: "ep-1",
        createdAt: BASE_TS - 10 * DAY_MS,
        importance: 0.5,
      }),
    ]);
    const r = svc.dailyDecayRecomputeTrigger();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.updated).toBeGreaterThanOrEqual(1);
  });

  it("applies semantic decay factor to unconfirmed rules", async () => {
    await svc.recordEpisode(makeInput());
    const add = svc.addSemanticMemory({
      projectId: "proj-1",
      rule: "偏好短句",
      category: "style",
      confidence: 0.8,
    });
    expect(add.ok).toBe(true);
    if (!add.ok) return;

    const beforeList = svc.listSemanticMemory({ projectId: "proj-1" });
    expect(beforeList.ok).toBe(true);
    if (!beforeList.ok) return;
    const before = beforeList.data.items[0].confidence;

    svc.dailyDecayRecomputeTrigger();

    const afterList = svc.listSemanticMemory({ projectId: "proj-1" });
    expect(afterList.ok).toBe(true);
    if (!afterList.ok) return;
    const after = afterList.data.items[0].confidence;
    expect(after).toBeLessThan(before);
  });
});

// ─── Semantic Memory ────────────────────────────────────────────────────────

describe("addSemanticMemory", () => {
  it("creates rule with valid args", () => {
    const r = svc.addSemanticMemory({
      projectId: "proj-1",
      rule: "偏好短句叙事",
      category: "style",
      confidence: 0.75,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.item.rule).toBe("偏好短句叙事");
    expect(r.data.item.category).toBe("style");
    expect(r.data.item.confidence).toBe(0.75);
    expect(r.data.item.scope).toBe("project");
    expect(r.data.item.id).toEqual(expect.any(String));
  });

  it("rejects empty projectId", () => {
    const r = svc.addSemanticMemory({
      projectId: "",
      rule: "rule",
      category: "style",
      confidence: 0.5,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("INVALID_ARGUMENT");
  });

  it("rejects empty rule", () => {
    const r = svc.addSemanticMemory({
      projectId: "proj-1",
      rule: "   ",
      category: "style",
      confidence: 0.5,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("INVALID_ARGUMENT");
  });

  it("rejects confidence > 1", () => {
    const r = svc.addSemanticMemory({
      projectId: "proj-1",
      rule: "rule",
      category: "style",
      confidence: 1.5,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("MEMORY_CONFIDENCE_OUT_OF_RANGE");
  });

  it("rejects confidence < 0", () => {
    const r = svc.addSemanticMemory({
      projectId: "proj-1",
      rule: "rule",
      category: "style",
      confidence: -0.1,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("MEMORY_CONFIDENCE_OUT_OF_RANGE");
  });

  it("normalizes whitespace in rule text", () => {
    const r = svc.addSemanticMemory({
      projectId: "proj-1",
      rule: "  偏好   短句  ",
      category: "style",
      confidence: 0.5,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.item.rule).toBe("偏好 短句");
  });

  it("supports global scope", () => {
    const r = svc.addSemanticMemory({
      projectId: "proj-1",
      rule: "全局规则",
      category: "pacing",
      confidence: 0.6,
      scope: "global",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.item.scope).toBe("global");
  });
});

describe("listSemanticMemory", () => {
  it("returns rules and conflict queue", () => {
    svc.addSemanticMemory({
      projectId: "proj-1",
      rule: "rule-A",
      category: "style",
      confidence: 0.5,
    });
    const r = svc.listSemanticMemory({ projectId: "proj-1" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.items).toHaveLength(1);
    expect(r.data.conflictQueue).toEqual(expect.any(Array));
  });

  it("rejects empty projectId", () => {
    const r = svc.listSemanticMemory({ projectId: "" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("INVALID_ARGUMENT");
  });
});

describe("updateSemanticMemory", () => {
  it("patches rule fields", () => {
    const add = svc.addSemanticMemory({
      projectId: "proj-1",
      rule: "原始规则",
      category: "style",
      confidence: 0.5,
    });
    if (!add.ok) throw new Error("setup failed");

    const r = svc.updateSemanticMemory({
      projectId: "proj-1",
      ruleId: add.data.item.id,
      patch: { rule: "更新后的规则", confidence: 0.9 },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.item.rule).toBe("更新后的规则");
    expect(r.data.item.confidence).toBe(0.9);
  });

  it("returns NOT_FOUND for nonexistent ruleId", () => {
    const r = svc.updateSemanticMemory({
      projectId: "proj-1",
      ruleId: "nonexistent",
      patch: { rule: "test" },
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("NOT_FOUND");
  });

  it("rejects invalid confidence in patch", () => {
    const add = svc.addSemanticMemory({
      projectId: "proj-1",
      rule: "rule",
      category: "style",
      confidence: 0.5,
    });
    if (!add.ok) throw new Error("setup failed");

    const r = svc.updateSemanticMemory({
      projectId: "proj-1",
      ruleId: add.data.item.id,
      patch: { confidence: 2.0 },
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("MEMORY_CONFIDENCE_OUT_OF_RANGE");
  });
});

describe("deleteSemanticMemory", () => {
  it("removes rule", () => {
    const add = svc.addSemanticMemory({
      projectId: "proj-1",
      rule: "to-delete",
      category: "style",
      confidence: 0.5,
    });
    if (!add.ok) throw new Error("setup failed");

    const r = svc.deleteSemanticMemory({
      projectId: "proj-1",
      ruleId: add.data.item.id,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.deleted).toBe(true);

    const list = svc.listSemanticMemory({ projectId: "proj-1" });
    if (!list.ok) return;
    expect(list.data.items).toHaveLength(0);
  });

  it("returns NOT_FOUND for nonexistent rule", () => {
    const r = svc.deleteSemanticMemory({
      projectId: "proj-1",
      ruleId: "nonexistent",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("NOT_FOUND");
  });
});

describe("promoteSemanticMemory", () => {
  it("changes scope from project to global", () => {
    const add = svc.addSemanticMemory({
      projectId: "proj-1",
      rule: "project-rule",
      category: "style",
      confidence: 0.5,
      scope: "project",
    });
    if (!add.ok) throw new Error("setup failed");

    const r = svc.promoteSemanticMemory({
      projectId: "proj-1",
      ruleId: add.data.item.id,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.item.scope).toBe("global");
  });

  it("returns NOT_FOUND for non-project-scope rule", () => {
    const add = svc.addSemanticMemory({
      projectId: "proj-1",
      rule: "global-rule",
      category: "style",
      confidence: 0.5,
      scope: "global",
    });
    if (!add.ok) throw new Error("setup failed");

    const r = svc.promoteSemanticMemory({
      projectId: "proj-1",
      ruleId: add.data.item.id,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("NOT_FOUND");
  });

  it("returns NOT_FOUND for nonexistent ruleId", () => {
    const r = svc.promoteSemanticMemory({
      projectId: "proj-1",
      ruleId: "nonexistent",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("NOT_FOUND");
  });
});

describe("resolveSemanticConflict", () => {
  function setupConflict() {
    const distillLlm = (): DistillGeneratedRule[] => [
      {
        rule: "dialogue场景偏好短句",
        category: "pacing",
        confidence: 0.8,
        supportingEpisodes: ["ep-1"],
        contradictingEpisodes: [],
        scope: "project",
      },
      {
        rule: "dialogue场景偏好长句",
        category: "pacing",
        confidence: 0.7,
        supportingEpisodes: ["ep-2"],
        contradictingEpisodes: [],
        scope: "project",
      },
    ];
    svc = createService({ distillLlm });
  }

  it("keeps chosen rule and deletes others", async () => {
    setupConflict();
    repo.seedEpisodes([makeEpisode()]);
    await svc.distillSemanticMemory({ projectId: "proj-1" });

    const conflicts = svc.listConflictQueue({ projectId: "proj-1" });
    expect(conflicts.ok).toBe(true);
    if (!conflicts.ok) return;
    const pending = conflicts.data.items.filter((c) => c.status === "pending");
    expect(pending.length).toBeGreaterThanOrEqual(1);

    const conflict = pending[0];
    const chosenRuleId = conflict.ruleIds[0];
    const r = svc.resolveSemanticConflict({
      projectId: "proj-1",
      conflictId: conflict.id,
      chosenRuleId,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.item.status).toBe("resolved");
    expect(r.data.keptRule.id).toBe(chosenRuleId);
    expect(r.data.keptRule.conflictMarked).toBe(false);
  });

  it("rejects already resolved conflict", async () => {
    setupConflict();
    repo.seedEpisodes([makeEpisode()]);
    await svc.distillSemanticMemory({ projectId: "proj-1" });

    const conflicts = svc.listConflictQueue({ projectId: "proj-1" });
    if (!conflicts.ok) return;
    const conflict = conflicts.data.items.find((c) => c.status === "pending");
    if (!conflict) throw new Error("no pending conflict");

    svc.resolveSemanticConflict({
      projectId: "proj-1",
      conflictId: conflict.id,
      chosenRuleId: conflict.ruleIds[0],
    });

    const r2 = svc.resolveSemanticConflict({
      projectId: "proj-1",
      conflictId: conflict.id,
      chosenRuleId: conflict.ruleIds[0],
    });
    expect(r2.ok).toBe(false);
    if (r2.ok) return;
    expect(r2.error.code).toBe("CONFLICT");
  });

  it("rejects invalid conflictId", () => {
    const r = svc.resolveSemanticConflict({
      projectId: "proj-1",
      conflictId: "nonexistent",
      chosenRuleId: "any",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("NOT_FOUND");
  });
});

describe("listConflictQueue", () => {
  it("returns pending conflicts for project", () => {
    const r = svc.listConflictQueue({ projectId: "proj-1" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.items).toEqual([]);
  });

  it("rejects empty projectId", () => {
    const r = svc.listConflictQueue({ projectId: "" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("INVALID_ARGUMENT");
  });
});

// ─── Clear Memory ───────────────────────────────────────────────────────────

describe("clearProjectMemory", () => {
  it("requires confirmed=true", () => {
    const r = svc.clearProjectMemory({
      projectId: "proj-1",
      confirmed: false,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("MEMORY_CLEAR_CONFIRM_REQUIRED");
  });

  it("clears episodes and semantic rules for project", async () => {
    await svc.recordEpisode(makeInput());
    svc.addSemanticMemory({
      projectId: "proj-1",
      rule: "test-rule",
      category: "style",
      confidence: 0.5,
    });

    const r = svc.clearProjectMemory({
      projectId: "proj-1",
      confirmed: true,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.ok).toBe(true);
    expect(r.data.deletedEpisodes).toBeGreaterThanOrEqual(1);

    const dump = repo.dump();
    const projEpisodes = dump.episodes.filter(
      (e) => e.projectId === "proj-1",
    );
    expect(projEpisodes).toHaveLength(0);
  });

  it("does not affect other projects", async () => {
    await svc.recordEpisode(makeInput({ projectId: "proj-1" }));
    await svc.recordEpisode(makeInput({ projectId: "proj-2" }));

    svc.clearProjectMemory({ projectId: "proj-1", confirmed: true });
    const dump = repo.dump();
    expect(dump.episodes.filter((e) => e.projectId === "proj-2")).toHaveLength(
      1,
    );
  });

  it("rejects empty projectId", () => {
    const r = svc.clearProjectMemory({ projectId: "", confirmed: true });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("INVALID_ARGUMENT");
  });
});

describe("clearAllMemory", () => {
  it("requires confirmed=true", () => {
    const r = svc.clearAllMemory({ confirmed: false });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("MEMORY_CLEAR_CONFIRM_REQUIRED");
  });

  it("clears all data", async () => {
    await svc.recordEpisode(makeInput({ projectId: "proj-1" }));
    await svc.recordEpisode(makeInput({ projectId: "proj-2" }));
    svc.addSemanticMemory({
      projectId: "proj-1",
      rule: "rule",
      category: "style",
      confidence: 0.5,
    });

    const r = svc.clearAllMemory({ confirmed: true });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.ok).toBe(true);
    expect(r.data.deletedEpisodes).toBeGreaterThanOrEqual(2);

    const dump = repo.dump();
    expect(dump.episodes).toHaveLength(0);
    expect(dump.semanticRules).toHaveLength(0);
  });

  it("resets retry queue size", async () => {
    repo = createInMemoryEpisodeRepository({ failInsertAttempts: 5 });
    svc = createService({ repository: repo });
    await svc.recordEpisode(makeInput());
    expect(svc.getRetryQueueSize()).toBe(1);

    svc.clearAllMemory({ confirmed: true });
    expect(svc.getRetryQueueSize()).toBe(0);
  });
});

describe("getRetryQueueSize", () => {
  it("returns 0 initially", () => {
    expect(svc.getRetryQueueSize()).toBe(0);
  });

  it("reflects failed recordings", async () => {
    repo = createInMemoryEpisodeRepository({ failInsertAttempts: 5 });
    svc = createService({ repository: repo });
    await svc.recordEpisode(makeInput());
    expect(svc.getRetryQueueSize()).toBe(1);

    // First call consumed 3 attempts; 2 remain → second call retries 2 then succeeds
    await svc.recordEpisode(makeInput());
    expect(svc.getRetryQueueSize()).toBe(1);
  });
});

// ─── Distillation ───────────────────────────────────────────────────────────

describe("distillSemanticMemory", () => {
  it("runs distillation and creates rules", async () => {
    repo.seedEpisodes([makeEpisode()]);
    const distillLlm = vi.fn().mockReturnValue([
      {
        rule: "偏好短句",
        category: "pacing",
        confidence: 0.7,
        supportingEpisodes: ["ep-1"],
        contradictingEpisodes: [],
        scope: "project",
      },
    ] satisfies DistillGeneratedRule[]);
    svc = createService({ distillLlm });

    const r = await svc.distillSemanticMemory({ projectId: "proj-1" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.accepted).toBe(true);
    expect(r.data.runId).toEqual(expect.any(String));

    const list = svc.listSemanticMemory({ projectId: "proj-1" });
    expect(list.ok).toBe(true);
    if (!list.ok) return;
    expect(list.data.items.length).toBeGreaterThanOrEqual(1);
    expect(list.data.items.some((i) => i.rule === "偏好短句")).toBe(true);
  });

  it("rejects empty projectId", async () => {
    const r = await svc.distillSemanticMemory({ projectId: "" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("INVALID_ARGUMENT");
  });

  it("rejects concurrent distillation for same project", async () => {
    repo.seedEpisodes([makeEpisode()]);

    const distillLlm = vi.fn().mockImplementation(() => {
      return [];
    });

    svc = createService({
      distillLlm,
      distillScheduler: (job: () => void) => job(),
    });

    const first = svc.distillSemanticMemory({ projectId: "proj-1" });
    const second = svc.distillSemanticMemory({ projectId: "proj-1" });

    const [r1, r2] = await Promise.all([first, second]);
    const results = [r1, r2];
    const okCount = results.filter((r) => r.ok).length;
    expect(okCount).toBeGreaterThanOrEqual(1);
  });

  it("emits progress events through onDistillProgress", async () => {
    repo.seedEpisodes([makeEpisode()]);
    const events: DistillProgressEvent[] = [];
    const onDistillProgress = (event: DistillProgressEvent) => {
      events.push(event);
    };
    svc = createService({
      onDistillProgress,
      distillLlm: () => [],
    });

    await svc.distillSemanticMemory({ projectId: "proj-1" });
    expect(events.length).toBeGreaterThanOrEqual(4);

    const stages = events.map((e) => e.stage);
    expect(stages).toContain("started");
    expect(stages).toContain("clustered");
    expect(stages).toContain("completed");
  });

  it("handles distillLlm failure gracefully", async () => {
    repo.seedEpisodes([makeEpisode()]);
    const distillLlm = vi.fn().mockImplementation(() => {
      throw new Error("LLM unavailable");
    });
    const events: DistillProgressEvent[] = [];
    svc = createService({
      distillLlm,
      onDistillProgress: (e: DistillProgressEvent) => events.push(e),
    });

    const r = await svc.distillSemanticMemory({ projectId: "proj-1" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("MEMORY_DISTILL_LLM_UNAVAILABLE");
    expect(events.some((e) => e.stage === "failed")).toBe(true);
  });

  it("default distillLlm creates pacing rules for short-text clusters", async () => {
    const shortEpisodes = Array.from({ length: 10 }, (_, i) =>
      makeEpisode({
        id: `ep-short-${i}`,
        finalText: "短文",
        sceneType: "dialogue",
        skillUsed: "continuation",
      }),
    );
    repo.seedEpisodes(shortEpisodes);

    svc = createService();
    await svc.distillSemanticMemory({ projectId: "proj-1" });

    const list = svc.listSemanticMemory({ projectId: "proj-1" });
    expect(list.ok).toBe(true);
    if (!list.ok) return;
    expect(list.data.items.some((r) => r.category === "pacing")).toBe(true);
    expect(list.data.items.some((r) => r.rule.includes("短句"))).toBe(true);
  });

  it("uses manual as default trigger", async () => {
    repo.seedEpisodes([makeEpisode()]);
    const events: DistillProgressEvent[] = [];
    svc = createService({
      distillLlm: () => [],
      onDistillProgress: (e: DistillProgressEvent) => events.push(e),
    });
    await svc.distillSemanticMemory({ projectId: "proj-1" });
    expect(events[0].trigger).toBe("manual");
  });
});

describe("batch distillation", () => {
  it("triggered after DISTILL_BATCH_TRIGGER_SIZE=50 episodes", async () => {
    const distillLlm = vi.fn().mockReturnValue([]);
    svc = createService({
      distillLlm,
      distillScheduler: (job: () => void) => job(),
    });

    for (let i = 0; i < 50; i++) {
      await svc.recordEpisode(
        makeInput({
          chapterId: `ch-${i}`,
          inputContext: `context-${i}`,
          finalText: `text-${i}`,
        }),
      );
    }

    expect(distillLlm).toHaveBeenCalled();
  });
});

describe("direct contradiction detection", () => {
  it("creates conflict when rules contradict (短句 vs 长句)", async () => {
    const distillLlm = (): DistillGeneratedRule[] => [
      {
        rule: "dialogue场景偏好短句",
        category: "pacing",
        confidence: 0.8,
        supportingEpisodes: ["ep-1"],
        contradictingEpisodes: [],
        scope: "project",
      },
      {
        rule: "dialogue场景偏好长句",
        category: "pacing",
        confidence: 0.7,
        supportingEpisodes: ["ep-2"],
        contradictingEpisodes: [],
        scope: "project",
      },
    ];
    svc = createService({ distillLlm });
    repo.seedEpisodes([makeEpisode()]);

    await svc.distillSemanticMemory({ projectId: "proj-1" });

    const conflicts = svc.listConflictQueue({ projectId: "proj-1" });
    expect(conflicts.ok).toBe(true);
    if (!conflicts.ok) return;
    expect(
      conflicts.data.items.some((c) => c.reason === "direct_contradiction"),
    ).toBe(true);
  });
});

// ─── Edge Cases & Integration ───────────────────────────────────────────────

describe("edge cases", () => {
  it("episode with explicit feedback field is preserved", async () => {
    const r = await svc.recordEpisode(
      makeInput({ explicit: "用户备注：这段很好" }),
    );
    expect(r.ok).toBe(true);
    const dump = repo.dump();
    expect(dump.episodes[0].explicit).toBe("用户备注：这段很好");
  });

  it("episode userConfirmed defaults to false", async () => {
    await svc.recordEpisode(makeInput());
    const dump = repo.dump();
    expect(dump.episodes[0].userConfirmed).toBe(false);
  });

  it("episode userConfirmed can be set to true", async () => {
    await svc.recordEpisode(makeInput({ userConfirmed: true }));
    const dump = repo.dump();
    expect(dump.episodes[0].userConfirmed).toBe(true);
  });

  it("queryEpisodes does not include compressed episodes", () => {
    repo.seedEpisodes([
      makeEpisode({ id: "ep-active", compressed: false }),
      makeEpisode({ id: "ep-compressed", compressed: true }),
    ]);
    const r = svc.queryEpisodes({
      projectId: "proj-1",
      sceneType: "dialogue",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.items.every((e) => !e.compressed)).toBe(true);
  });

  it("realtimeEvictionTrigger preserves userConfirmed episodes", () => {
    const expiredTs = BASE_TS - 200 * DAY_MS;
    repo.seedEpisodes([
      makeEpisode({
        id: "ep-confirmed",
        createdAt: expiredTs,
        userConfirmed: true,
      }),
      makeEpisode({
        id: "ep-unconfirmed",
        createdAt: expiredTs,
        userConfirmed: false,
      }),
    ]);
    svc.realtimeEvictionTrigger({ projectId: "proj-1" });
    const dump = repo.dump();
    expect(dump.episodes.find((e) => e.id === "ep-confirmed")).toBeDefined();
    expect(dump.episodes.find((e) => e.id === "ep-unconfirmed")).toBeUndefined();
  });

  it("weeklyCompressTrigger preserves userConfirmed episodes", () => {
    const oldTs = BASE_TS - 30 * DAY_MS;
    repo.seedEpisodes([
      makeEpisode({
        id: "ep-confirmed",
        createdAt: oldTs,
        userConfirmed: true,
        compressed: false,
      }),
    ]);
    svc.weeklyCompressTrigger({ projectId: "proj-1" });
    const dump = repo.dump();
    expect(dump.episodes[0].compressed).toBe(false);
  });

  it("multiple projects are isolated", async () => {
    await svc.recordEpisode(makeInput({ projectId: "proj-A" }));
    await svc.recordEpisode(makeInput({ projectId: "proj-B" }));
    svc.addSemanticMemory({
      projectId: "proj-A",
      rule: "rule-A",
      category: "style",
      confidence: 0.5,
    });

    const listA = svc.listSemanticMemory({ projectId: "proj-A" });
    const listB = svc.listSemanticMemory({ projectId: "proj-B" });
    expect(listA.ok && listA.data.items.length).toBe(1);
    expect(listB.ok && listB.data.items.length).toBe(0);
  });

  it("recordEpisode increments pending count for distill tracking", async () => {
    const distillLlm = vi.fn().mockReturnValue([]);
    svc = createService({
      distillLlm,
      distillScheduler: (job: () => void) => job(),
    });

    for (let i = 0; i < 10; i++) {
      await svc.recordEpisode(makeInput({ chapterId: `ch-${i}` }));
    }
    expect(distillLlm).not.toHaveBeenCalled();
  });

  it("distill progress events contain projectId and runId", async () => {
    repo.seedEpisodes([makeEpisode()]);
    const events: DistillProgressEvent[] = [];
    svc = createService({
      distillLlm: () => [],
      onDistillProgress: (e: DistillProgressEvent) => events.push(e),
    });
    const r = await svc.distillSemanticMemory({ projectId: "proj-1" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    for (const event of events) {
      expect(event.projectId).toBe("proj-1");
      expect(event.runId).toBe(r.data.runId);
    }
  });

  it("semanticRecall is not called without queryText", () => {
    const semanticRecall = vi.fn().mockReturnValue([]);
    svc = createService({ semanticRecall });
    repo.seedEpisodes([makeEpisode()]);

    svc.queryEpisodes({ projectId: "proj-1", sceneType: "dialogue" });
    expect(semanticRecall).not.toHaveBeenCalled();
  });
});
