import type { IpcMain } from "electron";
import type Database from "better-sqlite3";

import type { IpcResponse } from "../../../../../packages/shared/types/ipc-generated";
import type { Logger } from "../logging/logger";
import {
  createKnowledgeGraphService,
  type KnowledgeEntity,
  type KnowledgeEntityType,
  type KnowledgePathResult,
  type KnowledgeRelation,
  type KnowledgeSubgraphResult,
  type KnowledgeValidateResult,
} from "../services/kg/kgService";

type EntityCreatePayload = {
  projectId: string;
  type: KnowledgeEntityType;
  name: string;
  description?: string;
  attributes?: Record<string, string>;
};

type EntityReadPayload = {
  projectId: string;
  id: string;
};

type EntityListPayload = {
  projectId: string;
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
}): void {
  function notReady<T>(): IpcResponse<T> {
    return {
      ok: false,
      error: { code: "DB_ERROR", message: "Database not ready" },
    };
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

      const service = createKnowledgeGraphService({
        db: deps.db,
        logger: deps.logger,
      });
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

      const service = createKnowledgeGraphService({
        db: deps.db,
        logger: deps.logger,
      });
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

      const service = createKnowledgeGraphService({
        db: deps.db,
        logger: deps.logger,
      });
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

      const service = createKnowledgeGraphService({
        db: deps.db,
        logger: deps.logger,
      });
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

      const service = createKnowledgeGraphService({
        db: deps.db,
        logger: deps.logger,
      });
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

      const service = createKnowledgeGraphService({
        db: deps.db,
        logger: deps.logger,
      });
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

      const service = createKnowledgeGraphService({
        db: deps.db,
        logger: deps.logger,
      });
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

      const service = createKnowledgeGraphService({
        db: deps.db,
        logger: deps.logger,
      });
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

      const service = createKnowledgeGraphService({
        db: deps.db,
        logger: deps.logger,
      });
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

      const service = createKnowledgeGraphService({
        db: deps.db,
        logger: deps.logger,
      });
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

      const service = createKnowledgeGraphService({
        db: deps.db,
        logger: deps.logger,
      });
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

      const service = createKnowledgeGraphService({
        db: deps.db,
        logger: deps.logger,
      });
      const res = service.queryValidate(payload);
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );
}
