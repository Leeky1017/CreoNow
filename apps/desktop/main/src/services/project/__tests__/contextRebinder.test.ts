/**
 * ProjectContextRebinder 测试 — 项目切换上下文重绑定
 * Spec: openspec/specs/project-management/spec.md — BE-SLA-S1
 *
 * Validates: KG trie cache invalidation, memory cache eviction,
 * rollback on partial bind failure, ordering guarantees, optional service tolerance.
 *
 * @invariant INV-2  Concurrent switch safety (via ProjectLifecycle mutex)
 * @invariant INV-4  Memory-First (L1 cache clear on switch)
 * @invariant INV-10 Error handling (rollback on failure, don't lose context)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

import type {
  KgTrieCachePort,
  EpisodicMemoryCachePort,
  RebindableService,
  LoggerPort,
} from "../contextRebinder";
import { createProjectContextRebinder } from "../contextRebinder";
import type {
  ProjectLifecycle,
  ProjectLifecycleParticipant,
} from "../../projects/projectLifecycle";

// ─── mock helpers ───────────────────────────────────────────────────

type SpiedLogger = {
  [K in keyof LoggerPort]: ReturnType<typeof vi.fn<LoggerPort[K]>>;
};

type LifecycleMock = Pick<ProjectLifecycle, "register"> & {
  captured: () => ProjectLifecycleParticipant;
};

function createMockLogger(): SpiedLogger {
  return {
    info: vi.fn<LoggerPort["info"]>(),
    error: vi.fn<LoggerPort["error"]>(),
  };
}

/**
 * Captures the participant registered with lifecycle.register()
 * so we can invoke it directly in tests.
 */
function createCapturingLifecycle(): LifecycleMock {
  let participant: ProjectLifecycleParticipant | null = null;
  return {
    register: (p: ProjectLifecycleParticipant) => {
      participant = p;
    },
    captured: () => {
      if (!participant) {
        throw new Error("No participant registered yet");
      }
      return participant;
    },
  };
}

function createMockSignal(aborted = false): AbortSignal {
  return { aborted } as AbortSignal;
}

// ─── test suite ─────────────────────────────────────────────────────

