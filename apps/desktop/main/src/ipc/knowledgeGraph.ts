import type { IpcMain, IpcMainInvokeEvent } from "electron";
import type Database from "better-sqlite3";

import type { IpcResponse } from "@shared/types/ipc-generated";
import {
  createKgWriteOrchestrator,
  type KgWriteOperation,
  type KgWriteOrchestrator,
} from "../core/kgWriteOrchestrator";
import type { Logger } from "../logging/logger";
import {
  type AiContextLevel,
  createKnowledgeGraphService,
  type KnowledgeEntity,
  type KnowledgeQueryByIdsResult,
  type KnowledgeEntityType,
  type KnowledgePathResult,
  type KnowledgeRelevantQueryResult,
  type KnowledgeRelation,
  type KgRulesInjectionData,
  type KnowledgeSubgraphResult,
  type KnowledgeValidateResult,
} from "../services/kg/kgService";
import {
  createKgRecognitionRuntime,
  type KgRecognitionRuntime,
  type RecognitionEnqueueResult,
  type RecognitionStatsResult,
} from "../services/kg/kgRecognitionRuntime";
import {
  createKgMutationSkill,
  type KgMutationSkill,
} from "../services/skills/kgMutationSkill";
import { createMilestoneService } from "../services/engagement/milestoneService";
import { createWorldScaleService } from "../services/engagement/worldScaleService";
import { guardAndNormalizeProjectAccess } from "./projectAccessGuard";
import type { ProjectSessionBindingRegistry } from "./projectSessionBinding";

type EntityCreatePayload = {
  projectId: string;
  type: KnowledgeEntityType;
  name: string;
  description?: string;
  attributes?: Record<string, string>;
  lastSeenState?: string;
  aiContextLevel?: AiContextLevel;
  aliases?: string[];
};

type EntityReadPayload = {
  projectId: string;
  id: string;
};

type EntityListPayload = {
  projectId: string;
  filter?: {
    aiContextLevel?: AiContextLevel;
  };
  limit?: number;
  offset?: number;
};

type EntityUpdatePayload = {
  projectId: string;
  id: string;
  expectedVersion: number;
  patch: {
    type?: KnowledgeEntityType;
    name?: string;
    description?: string;
    attributes?: Record<string, string>;
    lastSeenState?: string;
    aiContextLevel?: AiContextLevel;
    aliases?: string[];
  };
};

type EntityDeletePayload = {
  projectId: string;
  id: string;
};

type RelationCreatePayload = {
  projectId: string;
  sourceEntityId: string;
  targetEntityId: string;
  relationType: string;
  description?: string;
};

type RelationListPayload = {
  projectId: string;
  limit?: number;
  offset?: number;
};

type RelationUpdatePayload = {
  projectId: string;
  id: string;
  patch: {
    sourceEntityId?: string;
    targetEntityId?: string;
    relationType?: string;
    description?: string;
  };
};

type RelationDeletePayload = {
  projectId: string;
  id: string;
};

type QuerySubgraphPayload = {
  projectId: string;
  centerEntityId: string;
  k: number;
};

type QueryPathPayload = {
  projectId: string;
  sourceEntityId: string;
  targetEntityId: string;
  timeoutMs?: number;
};

type QueryValidatePayload = {
  projectId: string;
};

type RecognitionEnqueuePayload = {
  projectId: string;
  documentId: string;
  sessionId: string;
  contentText: string;
  traceId: string;
};

type RecognitionCancelPayload = {
  projectId: string;
  sessionId: string;
  taskId: string;
};

type RecognitionStatsPayload = {
  projectId: string;
  sessionId: string;
};

type SuggestionAcceptPayload = {
  projectId: string;
  sessionId: string;
  suggestionId: string;
};

type SuggestionDismissPayload = {
  projectId: string;
  sessionId: string;
  suggestionId: string;
};

type QueryRelevantPayload = {
  projectId: string;
  excerpt: string;
  maxEntities?: number;
  entityIds?: string[];
};

type QueryByIdsPayload = {
  projectId: string;
  entityIds: string[];
};

