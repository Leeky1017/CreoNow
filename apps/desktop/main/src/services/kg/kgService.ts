import { randomUUID } from "node:crypto";

import type Database from "better-sqlite3";

import type {
  IpcError,
  IpcErrorCode,
} from "../../../../../../packages/shared/types/ipc-generated";
import type { Logger } from "../../logging/logger";

type Ok<T> = { ok: true; data: T };
type Err = { ok: false; error: IpcError };
export type ServiceResult<T> = Ok<T> | Err;

export type KgEntity = {
  entityId: string;
  projectId: string;
  name: string;
  entityType?: string;
  description?: string;
  metadataJson: string;
  createdAt: number;
  updatedAt: number;
};

export type KgRelation = {
  relationId: string;
  projectId: string;
  fromEntityId: string;
  toEntityId: string;
  relationType: string;
  metadataJson: string;
  evidenceJson: string;
  createdAt: number;
  updatedAt: number;
};

export type KgGraph = {
  entities: KgEntity[];
  relations: KgRelation[];
};

export type KnowledgeGraphService = {
  graphGet: (args: { projectId: string }) => ServiceResult<KgGraph>;

  entityCreate: (args: {
    projectId: string;
    name: string;
    entityType?: string;
    description?: string;
    metadataJson?: string;
  }) => ServiceResult<KgEntity>;
  entityList: (args: {
    projectId: string;
  }) => ServiceResult<{ items: KgEntity[] }>;
  entityUpdate: (args: {
    entityId: string;
    patch: {
      name?: string;
      entityType?: string;
      description?: string;
      metadataJson?: string;
    };
  }) => ServiceResult<KgEntity>;
  entityDelete: (args: {
    entityId: string;
  }) => ServiceResult<{ deleted: true }>;

  relationCreate: (args: {
    projectId: string;
    fromEntityId: string;
    toEntityId: string;
    relationType: string;
    metadataJson?: string;
    evidenceJson?: string;
  }) => ServiceResult<KgRelation>;
  relationList: (args: {
    projectId: string;
  }) => ServiceResult<{ items: KgRelation[] }>;
  relationUpdate: (args: {
    relationId: string;
    patch: {
      fromEntityId?: string;
      toEntityId?: string;
      relationType?: string;
      metadataJson?: string;
      evidenceJson?: string;
    };
  }) => ServiceResult<KgRelation>;
  relationDelete: (args: {
    relationId: string;
  }) => ServiceResult<{ deleted: true }>;
};

const MAX_METADATA_JSON_BYTES = 32 * 1024;
const MAX_NAME_CHARS = 256;
const MAX_ENTITY_TYPE_CHARS = 64;
const MAX_DESCRIPTION_CHARS = 4096;
const MAX_RELATION_TYPE_CHARS = 64;

/**
 * Build a stable IPC error object.
 *
 * Why: services must return deterministic error codes/messages for IPC tests.
 */
function ipcError(code: IpcErrorCode, message: string, details?: unknown): Err {
  return { ok: false, error: { code, message, details } };
}

/**
 * Normalize optional strings to a trimmed value.
 *
 * Why: we must not persist whitespace-only values that later confuse both UI
 * rendering and deterministic context injection.
 */
