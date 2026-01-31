import type { IpcMain } from "electron";
import type Database from "better-sqlite3";

import type { IpcResponse } from "../../../../../packages/shared/types/ipc-generated";
import type { Logger } from "../logging/logger";
import {
  createKnowledgeGraphService,
  type KgEntity,
  type KgGraph,
  type KgRelation,
} from "../services/kg/kgService";

type GraphGetPayload = {
  projectId: string;
  purpose?: "ui" | "context";
};

type EntityCreatePayload = {
  projectId: string;
  name: string;
  entityType?: string;
  description?: string;
  metadataJson?: string;
};

type EntityListPayload = { projectId: string };

type EntityUpdatePayload = {
  entityId: string;
  patch: Partial<
    Pick<KgEntity, "name" | "entityType" | "description" | "metadataJson">
  >;
};

type EntityDeletePayload = { entityId: string };

type RelationCreatePayload = {
  projectId: string;
  fromEntityId: string;
  toEntityId: string;
  relationType: string;
  metadataJson?: string;
  evidenceJson?: string;
};

type RelationListPayload = { projectId: string };

type RelationUpdatePayload = {
  relationId: string;
  patch: Partial<
    Pick<
      KgRelation,
      | "fromEntityId"
      | "toEntityId"
      | "relationType"
      | "metadataJson"
      | "evidenceJson"
    >
  >;
};

type RelationDeletePayload = { relationId: string };

/**
 * Register `kg:*` IPC handlers (Knowledge Graph).
 *
 * Why: KG is persisted in SQLite but controlled via renderer UI and context
 * assembly; IPC provides the stable contract boundary.
 */
export function registerKnowledgeGraphIpcHandlers(deps: {
  ipcMain: IpcMain;
  db: Database.Database | null;
  logger: Logger;
}): void {
  deps.ipcMain.handle(
    "kg:graph:get",
    async (_e, payload: GraphGetPayload): Promise<IpcResponse<KgGraph>> => {
      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }
      const svc = createKnowledgeGraphService({ db: deps.db, logger: deps.logger });
      const res = svc.graphGet(payload);
      if (payload.purpose === "context" && res.ok) {
        deps.logger.info("kg_injected", {
          project_id: payload.projectId.trim(),
          entity_count: res.data.entities.length,
          relation_count: res.data.relations.length,
        });
      }
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "kg:entity:create",
    async (_e, payload: EntityCreatePayload): Promise<IpcResponse<KgEntity>> => {
      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }
      const svc = createKnowledgeGraphService({ db: deps.db, logger: deps.logger });
      const res = svc.entityCreate(payload);
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "kg:entity:list",
    async (
      _e,
      payload: EntityListPayload,
    ): Promise<IpcResponse<{ items: KgEntity[] }>> => {
      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }
      const svc = createKnowledgeGraphService({ db: deps.db, logger: deps.logger });
      const res = svc.entityList(payload);
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "kg:entity:update",
    async (_e, payload: EntityUpdatePayload): Promise<IpcResponse<KgEntity>> => {
      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }
      const svc = createKnowledgeGraphService({ db: deps.db, logger: deps.logger });
      const res = svc.entityUpdate({
        entityId: payload.entityId,
        patch: payload.patch,
      });
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "kg:entity:delete",
    async (
      _e,
      payload: EntityDeletePayload,
    ): Promise<IpcResponse<{ deleted: true }>> => {
      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }
      const svc = createKnowledgeGraphService({ db: deps.db, logger: deps.logger });
      const res = svc.entityDelete(payload);
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "kg:relation:create",
    async (
      _e,
      payload: RelationCreatePayload,
    ): Promise<IpcResponse<KgRelation>> => {
      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }
      const svc = createKnowledgeGraphService({ db: deps.db, logger: deps.logger });
      const res = svc.relationCreate(payload);
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "kg:relation:list",
    async (
      _e,
      payload: RelationListPayload,
    ): Promise<IpcResponse<{ items: KgRelation[] }>> => {
      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }
      const svc = createKnowledgeGraphService({ db: deps.db, logger: deps.logger });
      const res = svc.relationList(payload);
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "kg:relation:update",
    async (
      _e,
      payload: RelationUpdatePayload,
    ): Promise<IpcResponse<KgRelation>> => {
      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }
      const svc = createKnowledgeGraphService({ db: deps.db, logger: deps.logger });
      const res = svc.relationUpdate({
        relationId: payload.relationId,
        patch: payload.patch,
      });
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "kg:relation:delete",
    async (
      _e,
      payload: RelationDeletePayload,
    ): Promise<IpcResponse<{ deleted: true }>> => {
      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }
      const svc = createKnowledgeGraphService({ db: deps.db, logger: deps.logger });
      const res = svc.relationDelete(payload);
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );
}
