/**
 * @module ProjectContextRebinder
 *
 * ## Responsibility
 * Registers project lifecycle participants for context subsystems (KG trie cache,
 * episodic memory cache, and any additional rebindable services) that are not yet
 * wired into ProjectLifecycle. Provides rollback-on-bind-failure semantics.
 *
 * ## What this does NOT do
 * - Does not own any service instances (dependency-injected ports only)
 * - Does not manage the lifecycle mutex or sequencing (ProjectLifecycle handles that)
 * - Does not delete persistent data on switch (only clears in-memory caches)
 *
 * ## Dependency direction
 * Allowed: Logger, ProjectLifecycle (register only), service port interfaces
 * Forbidden: concrete service imports, DB layer, IPC layer
 *
 * ## Key invariants
 * - INV-2:  Concurrent switch safety delegated to ProjectLifecycle mutex
 * - INV-4:  Memory-First — L1 cache cleared on unbind so stale project data never leaks
 * - INV-10: Error handling — partial bind failure triggers rollback to previous project;
 *           individual service errors logged but never propagate to crash the switch
 *
 * ## Performance constraint
 * All port operations must be sub-10ms (cache invalidation / Map.delete).
 * The lifecycle enforces a 5s per-participant timeout as a safety net.
 */

import type { ProjectLifecycle } from "../projects/projectLifecycle";

// ─── Port interfaces (for DI and testability) ──────────────────────

/**
 * Minimal port for KG Aho-Corasick trie cache invalidation.
 *
 * @why Decouples rebinder from the concrete trieCache module.
 * Real adapter: `trieCacheInvalidate(projectId)` from `services/kg/trieCache.ts`.
 */
export interface KgTrieCachePort {
  invalidate(projectId: string): void;
}

/**
 * Minimal port for episodic memory in-memory cache eviction.
 *
 * @why L1 session cache eviction is planned (INV-4). Interface ready for future
 * implementation. Currently episodicMemoryService has no lightweight flush API —
 * only the destructive `clearProjectMemory` which deletes DB data.
 * This port will be connected when a non-destructive evict API is added.
 */
export interface EpisodicMemoryCachePort {
  evictProjectCache(projectId: string): void;
}

/**
 * Generic rebindable service adapter for extensibility.
 * Any project-scoped service that needs lifecycle hooks can implement this.
 */
export interface RebindableService {
  readonly id: string;
  unbind(args: { projectId: string; traceId: string }): void | Promise<void>;
  bind(args: { projectId: string; traceId: string }): void | Promise<void>;
}

// ─── Deps & return type ─────────────────────────────────────────────

export type LoggerPort = {
  info: (event: string, data?: Record<string, unknown>) => void;
  error: (event: string, data?: Record<string, unknown>) => void;
};

export interface ProjectContextRebinderDeps {
  logger: LoggerPort;
  lifecycle: Pick<ProjectLifecycle, "register">;
  kgTrieCache?: KgTrieCachePort;
  episodicMemoryCache?: EpisodicMemoryCachePort;
  /** Extra rebindable services to register alongside KG/memory. */
  additionalServices?: RebindableService[];
}

export interface ProjectContextRebinder {
  /** The lifecycle participant id registered with ProjectLifecycle. */
  readonly participantId: string;
  /** Ids of all managed services (KG, memory, additional). */
  readonly serviceIds: readonly string[];
}

// ─── Service adapter ids ────────────────────────────────────────────

const PARTICIPANT_ID = "context-rebinder";
const KG_SERVICE_ID = "kg-trie-cache";
const MEMORY_SERVICE_ID = "episodic-memory-cache";

// ─── Factory ────────────────────────────────────────────────────────

/**
 * Creates a ProjectContextRebinder that registers a single composite
 * lifecycle participant coordinating all context subsystem rebindings.
 *
 * @why Single composite participant gives us rollback control across services.
 * If any service's bind fails, we attempt to re-bind the previous project
 * for all services (INV-10: error handling, don't lose context).
 *
 * @risk Rollback is best-effort — if rollback itself fails, we log and continue.
 * The alternative (crashing the switch) is worse: user loses access to both projects.
 */