function normalizeQueryByIdsPayload(
  payload: unknown,
): { ok: true; payload: QueryByIdsPayload } | { ok: false; message: string } {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, message: "payload must be an object" };
  }

  const candidate = payload as {
    projectId?: unknown;
    entityIds?: unknown;
  };

  if (
    typeof candidate.projectId !== "string" ||
    candidate.projectId.length === 0
  ) {
    return { ok: false, message: "projectId is required" };
  }

  if (!Array.isArray(candidate.entityIds)) {
    return { ok: false, message: "entityIds must be an array" };
  }

  if (candidate.entityIds.some((id) => typeof id !== "string")) {
    return { ok: false, message: "entityIds must contain only strings" };
  }

  return {
    ok: true,
    payload: {
      projectId: candidate.projectId,
      entityIds: candidate.entityIds,
    },
  };
}

type RulesInjectPayload = {
  projectId: string;
  documentId: string;
  excerpt: string;
  traceId: string;
  maxEntities?: number;
  entityIds?: string[];
};

function notReady<T>(): IpcResponse<T> {
  return {
    ok: false,
    error: { code: "DB_ERROR", message: "Database not ready" },
  };
}

type KgHandlerRegistrar = <TPayload, TResponse, TEvent = unknown>(
  channel: string,
  listener: (
    event: TEvent,
    payload: TPayload,
  ) => Promise<IpcResponse<TResponse>>,
) => void;

type EngagementMilestoneTrigger = (args: {
  projectId: string;
  source: string;
}) => void;

/**
 * Register `knowledge:*` IPC handlers (Knowledge Graph).
 *
 * @invariant INV-6/INV-7 — KG **write** operations (entity/relation create,
 * update, delete) are routed through `kgWriteOrchestrator.execute()` into
 * `builtin:kg-mutate` Skill. Read-only queries call KG Service directly
 * (no side effects, no Permission Gate needed).
 *
 * Why: KG is persisted in SQLite and exposed through a stable cross-process
 * contract with explicit request/response envelopes.
 */