function normalizeOptionalText(value: string | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

/**
 * Normalize optional strings to a nullable value.
 *
 * Why: the IPC surface uses optional strings for patches, but the DB stores
 * "unset" as NULL to avoid mixing empty strings with real data.
 */
function normalizeNullableText(value: string | undefined): string | null {
  const normalized = normalizeOptionalText(value);
  return normalized ?? null;
}

/**
 * Validate a `projectId` string early.
 *
 * Why: DB foreign keys would turn bad inputs into `DB_ERROR`, but the contract
 * requires stable `INVALID_ARGUMENT` semantics.
 */
function validateProjectId(projectId: string): Err | null {
  if (projectId.trim().length === 0) {
    return ipcError("INVALID_ARGUMENT", "projectId is required");
  }
  return null;
}

/**
 * Validate metadata JSON constraints before touching the DB.
 *
 * Why: the spec requires a deterministic `INVALID_ARGUMENT` on oversize payloads,
 * rather than a DB constraint error or silent truncation.
 */
function validateMetadataJson(
  fieldName: string,
  value: string,
  maxBytes: number,
): Err | null {
  if (value.trim().length === 0) {
    return ipcError("INVALID_ARGUMENT", `${fieldName} is required`);
  }
  const bytes = Buffer.byteLength(value, "utf8");
  if (bytes > maxBytes) {
    return ipcError(
      "INVALID_ARGUMENT",
      `${fieldName} exceeds ${maxBytes} bytes`,
      { maxBytes, sizeBytes: bytes },
    );
  }
  try {
    JSON.parse(value);
  } catch (error) {
    return ipcError("INVALID_ARGUMENT", `${fieldName} must be valid JSON`, {
      message: error instanceof Error ? error.message : String(error),
    });
  }
  return null;
}

/**
 * Validate evidence JSON constraints before touching the DB.
 *
 * Why: evidence must remain structured and debuggable for context injection,
 * without relying on implicit parsing failures downstream.
 */
function validateEvidenceJson(fieldName: string, value: string): Err | null {
  const metaRes = validateMetadataJson(
    fieldName,
    value,
    MAX_METADATA_JSON_BYTES,
  );
  if (metaRes) {
    return metaRes;
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return ipcError("INVALID_ARGUMENT", `${fieldName} must be a JSON array`);
    }
  } catch {
    return ipcError("INVALID_ARGUMENT", `${fieldName} must be valid JSON`);
  }
  return null;
}

type ProjectExistsRow = { projectId: string };

/**
 * Check that a project exists before writing project-scoped data.
 *
 * Why: we must return `NOT_FOUND` instead of surfacing DB foreign key failures
 * across the IPC boundary.
 */
function ensureProjectExists(
  db: Database.Database,
  projectId: string,
): Err | null {
  const row = db
    .prepare<
      [string],
      ProjectExistsRow
    >("SELECT project_id as projectId FROM projects WHERE project_id = ?")
    .get(projectId);
  if (!row) {
    return ipcError("NOT_FOUND", "Project not found");
  }
  return null;
}

type EntityRow = {
  entityId: string;
  projectId: string;
  name: string;
  entityType: string | null;
  description: string | null;
  metadataJson: string;
  createdAt: number;
  updatedAt: number;
};

/**
 * Load an entity row by id.
 *
 * Why: IPC update/delete flows require deterministic "exists" checks and a
 * single source of truth for DB field mapping.
 */
function selectEntityById(
  db: Database.Database,
  entityId: string,
): EntityRow | undefined {
  return db
    .prepare<
      [string],
      EntityRow
    >("SELECT entity_id as entityId, project_id as projectId, name, entity_type as entityType, description, metadata_json as metadataJson, created_at as createdAt, updated_at as updatedAt FROM kg_entities WHERE entity_id = ?")
    .get(entityId);
}

/**
 * Convert a DB row into the IPC-safe entity shape.
 *
 * Why: normalize nullable DB columns to `undefined` to keep payloads compact and
 * stable for the renderer and context injection formatting.
 */
