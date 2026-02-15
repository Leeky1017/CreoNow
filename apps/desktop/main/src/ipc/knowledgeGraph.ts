import type { IpcMain, IpcMainInvokeEvent } from "electron";
import type Database from "better-sqlite3";

import type { IpcResponse } from "@shared/types/ipc-generated";
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

type RulesInjectPayload = {
  projectId: string;
  documentId: string;
  excerpt: string;
  traceId: string;
  maxEntities?: number;
  entityIds?: string[];
};

/**
 * Register `knowledge:*` IPC handlers (Knowledge Graph).
 *
 * Why: KG is persisted in SQLite and exposed through a stable cross-process
 * contract with explicit request/response envelopes.
 */
export function registerKnowledgeGraphIpcHandlers(deps: {
  ipcMain: IpcMain;
  db: Database.Database | null;
  logger: Logger;
  recognitionRuntime?: KgRecognitionRuntime | null;
}): void {
  function notReady<T>(): IpcResponse<T> {
    return {
      ok: false,
      error: { code: "DB_ERROR", message: "Database not ready" },
    };
  }

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

  deps.ipcMain.handle(
    "knowledge:entity:create",
    async (
      _event,
      payload: EntityCreatePayload,
    ): Promise<IpcResponse<KnowledgeEntity>> => {
      if (!deps.db) {
        return notReady<KnowledgeEntity>();
      }

      const service = createService();
      if (!service) {
        return notReady<KnowledgeEntity>();
      }
      const res = service.entityCreate(payload);
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
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

  deps.ipcMain.handle(
    "knowledge:entity:list",
    async (
      _event,
      payload: EntityListPayload,
    ): Promise<IpcResponse<{ items: KnowledgeEntity[] }>> => {
      if (!deps.db) {
        return notReady<{ items: KnowledgeEntity[] }>();
      }

      const service = createService();
      if (!service) {
        return notReady<{ items: KnowledgeEntity[] }>();
      }
      const res = service.entityList(payload);
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "knowledge:entity:update",
    async (
      _event,
      payload: EntityUpdatePayload,
    ): Promise<IpcResponse<KnowledgeEntity>> => {
      if (!deps.db) {
        return notReady<KnowledgeEntity>();
      }

      const service = createService();
      if (!service) {
        return notReady<KnowledgeEntity>();
      }
      const res = service.entityUpdate(payload);
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
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

      const service = createService();
      if (!service) {
        return notReady<{ deleted: true; deletedRelationCount: number }>();
      }
      const res = service.entityDelete(payload);
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "knowledge:relation:create",
    async (
      _event,
      payload: RelationCreatePayload,
    ): Promise<IpcResponse<KnowledgeRelation>> => {
      if (!deps.db) {
        return notReady<KnowledgeRelation>();
      }

      const service = createService();
      if (!service) {
        return notReady<KnowledgeRelation>();
      }
      const res = service.relationCreate(payload);
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "knowledge:relation:list",
    async (
      _event,
      payload: RelationListPayload,
    ): Promise<IpcResponse<{ items: KnowledgeRelation[] }>> => {
      if (!deps.db) {
        return notReady<{ items: KnowledgeRelation[] }>();
      }

      const service = createService();
      if (!service) {
        return notReady<{ items: KnowledgeRelation[] }>();
      }
      const res = service.relationList(payload);
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "knowledge:relation:update",
    async (
      _event,
      payload: RelationUpdatePayload,
    ): Promise<IpcResponse<KnowledgeRelation>> => {
      if (!deps.db) {
        return notReady<KnowledgeRelation>();
      }

      const service = createService();
      if (!service) {
        return notReady<KnowledgeRelation>();
      }
      const res = service.relationUpdate(payload);
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "knowledge:relation:delete",
    async (
      _event,
      payload: RelationDeletePayload,
    ): Promise<IpcResponse<{ deleted: true }>> => {
      if (!deps.db) {
        return notReady<{ deleted: true }>();
      }

      const service = createService();
      if (!service) {
        return notReady<{ deleted: true }>();
      }
      const res = service.relationDelete(payload);
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
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

  deps.ipcMain.handle(
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

  deps.ipcMain.handle(
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

  deps.ipcMain.handle(
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

  deps.ipcMain.handle(
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

  deps.ipcMain.handle(
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

  deps.ipcMain.handle(
    "knowledge:suggestion:accept",
    async (
      _event,
      payload: SuggestionAcceptPayload,
    ): Promise<IpcResponse<KnowledgeEntity>> => {
      if (!recognitionRuntime) {
        return notReady<KnowledgeEntity>();
      }

      const res = recognitionRuntime.acceptSuggestion(payload);
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
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

  deps.ipcMain.handle(
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

  deps.ipcMain.handle(
    "knowledge:query:byids",
    async (
      _event,
      payload: QueryByIdsPayload,
    ): Promise<IpcResponse<KnowledgeQueryByIdsResult>> => {
      const service = createService();
      if (!service) {
        return notReady<KnowledgeQueryByIdsResult>();
      }

      const res = service.queryByIds(payload);
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
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