export function registerKnowledgeGraphIpcHandlers(deps: {
  ipcMain: IpcMain;
  db: Database.Database | null;
  logger: Logger;
  recognitionRuntime?: KgRecognitionRuntime | null;
  projectSessionBinding?: ProjectSessionBindingRegistry;
  /** Override for testing — inject a pre-built KgWriteOrchestrator */
  kgWriteOrchestrator?: KgWriteOrchestrator | null;
  /** Override for testing — inject a pre-built KgMutationSkill */
  kgMutationSkill?: KgMutationSkill | null;
}): void {
  const recognitionRuntime: KgRecognitionRuntime | null = deps.db
    ? (deps.recognitionRuntime ??
      createKgRecognitionRuntime({
        db: deps.db,
        logger: deps.logger,
      }))
    : null;

  function createService() {
    if (!deps.db) {
      return null;
    }

    return createKnowledgeGraphService({
      db: deps.db,
      logger: deps.logger,
    });
  }

  // INV-6: create the mutation skill that wraps all KG writes
  function createMutationSkill(): KgMutationSkill | null {
    if (deps.kgMutationSkill !== undefined) {
      return deps.kgMutationSkill;
    }
    const service = createService();
    if (!service) return null;
    return createKgMutationSkill({ kgService: service });
  }

  // INV-6/INV-7: all KG write IPC entries route through orchestrator.execute
  // instead of invoking KgMutationSkill directly from handlers.
  function createWriteOrchestrator(): KgWriteOrchestrator | null {
    if (deps.kgWriteOrchestrator !== undefined) {
      return deps.kgWriteOrchestrator;
    }

    const mutationSkill = createMutationSkill();
    if (!mutationSkill) {
      return null;
    }

    return createKgWriteOrchestrator({ kgMutationSkill: mutationSkill });
  }

  function handleWithProjectAccess<TPayload, TResponse, TEvent = unknown>(
    channel: string,
    listener: (
      event: TEvent,
      payload: TPayload,
    ) => Promise<IpcResponse<TResponse>>,
  ): void {
    deps.ipcMain.handle(channel, async (event, payload) => {
      const guarded = guardAndNormalizeProjectAccess({
        event,
        payload,
        projectSessionBinding: deps.projectSessionBinding,
      });
      if (!guarded.ok) {
        return guarded.response as IpcResponse<TResponse>;
      }
      return listener(event as TEvent, payload as TPayload);
    });
  }

  let cachedMilestoneServices:
    | {
        worldScaleService: ReturnType<typeof createWorldScaleService>;
        milestoneService: ReturnType<typeof createMilestoneService>;
      }
    | null
    | undefined;

  function triggerEngagementMilestone(args: {
    projectId: string;
    source: string;
  }): void {
    const normalizedProjectId = args.projectId.trim();
    if (!normalizedProjectId) {
      return;
    }
    if (cachedMilestoneServices === undefined) {
      if (
        deps.db &&
        typeof (deps.db as { prepare?: unknown }).prepare === "function"
      ) {
        try {
          cachedMilestoneServices = {
            worldScaleService: createWorldScaleService({ db: deps.db }),
            milestoneService: createMilestoneService({ db: deps.db }),
          };
        } catch (error) {
          cachedMilestoneServices = null;
          deps.logger.info("engagement_milestone_trigger_unavailable", {
            message: error instanceof Error ? error.message : String(error),
          });
        }
      } else {
        cachedMilestoneServices = null;
      }
    }

    if (!cachedMilestoneServices) {
      return;
    }

    try {
      cachedMilestoneServices.worldScaleService.invalidateCache(normalizedProjectId);
      const current =
        cachedMilestoneServices.worldScaleService.getWorldScale(
          normalizedProjectId,
        );
      const events =
        cachedMilestoneServices.milestoneService.evaluateFromCurrentScale({
          projectId: normalizedProjectId,
          current,
        });
      if (events.length > 0) {
        deps.logger.info("engagement_milestone_recorded", {
          projectId: normalizedProjectId,
          count: events.length,
          source: args.source,
        });
      }
    } catch (error) {
      deps.logger.error("engagement_milestone_writeback_failed", {
        projectId: normalizedProjectId,
        source: args.source,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  registerKgEntityHandlers(
    deps,
    handleWithProjectAccess,
    createService,
    createWriteOrchestrator,
    triggerEngagementMilestone,
  );
  registerKgRelationHandlers(
    deps,
    handleWithProjectAccess,
    createService,
    createWriteOrchestrator,
    triggerEngagementMilestone,
  );

  handleWithProjectAccess(
    "knowledge:query:subgraph",
    async (
      _event,
      payload: QuerySubgraphPayload,
    ): Promise<IpcResponse<KnowledgeSubgraphResult>> => {
      if (!deps.db) {
        return notReady<KnowledgeSubgraphResult>();
      }

      const service = createService();
      if (!service) {
        return notReady<KnowledgeSubgraphResult>();
      }
      const res = service.querySubgraph(payload);
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  handleWithProjectAccess(
    "knowledge:query:path",
    async (
      _event,
      payload: QueryPathPayload,
    ): Promise<IpcResponse<KnowledgePathResult>> => {
      if (!deps.db) {
        return notReady<KnowledgePathResult>();
      }

      const service = createService();
      if (!service) {
        return notReady<KnowledgePathResult>();
      }
      const res = service.queryPath(payload);
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  handleWithProjectAccess(
    "knowledge:query:validate",
    async (
      _event,
      payload: QueryValidatePayload,
    ): Promise<IpcResponse<KnowledgeValidateResult>> => {
      if (!deps.db) {
        return notReady<KnowledgeValidateResult>();
      }

      const service = createService();
      if (!service) {
        return notReady<KnowledgeValidateResult>();
      }
      const res = service.queryValidate(payload);
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  handleWithProjectAccess(
    "knowledge:recognition:enqueue",
    async (
      event: IpcMainInvokeEvent,
      payload: RecognitionEnqueuePayload,
    ): Promise<IpcResponse<RecognitionEnqueueResult>> => {
      if (!recognitionRuntime) {
        return notReady<RecognitionEnqueueResult>();
      }

      const res = recognitionRuntime.enqueue({
        ...payload,
        sender: event.sender,
      });
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  handleWithProjectAccess(
    "knowledge:recognition:cancel",
    async (
      _event,
      payload: RecognitionCancelPayload,
    ): Promise<IpcResponse<{ canceled: true }>> => {
      if (!recognitionRuntime) {
        return notReady<{ canceled: true }>();
      }

      const res = recognitionRuntime.cancel(payload);
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  handleWithProjectAccess(
    "knowledge:recognition:stats",
    async (
      _event,
      payload: RecognitionStatsPayload,
    ): Promise<IpcResponse<RecognitionStatsResult>> => {
      if (!recognitionRuntime) {
        return notReady<RecognitionStatsResult>();
      }

      const res = recognitionRuntime.stats(payload);
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  handleWithProjectAccess(
    "knowledge:suggestion:accept",
    async (
      _event,
      payload: SuggestionAcceptPayload,
    ): Promise<IpcResponse<KnowledgeEntity>> => {
      if (!recognitionRuntime) {
        return notReady<KnowledgeEntity>();
      }

      const res = recognitionRuntime.acceptSuggestion(payload);
      if (!res.ok) {
        return { ok: false, error: res.error };
      }
      triggerEngagementMilestone({
        projectId: payload.projectId,
        source: "knowledge:suggestion:accept",
      });
      return { ok: true, data: res.data };
    },
  );

  handleWithProjectAccess(
    "knowledge:suggestion:dismiss",
    async (
      _event,
      payload: SuggestionDismissPayload,
    ): Promise<IpcResponse<{ dismissed: true }>> => {
      if (!recognitionRuntime) {
        return notReady<{ dismissed: true }>();
      }

      const res = recognitionRuntime.dismissSuggestion(payload);
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  handleWithProjectAccess(
    "knowledge:query:relevant",
    async (
      _event,
      payload: QueryRelevantPayload,
    ): Promise<IpcResponse<KnowledgeRelevantQueryResult>> => {
      const service = createService();
      if (!service) {
        return notReady<KnowledgeRelevantQueryResult>();
      }

      const res = service.queryRelevant(payload);
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  handleWithProjectAccess(
    "knowledge:query:byids",
    async (
      _event,
      payload: QueryByIdsPayload,
    ): Promise<IpcResponse<KnowledgeQueryByIdsResult>> => {
      const normalized = normalizeQueryByIdsPayload(payload);
      if (!normalized.ok) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: normalized.message },
        };
      }

      const service = createService();
      if (!service) {
        return notReady<KnowledgeQueryByIdsResult>();
      }

      const res = service.queryByIds(normalized.payload);
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  handleWithProjectAccess(
    "knowledge:rules:inject",
    async (
      _event,
      payload: RulesInjectPayload,
    ): Promise<IpcResponse<KgRulesInjectionData>> => {
      const service = createService();
      if (!service) {
        return notReady<KgRulesInjectionData>();
      }

      const res = service.buildRulesInjection(payload);
      if (res.ok) {
        return { ok: true, data: res.data };
      }

      return {
        ok: false,
        error: {
          ...res.error,
          traceId: payload.traceId,
        },
      };
    },
  );
}

function registerKgEntityHandlers(
  deps: { db: Database.Database | null },
  handleWithProjectAccess: KgHandlerRegistrar,
  createService: () => ReturnType<typeof createKnowledgeGraphService> | null,
  createWriteOrchestrator: () => KgWriteOrchestrator | null,
  triggerEngagementMilestone: EngagementMilestoneTrigger,
): void {
  async function executeWrite<TPayload extends { projectId: string }, TResponse>(
    operation: KgWriteOperation,
    payload: TPayload,
  ): Promise<IpcResponse<TResponse>> {
    const orchestrator = createWriteOrchestrator();
    if (!orchestrator) {
      return notReady<TResponse>();
    }

    const result = orchestrator.execute<TResponse, TPayload>({
      skill: "kg.write",
      input: {
        operation,
        projectId: payload.projectId,
        payload,
      },
    });

    if (result.ok) {
      triggerEngagementMilestone({
        projectId: payload.projectId,
        source: `knowledge:${operation}`,
      });
    }

    return result.ok
      ? { ok: true, data: result.data }
      : { ok: false, error: result.error };
  }

  // ── Write operations → routed through builtin:kg-mutate (INV-6) ──

  handleWithProjectAccess(
    "knowledge:entity:create",
    async (
      _event,
      payload: EntityCreatePayload,
    ): Promise<IpcResponse<KnowledgeEntity>> => {
      if (!deps.db) {
        return notReady<KnowledgeEntity>();
      }

      return executeWrite<EntityCreatePayload, KnowledgeEntity>(
        "entity:create",
        payload,
      );
    },
  );

  // ── Read operations → direct service call (read-only, INV-6 exempt) ──

  handleWithProjectAccess(
    "knowledge:entity:read",
    async (
      _event,
      payload: EntityReadPayload,
    ): Promise<IpcResponse<KnowledgeEntity>> => {
      if (!deps.db) {
        return notReady<KnowledgeEntity>();
      }

      const service = createService();
      if (!service) {
        return notReady<KnowledgeEntity>();
      }
      const res = service.entityRead(payload);
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  handleWithProjectAccess(
    "knowledge:entity:list",
    async (
      _event,
      payload: EntityListPayload,
    ): Promise<
      IpcResponse<{ items: KnowledgeEntity[]; totalCount: number }>
    > => {
      if (!deps.db) {
        return notReady<{ items: KnowledgeEntity[]; totalCount: number }>();
      }

      const service = createService();
      if (!service) {
        return notReady<{ items: KnowledgeEntity[]; totalCount: number }>();
      }
      const res = service.entityList(payload);
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  // ── Write operations → routed through builtin:kg-mutate (INV-6) ──

  handleWithProjectAccess(
    "knowledge:entity:update",
    async (
      _event,
      payload: EntityUpdatePayload,
    ): Promise<IpcResponse<KnowledgeEntity>> => {
      if (!deps.db) {
        return notReady<KnowledgeEntity>();
      }

      return executeWrite<EntityUpdatePayload, KnowledgeEntity>(
        "entity:update",
        payload,
      );
    },
  );

  handleWithProjectAccess(
    "knowledge:entity:delete",
    async (
      _event,
      payload: EntityDeletePayload,
    ): Promise<
      IpcResponse<{ deleted: true; deletedRelationCount: number }>
    > => {
      if (!deps.db) {
        return notReady<{ deleted: true; deletedRelationCount: number }>();
      }

      return executeWrite<
        EntityDeletePayload,
        { deleted: true; deletedRelationCount: number }
      >("entity:delete", payload);
    },
  );
}

function registerKgRelationHandlers(
  deps: { db: Database.Database | null },
  handleWithProjectAccess: KgHandlerRegistrar,
  createService: () => ReturnType<typeof createKnowledgeGraphService> | null,
  createWriteOrchestrator: () => KgWriteOrchestrator | null,
  triggerEngagementMilestone: EngagementMilestoneTrigger,
): void {
  async function executeWrite<TPayload extends { projectId: string }, TResponse>(
    operation: KgWriteOperation,
    payload: TPayload,
  ): Promise<IpcResponse<TResponse>> {
    const orchestrator = createWriteOrchestrator();
    if (!orchestrator) {
      return notReady<TResponse>();
    }

    const result = orchestrator.execute<TResponse, TPayload>({
      skill: "kg.write",
      input: {
        operation,
        projectId: payload.projectId,
        payload,
      },
    });

    if (result.ok) {
      triggerEngagementMilestone({
        projectId: payload.projectId,
        source: `knowledge:${operation}`,
      });
    }

    return result.ok
      ? { ok: true, data: result.data }
      : { ok: false, error: result.error };
  }

  // ── Write operations → routed through builtin:kg-mutate (INV-6) ──

  handleWithProjectAccess(
    "knowledge:relation:create",
    async (
      _event,
      payload: RelationCreatePayload,
    ): Promise<IpcResponse<KnowledgeRelation>> => {
      if (!deps.db) {
        return notReady<KnowledgeRelation>();
      }

      return executeWrite<RelationCreatePayload, KnowledgeRelation>(
        "relation:create",
        payload,
      );
    },
  );

  // ── Read operation → direct service call (INV-6 exempt) ──

  handleWithProjectAccess(
    "knowledge:relation:list",
    async (
      _event,
      payload: RelationListPayload,
    ): Promise<
      IpcResponse<{ items: KnowledgeRelation[]; totalCount: number }>
    > => {
      if (!deps.db) {
        return notReady<{ items: KnowledgeRelation[]; totalCount: number }>();
      }

      const service = createService();
      if (!service) {
        return notReady<{ items: KnowledgeRelation[]; totalCount: number }>();
      }
      const res = service.relationList(payload);
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  // ── Write operations → routed through builtin:kg-mutate (INV-6) ──

  handleWithProjectAccess(
    "knowledge:relation:update",
    async (
      _event,
      payload: RelationUpdatePayload,
    ): Promise<IpcResponse<KnowledgeRelation>> => {
      if (!deps.db) {
        return notReady<KnowledgeRelation>();
      }

      return executeWrite<RelationUpdatePayload, KnowledgeRelation>(
        "relation:update",
        payload,
      );
    },
  );

  handleWithProjectAccess(
    "knowledge:relation:delete",
    async (
      _event,
      payload: RelationDeletePayload,
    ): Promise<IpcResponse<{ deleted: true }>> => {
      if (!deps.db) {
        return notReady<{ deleted: true }>();
      }

      return executeWrite<RelationDeletePayload, { deleted: true }>(
        "relation:delete",
        payload,
      );
    },
  );
}