describe("ProjectContextRebinder", () => {
  let logger: SpiedLogger;
  let lifecycle: LifecycleMock;

  beforeEach(() => {
    logger = createMockLogger();
    lifecycle = createCapturingLifecycle();
  });

  describe("registration", () => {
    it("registers exactly one composite participant with lifecycle", () => {
      const registerSpy = vi.spyOn(lifecycle, "register");
      createProjectContextRebinder({ logger, lifecycle });
      expect(registerSpy).toHaveBeenCalledTimes(1);
    });

    it("participant id is 'context-rebinder'", () => {
      createProjectContextRebinder({ logger, lifecycle });
      expect(lifecycle.captured().id).toBe("context-rebinder");
    });

    it("returns service ids for all provided services", () => {
      const kgTrieCache: KgTrieCachePort = { invalidate: vi.fn() };
      const episodicMemoryCache: EpisodicMemoryCachePort = {
        evictProjectCache: vi.fn(),
      };
      const rebinder = createProjectContextRebinder({
        logger,
        lifecycle,
        kgTrieCache,
        episodicMemoryCache,
      });
      expect(rebinder.serviceIds).toContain("kg-trie-cache");
      expect(rebinder.serviceIds).toContain("episodic-memory-cache");
    });

    it("returns empty serviceIds when no optional services provided", () => {
      const rebinder = createProjectContextRebinder({ logger, lifecycle });
      expect(rebinder.serviceIds).toEqual([]);
    });

    it("includes additional services in serviceIds", () => {
      const custom: RebindableService = {
        id: "custom-svc",
        unbind: vi.fn(),
        bind: vi.fn(),
      };
      const rebinder = createProjectContextRebinder({
        logger,
        lifecycle,
        additionalServices: [custom],
      });
      expect(rebinder.serviceIds).toContain("custom-svc");
    });
  });

  describe("unbind", () => {
    it("calls KG trieCacheInvalidate with projectId on unbind", async () => {
      const kgTrieCache: KgTrieCachePort = { invalidate: vi.fn() };
      createProjectContextRebinder({ logger, lifecycle, kgTrieCache });
      const participant = lifecycle.captured();

      await participant.unbind({
        projectId: "proj-a",
        traceId: "t-1",
        signal: createMockSignal(),
      });

      expect(kgTrieCache.invalidate).toHaveBeenCalledWith("proj-a");
    });

    it("calls episodic memory evictProjectCache with projectId on unbind", async () => {
      const episodicMemoryCache: EpisodicMemoryCachePort = {
        evictProjectCache: vi.fn(),
      };
      createProjectContextRebinder({
        logger,
        lifecycle,
        episodicMemoryCache,
      });
      const participant = lifecycle.captured();

      await participant.unbind({
        projectId: "proj-a",
        traceId: "t-1",
        signal: createMockSignal(),
      });

      expect(episodicMemoryCache.evictProjectCache).toHaveBeenCalledWith(
        "proj-a",
      );
    });

    it("calls unbind on all additional services", async () => {
      const svc1: RebindableService = {
        id: "svc-1",
        unbind: vi.fn(),
        bind: vi.fn(),
      };
      const svc2: RebindableService = {
        id: "svc-2",
        unbind: vi.fn(),
        bind: vi.fn(),
      };
      createProjectContextRebinder({
        logger,
        lifecycle,
        additionalServices: [svc1, svc2],
      });
      const participant = lifecycle.captured();

      await participant.unbind({
        projectId: "proj-a",
        traceId: "t-1",
        signal: createMockSignal(),
      });

      expect(svc1.unbind).toHaveBeenCalledWith({
        projectId: "proj-a",
        traceId: "t-1",
      });
      expect(svc2.unbind).toHaveBeenCalledWith({
        projectId: "proj-a",
        traceId: "t-1",
      });
    });

    it("unbind continues if one service throws", async () => {
      const kgTrieCache: KgTrieCachePort = {
        invalidate: vi.fn(() => {
          throw new Error("KG boom");
        }),
      };
      const episodicMemoryCache: EpisodicMemoryCachePort = {
        evictProjectCache: vi.fn(),
      };
      createProjectContextRebinder({
        logger,
        lifecycle,
        kgTrieCache,
        episodicMemoryCache,
      });
      const participant = lifecycle.captured();

      // Should not throw
      await participant.unbind({
        projectId: "proj-a",
        traceId: "t-1",
        signal: createMockSignal(),
      });

      // Memory still called despite KG failure
      expect(episodicMemoryCache.evictProjectCache).toHaveBeenCalledWith(
        "proj-a",
      );
      // Error logged
      expect(logger.error).toHaveBeenCalledWith(
        "context_rebinder_unbind_service_failed",
        expect.objectContaining({
          serviceId: "kg-trie-cache",
          projectId: "proj-a",
        }),
      );
    });

    it("skips remaining services if signal is aborted", async () => {
      const kgTrieCache: KgTrieCachePort = { invalidate: vi.fn() };
      const episodicMemoryCache: EpisodicMemoryCachePort = {
        evictProjectCache: vi.fn(),
      };
      createProjectContextRebinder({
        logger,
        lifecycle,
        kgTrieCache,
        episodicMemoryCache,
      });
      const participant = lifecycle.captured();

      await participant.unbind({
        projectId: "proj-a",
        traceId: "t-1",
        signal: createMockSignal(true), // already aborted
      });

      expect(kgTrieCache.invalidate).not.toHaveBeenCalled();
      expect(episodicMemoryCache.evictProjectCache).not.toHaveBeenCalled();
    });
  });

  describe("bind", () => {
    it("calls bind on additional services with new projectId", async () => {
      const svc: RebindableService = {
        id: "svc-1",
        unbind: vi.fn(),
        bind: vi.fn(),
      };
      createProjectContextRebinder({
        logger,
        lifecycle,
        additionalServices: [svc],
      });
      const participant = lifecycle.captured();

      await participant.bind({
        projectId: "proj-b",
        traceId: "t-1",
        signal: createMockSignal(),
      });

      expect(svc.bind).toHaveBeenCalledWith({
        projectId: "proj-b",
        traceId: "t-1",
      });
    });

    it("KG and memory bind are no-ops (lazy rebuild)", async () => {
      const kgTrieCache: KgTrieCachePort = { invalidate: vi.fn() };
      const episodicMemoryCache: EpisodicMemoryCachePort = {
        evictProjectCache: vi.fn(),
      };
      createProjectContextRebinder({
        logger,
        lifecycle,
        kgTrieCache,
        episodicMemoryCache,
      });
      const participant = lifecycle.captured();

      // bind should not throw or call any invalidation methods
      await participant.bind({
        projectId: "proj-b",
        traceId: "t-1",
        signal: createMockSignal(),
      });

      // invalidate/evict should NOT be called on bind (only on unbind)
      expect(kgTrieCache.invalidate).not.toHaveBeenCalled();
      expect(episodicMemoryCache.evictProjectCache).not.toHaveBeenCalled();
    });

    it("skips remaining services if signal is aborted", async () => {
      const svc: RebindableService = {
        id: "svc-1",
        unbind: vi.fn(),
        bind: vi.fn(),
      };
      createProjectContextRebinder({
        logger,
        lifecycle,
        additionalServices: [svc],
      });
      const participant = lifecycle.captured();

      await participant.bind({
        projectId: "proj-b",
        traceId: "t-1",
        signal: createMockSignal(true),
      });

      expect(svc.bind).not.toHaveBeenCalled();
    });
  });

  describe("ordering", () => {
    it("unbind and bind call services in registration order", async () => {
      const events: string[] = [];
      const svc1: RebindableService = {
        id: "first",
        unbind: vi.fn(() => {
          events.push("unbind:first");
        }),
        bind: vi.fn(() => {
          events.push("bind:first");
        }),
      };
      const svc2: RebindableService = {
        id: "second",
        unbind: vi.fn(() => {
          events.push("unbind:second");
        }),
        bind: vi.fn(() => {
          events.push("bind:second");
        }),
      };
      createProjectContextRebinder({
        logger,
        lifecycle,
        additionalServices: [svc1, svc2],
      });
      const participant = lifecycle.captured();

      await participant.unbind({
        projectId: "proj-a",
        traceId: "t-1",
        signal: createMockSignal(),
      });
      await participant.bind({
        projectId: "proj-b",
        traceId: "t-1",
        signal: createMockSignal(),
      });

      expect(events).toEqual([
        "unbind:first",
        "unbind:second",
        "bind:first",
        "bind:second",
      ]);
    });

    it("KG and memory unbind before additional services", async () => {
      const events: string[] = [];
      const kgTrieCache: KgTrieCachePort = {
        invalidate: vi.fn(() => {
          events.push("unbind:kg");
        }),
      };
      const episodicMemoryCache: EpisodicMemoryCachePort = {
        evictProjectCache: vi.fn(() => {
          events.push("unbind:memory");
        }),
      };
      const custom: RebindableService = {
        id: "custom",
        unbind: vi.fn(() => {
          events.push("unbind:custom");
        }),
        bind: vi.fn(),
      };
      createProjectContextRebinder({
        logger,
        lifecycle,
        kgTrieCache,
        episodicMemoryCache,
        additionalServices: [custom],
      });
      const participant = lifecycle.captured();

      await participant.unbind({
        projectId: "proj-a",
        traceId: "t-1",
        signal: createMockSignal(),
      });

      expect(events).toEqual([
        "unbind:kg",
        "unbind:memory",
        "unbind:custom",
      ]);
    });
  });

  describe("rollback on bind failure", () => {
    it("re-binds previous project when a service bind fails", async () => {
      const events: string[] = [];
      const svc1: RebindableService = {
        id: "svc-1",
        unbind: vi.fn(({ projectId }) => {
          events.push(`unbind:svc-1:${projectId}`);
        }),
        bind: vi.fn(({ projectId }) => {
          events.push(`bind:svc-1:${projectId}`);
        }),
      };
      const svc2: RebindableService = {
        id: "svc-2",
        unbind: vi.fn(({ projectId }) => {
          events.push(`unbind:svc-2:${projectId}`);
        }),
        bind: vi.fn(({ projectId }) => {
          if (projectId === "proj-b") {
            events.push(`bind:svc-2:${projectId}:FAIL`);
            throw new Error("svc-2 bind failed");
          }
          events.push(`bind:svc-2:${projectId}`);
        }),
      };
      const svc3: RebindableService = {
        id: "svc-3",
        unbind: vi.fn(({ projectId }) => {
          events.push(`unbind:svc-3:${projectId}`);
        }),
        bind: vi.fn(({ projectId }) => {
          events.push(`bind:svc-3:${projectId}`);
        }),
      };

      createProjectContextRebinder({
        logger,
        lifecycle,
        additionalServices: [svc1, svc2, svc3],
      });
      const participant = lifecycle.captured();

      // First: unbind old project
      await participant.unbind({
        projectId: "proj-a",
        traceId: "t-1",
        signal: createMockSignal(),
      });
      events.length = 0; // reset events for clarity

      // Then: bind new project — svc2 will fail
      await participant.bind({
        projectId: "proj-b",
        traceId: "t-1",
        signal: createMockSignal(),
      });

      // Expected sequence:
      // 1. bind svc-1 to proj-b → success
      // 2. bind svc-2 to proj-b → FAIL
      // 3. rollback: unbind svc-1 from proj-b (only svc-1 was bound)
      // 4. rollback: re-bind ALL to proj-a
      expect(events).toEqual([
        "bind:svc-1:proj-b",
        "bind:svc-2:proj-b:FAIL",
        // rollback: unbind successfully-bound services from failed project
        "unbind:svc-1:proj-b",
        // rollback: re-bind all to previous project
        "bind:svc-1:proj-a",
        "bind:svc-2:proj-a",
        "bind:svc-3:proj-a",
      ]);

      // Error logged for the failure
      expect(logger.error).toHaveBeenCalledWith(
        "context_rebinder_bind_service_failed",
        expect.objectContaining({
          serviceId: "svc-2",
          projectId: "proj-b",
        }),
      );
      // Rollback logged
      expect(logger.error).toHaveBeenCalledWith(
        "context_rebinder_rollback_triggered",
        expect.objectContaining({
          failedProjectId: "proj-b",
          rollbackProjectId: "proj-a",
        }),
      );
    });

    it("rollback does not throw even if rollback bind fails", async () => {
      const svc1: RebindableService = {
        id: "svc-1",
        unbind: vi.fn(),
        bind: vi.fn(({ projectId }) => {
          if (projectId === "proj-b") {
            throw new Error("bind to new project failed");
          }
          if (projectId === "proj-a") {
            // rollback bind also fails
            throw new Error("rollback bind failed too");
          }
        }),
      };

      createProjectContextRebinder({
        logger,
        lifecycle,
        additionalServices: [svc1],
      });
      const participant = lifecycle.captured();

      // Establish previous project
      await participant.unbind({
        projectId: "proj-a",
        traceId: "t-1",
        signal: createMockSignal(),
      });

      // Should not throw despite double failure
      await participant.bind({
        projectId: "proj-b",
        traceId: "t-1",
        signal: createMockSignal(),
      });

      // Rollback failure logged
      expect(logger.error).toHaveBeenCalledWith(
        "context_rebinder_rollback_bind_failed",
        expect.objectContaining({ serviceId: "svc-1" }),
      );
    });

    it("no rollback when there is no previous project", async () => {
      const events: string[] = [];
      const svc: RebindableService = {
        id: "svc-1",
        unbind: vi.fn(({ projectId }) => {
          events.push(`unbind:${projectId}`);
        }),
        bind: vi.fn(({ projectId }) => {
          events.push(`bind:${projectId}:FAIL`);
          throw new Error("bind failed");
        }),
      };

      createProjectContextRebinder({
        logger,
        lifecycle,
        additionalServices: [svc],
      });
      const participant = lifecycle.captured();

      // No prior unbind → no previous project to rollback to
      await participant.bind({
        projectId: "proj-b",
        traceId: "t-1",
        signal: createMockSignal(),
      });

      expect(events).toEqual(["bind:proj-b:FAIL"]);
      // Error logged but no rollback
      expect(logger.error).toHaveBeenCalledWith(
        "context_rebinder_bind_service_failed",
        expect.objectContaining({ serviceId: "svc-1" }),
      );
      expect(logger.error).not.toHaveBeenCalledWith(
        "context_rebinder_rollback_triggered",
        expect.anything(),
      );
    });
  });

  describe("missing / optional services", () => {
    it("works with no optional services at all", async () => {
      createProjectContextRebinder({ logger, lifecycle });
      const participant = lifecycle.captured();

      // Should not throw
      await participant.unbind({
        projectId: "proj-a",
        traceId: "t-1",
        signal: createMockSignal(),
      });
      await participant.bind({
        projectId: "proj-b",
        traceId: "t-1",
        signal: createMockSignal(),
      });

      expect(logger.error).not.toHaveBeenCalled();
    });

    it("works with only KG but no memory", async () => {
      const kgTrieCache: KgTrieCachePort = { invalidate: vi.fn() };
      createProjectContextRebinder({ logger, lifecycle, kgTrieCache });
      const participant = lifecycle.captured();

      await participant.unbind({
        projectId: "proj-a",
        traceId: "t-1",
        signal: createMockSignal(),
      });

      expect(kgTrieCache.invalidate).toHaveBeenCalledWith("proj-a");
    });

    it("works with only memory but no KG", async () => {
      const episodicMemoryCache: EpisodicMemoryCachePort = {
        evictProjectCache: vi.fn(),
      };
      createProjectContextRebinder({
        logger,
        lifecycle,
        episodicMemoryCache,
      });
      const participant = lifecycle.captured();

      await participant.unbind({
        projectId: "proj-a",
        traceId: "t-1",
        signal: createMockSignal(),
      });

      expect(episodicMemoryCache.evictProjectCache).toHaveBeenCalledWith(
        "proj-a",
      );
    });
  });

  describe("async service support", () => {
    it("awaits async unbind services", async () => {
      const events: string[] = [];
      const svc: RebindableService = {
        id: "async-svc",
        unbind: vi.fn(
          async () =>
            new Promise<void>((resolve) => {
              // Simulate async work
              setTimeout(() => {
                events.push("async-unbind-done");
                resolve();
              }, 0);
            }),
        ),
        bind: vi.fn(),
      };
      createProjectContextRebinder({
        logger,
        lifecycle,
        additionalServices: [svc],
      });
      const participant = lifecycle.captured();

      await participant.unbind({
        projectId: "proj-a",
        traceId: "t-1",
        signal: createMockSignal(),
      });

      expect(events).toEqual(["async-unbind-done"]);
    });

    it("awaits async bind services", async () => {
      const events: string[] = [];
      const svc: RebindableService = {
        id: "async-svc",
        unbind: vi.fn(),
        bind: vi.fn(
          async () =>
            new Promise<void>((resolve) => {
              setTimeout(() => {
                events.push("async-bind-done");
                resolve();
              }, 0);
            }),
        ),
      };
      createProjectContextRebinder({
        logger,
        lifecycle,
        additionalServices: [svc],
      });
      const participant = lifecycle.captured();

      await participant.bind({
        projectId: "proj-b",
        traceId: "t-1",
        signal: createMockSignal(),
      });

      expect(events).toEqual(["async-bind-done"]);
    });
  });

  describe("lastBoundProjectId tracking", () => {
    it("tracks project through unbind → bind cycle for rollback", async () => {
      const events: string[] = [];
      const goodSvc: RebindableService = {
        id: "good",
        unbind: vi.fn(({ projectId }) => {
          events.push(`unbind:good:${projectId}`);
        }),
        bind: vi.fn(({ projectId }) => {
          events.push(`bind:good:${projectId}`);
        }),
      };
      const badSvc: RebindableService = {
        id: "bad",
        unbind: vi.fn(({ projectId }) => {
          events.push(`unbind:bad:${projectId}`);
        }),
        bind: vi.fn(({ projectId }) => {
          if (projectId === "proj-c") {
            throw new Error("fail on proj-c");
          }
          events.push(`bind:bad:${projectId}`);
        }),
      };

      createProjectContextRebinder({
        logger,
        lifecycle,
        additionalServices: [goodSvc, badSvc],
      });
      const participant = lifecycle.captured();

      // First switch: A → B (succeeds)
      await participant.unbind({
        projectId: "proj-a",
        traceId: "t-1",
        signal: createMockSignal(),
      });
      await participant.bind({
        projectId: "proj-b",
        traceId: "t-1",
        signal: createMockSignal(),
      });
      events.length = 0;

      // Second switch: B → C (badSvc fails on bind)
      await participant.unbind({
        projectId: "proj-b",
        traceId: "t-2",
        signal: createMockSignal(),
      });
      events.length = 0;
      await participant.bind({
        projectId: "proj-c",
        traceId: "t-2",
        signal: createMockSignal(),
      });

      // Rollback should go back to proj-b (the last successfully bound project)
      expect(events).toContain("bind:good:proj-b");
      expect(events).toContain("bind:bad:proj-b");
    });
  });

  describe("info logging", () => {
    it("logs bind and unbind start events", async () => {
      const kgTrieCache: KgTrieCachePort = { invalidate: vi.fn() };
      createProjectContextRebinder({ logger, lifecycle, kgTrieCache });
      const participant = lifecycle.captured();

      await participant.unbind({
        projectId: "proj-a",
        traceId: "t-1",
        signal: createMockSignal(),
      });

      expect(logger.info).toHaveBeenCalledWith(
        "context_rebinder_unbind_start",
        expect.objectContaining({
          projectId: "proj-a",
          serviceCount: 1,
        }),
      );

      await participant.bind({
        projectId: "proj-b",
        traceId: "t-1",
        signal: createMockSignal(),
      });

      expect(logger.info).toHaveBeenCalledWith(
        "context_rebinder_bind_start",
        expect.objectContaining({
          projectId: "proj-b",
          serviceCount: 1,
        }),
      );
    });
  });
});