export function createProjectContextRebinder(
  deps: ProjectContextRebinderDeps,
): ProjectContextRebinder {
  // Build the internal service adapter list. KG and memory come first (core
  // context services), followed by any additional services.
  const services: RebindableService[] = [];

  if (deps.kgTrieCache) {
    const kgPort = deps.kgTrieCache;
    services.push({
      id: KG_SERVICE_ID,
      unbind: ({ projectId }) => {
        kgPort.invalidate(projectId);
      },
      // Trie is rebuilt lazily on next entity match query — no explicit bind needed.
      bind: () => {},
    });
  }

  if (deps.episodicMemoryCache) {
    const memoryPort = deps.episodicMemoryCache;
    services.push({
      id: MEMORY_SERVICE_ID,
      unbind: ({ projectId }) => {
        memoryPort.evictProjectCache(projectId);
      },
      // Memory caches are populated lazily on next query — no explicit bind needed.
      bind: () => {},
    });
  }

  if (deps.additionalServices) {
    for (const svc of deps.additionalServices) {
      services.push(svc);
    }
  }

  const serviceIds = services.map((s) => s.id);

  // Track the last successfully bound project for rollback support.
  // When bind fails for a new project, we attempt to re-bind this one.
  let lastBoundProjectId: string | null = null;

  deps.lifecycle.register({
    id: PARTICIPANT_ID,

    unbind: async ({ projectId, traceId, signal }) => {
      if (signal.aborted) {
        return;
      }

      // Record the project being unbound as the last known bound project.
      // This enables rollback if the subsequent bind() fails (INV-10).
      // The lifecycle always calls unbindAll(old) → persist → bindAll(new),
      // so the unbound project is definitionally the "previous" one.
      lastBoundProjectId = projectId;

      deps.logger.info("context_rebinder_unbind_start", {
        projectId,
        traceId,
        serviceCount: services.length,
        serviceIds,
      });

      for (const svc of services) {
        if (signal.aborted) {
          break;
        }
        try {
          await svc.unbind({ projectId, traceId });
        } catch (error) {
          deps.logger.error("context_rebinder_unbind_service_failed", {
            serviceId: svc.id,
            projectId,
            traceId,
            message: error instanceof Error ? error.message : String(error),
          });
          // Continue to next service — unbind failures should not block the switch.
        }
      }
    },

    bind: async ({ projectId, traceId, signal }) => {
      if (signal.aborted) {
        return;
      }

      deps.logger.info("context_rebinder_bind_start", {
        projectId,
        traceId,
        serviceCount: services.length,
        serviceIds,
      });

      const previousProjectId = lastBoundProjectId;
      const successfullyBound: RebindableService[] = [];

      for (const svc of services) {
        if (signal.aborted) {
          break;
        }
        try {
          await svc.bind({ projectId, traceId });
          successfullyBound.push(svc);
        } catch (error) {
          deps.logger.error("context_rebinder_bind_service_failed", {
            serviceId: svc.id,
            projectId,
            traceId,
            message: error instanceof Error ? error.message : String(error),
          });

          // Trigger rollback if we have a previous project to fall back to.
          if (previousProjectId !== null) {
            await rollback({
              successfullyBound,
              failedProjectId: projectId,
              previousProjectId,
              traceId,
            });
          }
          // Don't update lastBoundProjectId — it stays at the previous value
          // (or null if there was no previous project).
          return;
        }
      }

      // Only update tracking if every service was actually bound.
      // When the lifecycle timeout fires mid-loop, signal.aborted becomes true
      // and the break above exits early — we must NOT record a partial bind as
      // the rollback target (INV-10: don't lose context on error).
      if (!signal.aborted && successfullyBound.length === services.length) {
        lastBoundProjectId = projectId;
      }
    },
  });

  /**
   * Best-effort rollback: unbind services that were bound to the failed project,
   * then re-bind all services to the previous project.
   *
   * @why INV-10 requires that errors don't lose context. Re-binding the previous
   * project ensures the user retains a working context even when the switch fails.
   *
   * @risk If rollback itself fails, we log and accept partial state. The alternative
   * (throwing from the lifecycle participant) would cause the lifecycle to log an
   * error for us and continue — the user would end up with no context bound. Our
   * best-effort approach at least attempts recovery.
   */
  async function rollback(args: {
    successfullyBound: RebindableService[];
    failedProjectId: string;
    previousProjectId: string;
    traceId: string;
  }): Promise<void> {
    deps.logger.error("context_rebinder_rollback_triggered", {
      failedProjectId: args.failedProjectId,
      rollbackProjectId: args.previousProjectId,
      traceId: args.traceId,
      boundServiceCount: args.successfullyBound.length,
    });

    // Step 1: Unbind services that were already bound to the failed project.
    // Reverse order for symmetry (last bound → first unbound).
    for (const svc of [...args.successfullyBound].reverse()) {
      try {
        await svc.unbind({
          projectId: args.failedProjectId,
          traceId: args.traceId,
        });
      } catch (error) {
        deps.logger.error("context_rebinder_rollback_unbind_failed", {
          serviceId: svc.id,
          projectId: args.failedProjectId,
          traceId: args.traceId,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Step 2: Re-bind ALL services to the previous project.
    for (const svc of services) {
      try {
        await svc.bind({
          projectId: args.previousProjectId,
          traceId: args.traceId,
        });
      } catch (error) {
        deps.logger.error("context_rebinder_rollback_bind_failed", {
          serviceId: svc.id,
          projectId: args.previousProjectId,
          traceId: args.traceId,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // lastBoundProjectId stays at the previous value (set by the caller
    // not updating it on failure).
  }

  return {
    participantId: PARTICIPANT_ID,
    serviceIds,
  };
}