function rowToEntity(row: EntityRow): KgEntity {
  return {
    entityId: row.entityId,
    projectId: row.projectId,
    name: row.name,
    entityType: row.entityType ?? undefined,
    description: row.description ?? undefined,
    metadataJson: row.metadataJson,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

type RelationRow = {
  relationId: string;
  projectId: string;
  fromEntityId: string;
  toEntityId: string;
  relationType: string;
  metadataJson: string;
  evidenceJson: string;
  createdAt: number;
  updatedAt: number;
};

/**
 * Load a relation row by id.
 *
 * Why: update/delete need stable NOT_FOUND detection without duplicating SQL.
 */
function selectRelationById(
  db: Database.Database,
  relationId: string,
): RelationRow | undefined {
  return db
    .prepare<
      [string],
      RelationRow
    >("SELECT relation_id as relationId, project_id as projectId, from_entity_id as fromEntityId, to_entity_id as toEntityId, relation_type as relationType, metadata_json as metadataJson, evidence_json as evidenceJson, created_at as createdAt, updated_at as updatedAt FROM kg_relations WHERE relation_id = ?")
    .get(relationId);
}

/**
 * Convert a DB row into the IPC-safe relation shape.
 *
 * Why: keep mapping logic centralized so schema changes don't silently drift.
 */
function rowToRelation(row: RelationRow): KgRelation {
  return {
    relationId: row.relationId,
    projectId: row.projectId,
    fromEntityId: row.fromEntityId,
    toEntityId: row.toEntityId,
    relationType: row.relationType,
    metadataJson: row.metadataJson,
    evidenceJson: row.evidenceJson,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

type EntityExistsRow = { entityId: string };

/**
 * Ensure an entity exists for a given project.
 *
 * Why: relationship endpoints require deterministic `NOT_FOUND` semantics for
 * foreign keys, instead of surfacing DB constraint errors.
 */
function ensureEntityExistsInProject(
  db: Database.Database,
  args: { projectId: string; entityId: string; fieldName: string },
): Err | null {
  const row = db
    .prepare<
      [string, string],
      EntityExistsRow
    >("SELECT entity_id as entityId FROM kg_entities WHERE project_id = ? AND entity_id = ?")
    .get(args.projectId, args.entityId);
  if (!row) {
    return ipcError("NOT_FOUND", `${args.fieldName} not found`);
  }
  return null;
}

/**
 * Create a KnowledgeGraphService backed by SQLite (SSOT).
 */
export function createKnowledgeGraphService(args: {
  db: Database.Database;
  logger: Logger;
}): KnowledgeGraphService {
  return {
    graphGet: ({ projectId }) => {
      const invalidProjectId = validateProjectId(projectId);
      if (invalidProjectId) {
        return invalidProjectId;
      }

      try {
        const projectExists = ensureProjectExists(args.db, projectId.trim());
        if (projectExists) {
          return projectExists;
        }

        const entities = args.db
          .prepare<
            [string],
            EntityRow
          >("SELECT entity_id as entityId, project_id as projectId, name, entity_type as entityType, description, metadata_json as metadataJson, created_at as createdAt, updated_at as updatedAt FROM kg_entities WHERE project_id = ? ORDER BY updated_at DESC, entity_id ASC")
          .all(projectId.trim())
          .map(rowToEntity);

        const relations = args.db
          .prepare<
            [string],
            RelationRow
          >("SELECT relation_id as relationId, project_id as projectId, from_entity_id as fromEntityId, to_entity_id as toEntityId, relation_type as relationType, metadata_json as metadataJson, evidence_json as evidenceJson, created_at as createdAt, updated_at as updatedAt FROM kg_relations WHERE project_id = ? ORDER BY updated_at DESC, relation_id ASC")
          .all(projectId.trim())
          .map(rowToRelation);

        return { ok: true, data: { entities, relations } };
      } catch (error) {
        args.logger.error("kg_graph_get_failed", {
          code: "DB_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return ipcError("DB_ERROR", "Failed to load knowledge graph");
      }
    },

    entityCreate: ({
      projectId,
      name,
      entityType,
      description,
      metadataJson,
    }) => {
      const invalidProjectId = validateProjectId(projectId);
      if (invalidProjectId) {
        return invalidProjectId;
      }

      const normalizedName = name.trim();
      if (normalizedName.length === 0) {
        return ipcError("INVALID_ARGUMENT", "name is required");
      }
      if (normalizedName.length > MAX_NAME_CHARS) {
        return ipcError(
          "INVALID_ARGUMENT",
          `name exceeds ${MAX_NAME_CHARS} chars`,
        );
      }

      const normalizedType = normalizeOptionalText(entityType);
      if (normalizedType && normalizedType.length > MAX_ENTITY_TYPE_CHARS) {
        return ipcError(
          "INVALID_ARGUMENT",
          `entityType exceeds ${MAX_ENTITY_TYPE_CHARS} chars`,
        );
      }

      const normalizedDescription = normalizeOptionalText(description);
      if (
        normalizedDescription &&
        normalizedDescription.length > MAX_DESCRIPTION_CHARS
      ) {
        return ipcError(
          "INVALID_ARGUMENT",
          `description exceeds ${MAX_DESCRIPTION_CHARS} chars`,
        );
      }

      const normalizedMetadataJson =
        normalizeOptionalText(metadataJson) ?? "{}";
      const metadataValid = validateMetadataJson(
        "metadataJson",
        normalizedMetadataJson,
        MAX_METADATA_JSON_BYTES,
      );
      if (metadataValid) {
        return metadataValid;
      }

      const entityId = randomUUID();
      const ts = Date.now();

      try {
        const projectExists = ensureProjectExists(args.db, projectId.trim());
        if (projectExists) {
          return projectExists;
        }

        args.db
          .prepare(
            "INSERT INTO kg_entities (entity_id, project_id, name, entity_type, description, metadata_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          )
          .run(
            entityId,
            projectId.trim(),
            normalizedName,
            normalizedType ?? null,
            normalizedDescription ?? null,
            normalizedMetadataJson,
            ts,
            ts,
          );

        args.logger.info("kg_entity_created", {
          entity_id: entityId,
          project_id: projectId.trim(),
          name_len: normalizedName.length,
          metadata_bytes: Buffer.byteLength(normalizedMetadataJson, "utf8"),
        });
      } catch (error) {
        args.logger.error("kg_entity_create_failed", {
          code: "DB_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return ipcError("DB_ERROR", "Failed to create entity");
      }

      const row = selectEntityById(args.db, entityId);
      if (!row) {
        return ipcError("DB_ERROR", "Failed to load created entity");
      }
      return { ok: true, data: rowToEntity(row) };
    },

    entityList: ({ projectId }) => {
      const invalidProjectId = validateProjectId(projectId);
      if (invalidProjectId) {
        return invalidProjectId;
      }

      try {
        const projectExists = ensureProjectExists(args.db, projectId.trim());
        if (projectExists) {
          return projectExists;
        }

        const rows = args.db
          .prepare<
            [string],
            EntityRow
          >("SELECT entity_id as entityId, project_id as projectId, name, entity_type as entityType, description, metadata_json as metadataJson, created_at as createdAt, updated_at as updatedAt FROM kg_entities WHERE project_id = ? ORDER BY updated_at DESC, entity_id ASC")
          .all(projectId.trim());
        return { ok: true, data: { items: rows.map(rowToEntity) } };
      } catch (error) {
        args.logger.error("kg_entity_list_failed", {
          code: "DB_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return ipcError("DB_ERROR", "Failed to list entities");
      }
    },

    entityUpdate: ({ entityId, patch }) => {
      if (entityId.trim().length === 0) {
        return ipcError("INVALID_ARGUMENT", "entityId is required");
      }
      const patchKeys = Object.keys(patch) as Array<keyof typeof patch>;
      if (patchKeys.length === 0) {
        return ipcError("INVALID_ARGUMENT", "patch is required");
      }

      const normalizedName =
        typeof patch.name === "string" ? patch.name.trim() : undefined;
      if (typeof normalizedName === "string") {
        if (normalizedName.length === 0) {
          return ipcError("INVALID_ARGUMENT", "name is required");
        }
        if (normalizedName.length > MAX_NAME_CHARS) {
          return ipcError(
            "INVALID_ARGUMENT",
            `name exceeds ${MAX_NAME_CHARS} chars`,
          );
        }
      }

      const normalizedType = normalizeNullableText(patch.entityType);
      if (
        typeof patch.entityType === "string" &&
        normalizedType &&
        normalizedType.length > MAX_ENTITY_TYPE_CHARS
      ) {
        return ipcError(
          "INVALID_ARGUMENT",
          `entityType exceeds ${MAX_ENTITY_TYPE_CHARS} chars`,
        );
      }

      const normalizedDescription = normalizeNullableText(patch.description);
      if (
        typeof patch.description === "string" &&
        normalizedDescription &&
        normalizedDescription.length > MAX_DESCRIPTION_CHARS
      ) {
        return ipcError(
          "INVALID_ARGUMENT",
          `description exceeds ${MAX_DESCRIPTION_CHARS} chars`,
        );
      }

      const normalizedMetadataJson =
        typeof patch.metadataJson === "string"
          ? patch.metadataJson.trim()
          : undefined;
      if (typeof normalizedMetadataJson === "string") {
        const metadataValid = validateMetadataJson(
          "metadataJson",
          normalizedMetadataJson,
          MAX_METADATA_JSON_BYTES,
        );
        if (metadataValid) {
          return metadataValid;
        }
      }

      const ts = Date.now();

      try {
        const existing = selectEntityById(args.db, entityId.trim());
        if (!existing) {
          return ipcError("NOT_FOUND", "Entity not found");
        }

        args.db
          .prepare(
            "UPDATE kg_entities SET name = ?, entity_type = ?, description = ?, metadata_json = ?, updated_at = ? WHERE entity_id = ?",
          )
          .run(
            normalizedName ?? existing.name,
            typeof patch.entityType === "string"
              ? normalizedType
              : existing.entityType,
            typeof patch.description === "string"
              ? normalizedDescription
              : existing.description,
            normalizedMetadataJson ?? existing.metadataJson,
            ts,
            entityId.trim(),
          );

        args.logger.info("kg_entity_updated", {
          entity_id: entityId.trim(),
          project_id: existing.projectId,
        });
      } catch (error) {
        args.logger.error("kg_entity_update_failed", {
          code: "DB_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return ipcError("DB_ERROR", "Failed to update entity");
      }

      const row = selectEntityById(args.db, entityId.trim());
      if (!row) {
        return ipcError("DB_ERROR", "Failed to load updated entity");
      }
      return { ok: true, data: rowToEntity(row) };
    },

    entityDelete: ({ entityId }) => {
      if (entityId.trim().length === 0) {
        return ipcError("INVALID_ARGUMENT", "entityId is required");
      }

      try {
        const existing = selectEntityById(args.db, entityId.trim());
        if (!existing) {
          return ipcError("NOT_FOUND", "Entity not found");
        }

        let relationsDeleted = 0;
        args.db.transaction(() => {
          const res = args.db
            .prepare(
              "DELETE FROM kg_relations WHERE project_id = ? AND (from_entity_id = ? OR to_entity_id = ?)",
            )
            .run(existing.projectId, entityId.trim(), entityId.trim());
          relationsDeleted = res.changes;

          args.db
            .prepare("DELETE FROM kg_entities WHERE entity_id = ?")
            .run(entityId.trim());
        })();

        args.logger.info("kg_entity_deleted", {
          entity_id: entityId.trim(),
          project_id: existing.projectId,
          relations_deleted: relationsDeleted,
        });

        return { ok: true, data: { deleted: true } };
      } catch (error) {
        args.logger.error("kg_entity_delete_failed", {
          code: "DB_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return ipcError("DB_ERROR", "Failed to delete entity");
      }
    },

    relationCreate: ({
      projectId,
      fromEntityId,
      toEntityId,
      relationType,
      metadataJson,
      evidenceJson,
    }) => {
      const invalidProjectId = validateProjectId(projectId);
      if (invalidProjectId) {
        return invalidProjectId;
      }

      if (fromEntityId.trim().length === 0) {
        return ipcError("INVALID_ARGUMENT", "fromEntityId is required");
      }
      if (toEntityId.trim().length === 0) {
        return ipcError("INVALID_ARGUMENT", "toEntityId is required");
      }

      const normalizedRelationType = relationType.trim();
      if (normalizedRelationType.length === 0) {
        return ipcError("INVALID_ARGUMENT", "relationType is required");
      }
      if (normalizedRelationType.length > MAX_RELATION_TYPE_CHARS) {
        return ipcError(
          "INVALID_ARGUMENT",
          `relationType exceeds ${MAX_RELATION_TYPE_CHARS} chars`,
        );
      }

      const normalizedMetadataJson =
        normalizeOptionalText(metadataJson) ?? "{}";
      const metadataValid = validateMetadataJson(
        "metadataJson",
        normalizedMetadataJson,
        MAX_METADATA_JSON_BYTES,
      );
      if (metadataValid) {
        return metadataValid;
      }

      const normalizedEvidenceJson =
        normalizeOptionalText(evidenceJson) ?? "[]";
      const evidenceValid = validateEvidenceJson(
        "evidenceJson",
        normalizedEvidenceJson,
      );
      if (evidenceValid) {
        return evidenceValid;
      }

      const relationId = randomUUID();
      const ts = Date.now();

      try {
        const projectExists = ensureProjectExists(args.db, projectId.trim());
        if (projectExists) {
          return projectExists;
        }
        const fromExists = ensureEntityExistsInProject(args.db, {
          projectId: projectId.trim(),
          entityId: fromEntityId.trim(),
          fieldName: "fromEntityId",
        });
        if (fromExists) {
          return fromExists;
        }
        const toExists = ensureEntityExistsInProject(args.db, {
          projectId: projectId.trim(),
          entityId: toEntityId.trim(),
          fieldName: "toEntityId",
        });
        if (toExists) {
          return toExists;
        }

        args.db
          .prepare(
            "INSERT INTO kg_relations (relation_id, project_id, from_entity_id, to_entity_id, relation_type, metadata_json, evidence_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          )
          .run(
            relationId,
            projectId.trim(),
            fromEntityId.trim(),
            toEntityId.trim(),
            normalizedRelationType,
            normalizedMetadataJson,
            normalizedEvidenceJson,
            ts,
            ts,
          );

        args.logger.info("kg_relation_created", {
          relation_id: relationId,
          project_id: projectId.trim(),
          metadata_bytes: Buffer.byteLength(normalizedMetadataJson, "utf8"),
        });
      } catch (error) {
        args.logger.error("kg_relation_create_failed", {
          code: "DB_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return ipcError("DB_ERROR", "Failed to create relation");
      }

      const row = selectRelationById(args.db, relationId);
      if (!row) {
        return ipcError("DB_ERROR", "Failed to load created relation");
      }
      return { ok: true, data: rowToRelation(row) };
    },

    relationList: ({ projectId }) => {
      const invalidProjectId = validateProjectId(projectId);
      if (invalidProjectId) {
        return invalidProjectId;
      }

      try {
        const projectExists = ensureProjectExists(args.db, projectId.trim());
        if (projectExists) {
          return projectExists;
        }

        const rows = args.db
          .prepare<
            [string],
            RelationRow
          >("SELECT relation_id as relationId, project_id as projectId, from_entity_id as fromEntityId, to_entity_id as toEntityId, relation_type as relationType, metadata_json as metadataJson, evidence_json as evidenceJson, created_at as createdAt, updated_at as updatedAt FROM kg_relations WHERE project_id = ? ORDER BY updated_at DESC, relation_id ASC")
          .all(projectId.trim());
        return { ok: true, data: { items: rows.map(rowToRelation) } };
      } catch (error) {
        args.logger.error("kg_relation_list_failed", {
          code: "DB_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return ipcError("DB_ERROR", "Failed to list relations");
      }
    },

    relationUpdate: ({ relationId, patch }) => {
      if (relationId.trim().length === 0) {
        return ipcError("INVALID_ARGUMENT", "relationId is required");
      }
      const patchKeys = Object.keys(patch) as Array<keyof typeof patch>;
      if (patchKeys.length === 0) {
        return ipcError("INVALID_ARGUMENT", "patch is required");
      }

      const normalizedRelationType =
        typeof patch.relationType === "string"
          ? patch.relationType.trim()
          : null;
      if (typeof patch.relationType === "string") {
        if (!normalizedRelationType || normalizedRelationType.length === 0) {
          return ipcError("INVALID_ARGUMENT", "relationType is required");
        }
        if (normalizedRelationType.length > MAX_RELATION_TYPE_CHARS) {
          return ipcError(
            "INVALID_ARGUMENT",
            `relationType exceeds ${MAX_RELATION_TYPE_CHARS} chars`,
          );
        }
      }

      const normalizedMetadataJson =
        typeof patch.metadataJson === "string"
          ? patch.metadataJson.trim()
          : undefined;
      if (typeof normalizedMetadataJson === "string") {
        const metadataValid = validateMetadataJson(
          "metadataJson",
          normalizedMetadataJson,
          MAX_METADATA_JSON_BYTES,
        );
        if (metadataValid) {
          return metadataValid;
        }
      }

      const normalizedEvidenceJson =
        typeof patch.evidenceJson === "string"
          ? patch.evidenceJson.trim()
          : undefined;
      if (typeof normalizedEvidenceJson === "string") {
        const evidenceValid = validateEvidenceJson(
          "evidenceJson",
          normalizedEvidenceJson,
        );
        if (evidenceValid) {
          return evidenceValid;
        }
      }

      if (
        typeof patch.fromEntityId === "string" &&
        patch.fromEntityId.trim().length === 0
      ) {
        return ipcError("INVALID_ARGUMENT", "fromEntityId is required");
      }
      if (
        typeof patch.toEntityId === "string" &&
        patch.toEntityId.trim().length === 0
      ) {
        return ipcError("INVALID_ARGUMENT", "toEntityId is required");
      }

      const ts = Date.now();

      try {
        const existing = selectRelationById(args.db, relationId.trim());
        if (!existing) {
          return ipcError("NOT_FOUND", "Relation not found");
        }

        const nextFromEntityId =
          typeof patch.fromEntityId === "string"
            ? patch.fromEntityId.trim()
            : existing.fromEntityId;
        const nextToEntityId =
          typeof patch.toEntityId === "string"
            ? patch.toEntityId.trim()
            : existing.toEntityId;

        const fromExists = ensureEntityExistsInProject(args.db, {
          projectId: existing.projectId,
          entityId: nextFromEntityId,
          fieldName: "fromEntityId",
        });
        if (fromExists) {
          return fromExists;
        }
        const toExists = ensureEntityExistsInProject(args.db, {
          projectId: existing.projectId,
          entityId: nextToEntityId,
          fieldName: "toEntityId",
        });
        if (toExists) {
          return toExists;
        }

        args.db
          .prepare(
            "UPDATE kg_relations SET from_entity_id = ?, to_entity_id = ?, relation_type = ?, metadata_json = ?, evidence_json = ?, updated_at = ? WHERE relation_id = ?",
          )
          .run(
            nextFromEntityId,
            nextToEntityId,
            normalizedRelationType ?? existing.relationType,
            normalizedMetadataJson ?? existing.metadataJson,
            normalizedEvidenceJson ?? existing.evidenceJson,
            ts,
            relationId.trim(),
          );

        args.logger.info("kg_relation_updated", {
          relation_id: relationId.trim(),
          project_id: existing.projectId,
        });
      } catch (error) {
        args.logger.error("kg_relation_update_failed", {
          code: "DB_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return ipcError("DB_ERROR", "Failed to update relation");
      }

      const row = selectRelationById(args.db, relationId.trim());
      if (!row) {
        return ipcError("DB_ERROR", "Failed to load updated relation");
      }
      return { ok: true, data: rowToRelation(row) };
    },

    relationDelete: ({ relationId }) => {
      if (relationId.trim().length === 0) {
        return ipcError("INVALID_ARGUMENT", "relationId is required");
      }

      try {
        const existing = selectRelationById(args.db, relationId.trim());
        if (!existing) {
          return ipcError("NOT_FOUND", "Relation not found");
        }

        args.db
          .prepare("DELETE FROM kg_relations WHERE relation_id = ?")
          .run(relationId.trim());

        args.logger.info("kg_relation_deleted", {
          relation_id: relationId.trim(),
          project_id: existing.projectId,
        });
        return { ok: true, data: { deleted: true } };
      } catch (error) {
        args.logger.error("kg_relation_delete_failed", {
          code: "DB_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return ipcError("DB_ERROR", "Failed to delete relation");
      }
    },
  };
}
