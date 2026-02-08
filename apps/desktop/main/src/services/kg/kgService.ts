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

export const KNOWLEDGE_ENTITY_TYPES = [
  "character",
  "location",
  "event",
  "item",
  "faction",
] as const;

export type KnowledgeEntityType = (typeof KNOWLEDGE_ENTITY_TYPES)[number];

const BUILTIN_RELATION_TYPES = [
  "ally",
  "enemy",
  "parent",
  "sibling",
  "belongs_to",
  "owns",
  "located_at",
  "participates_in",
] as const;

const DEFAULT_NODE_LIMIT = 50_000;
const DEFAULT_EDGE_LIMIT = 200_000;
const DEFAULT_ATTRIBUTE_KEYS_LIMIT = 200;
const DEFAULT_QUERY_TIMEOUT_MS = 2_000;
const DEFAULT_PATH_EXPANSION_LIMIT = 10_000;
const DEFAULT_SUBGRAPH_MAX_K = 3;

const MAX_ENTITY_NAME_CHARS = 256;
const MAX_RELATION_TYPE_CHARS = 64;
const MAX_DESCRIPTION_CHARS = 4_096;

export type KnowledgeEntity = {
  id: string;
  projectId: string;
  type: KnowledgeEntityType;
  name: string;
  description: string;
  attributes: Record<string, string>;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeRelation = {
  id: string;
  projectId: string;
  sourceEntityId: string;
  targetEntityId: string;
  relationType: string;
  description: string;
  createdAt: string;
};

export type KnowledgeSubgraphResult = {
  entities: KnowledgeEntity[];
  relations: KnowledgeRelation[];
  nodeCount: number;
  edgeCount: number;
  queryCostMs: number;
};

export type KnowledgePathResult = {
  pathEntityIds: string[];
  queryCostMs: number;
  expansions: number;
  degraded: boolean;
};

export type KnowledgeValidateResult = {
  cycles: string[][];
  queryCostMs: number;
};

export type KnowledgeRelevantQueryResult = {
  items: KnowledgeEntity[];
  queryCostMs: number;
};

export type KnowledgeQueryByIdsResult = {
  items: KnowledgeEntity[];
};

export type KgRulesInjectionEntity = {
  id: string;
  name: string;
  type: KnowledgeEntityType;
  attributes: Record<string, string>;
  relationsSummary: string[];
};

export type KgRulesInjectionRequest = {
  projectId: string;
  documentId: string;
  excerpt: string;
  traceId: string;
  maxEntities?: number;
  entityIds?: string[];
};

export type KgRulesInjectionData = {
  injectedEntities: KgRulesInjectionEntity[];
  source: "kg-rules-mock";
};

export type KnowledgeGraphService = {
  entityCreate: (args: {
    projectId: string;
    type: KnowledgeEntityType;
    name: string;
    description?: string;
    attributes?: Record<string, string>;
  }) => ServiceResult<KnowledgeEntity>;
  entityRead: (args: {
    projectId: string;
    id: string;
  }) => ServiceResult<KnowledgeEntity>;
  entityList: (args: {
    projectId: string;
  }) => ServiceResult<{ items: KnowledgeEntity[] }>;
  entityUpdate: (args: {
    projectId: string;
    id: string;
    expectedVersion: number;
    patch: {
      type?: KnowledgeEntityType;
      name?: string;
      description?: string;
      attributes?: Record<string, string>;
    };
  }) => ServiceResult<KnowledgeEntity>;
  entityDelete: (args: {
    projectId: string;
    id: string;
  }) => ServiceResult<{ deleted: true; deletedRelationCount: number }>;

  relationCreate: (args: {
    projectId: string;
    sourceEntityId: string;
    targetEntityId: string;
    relationType: string;
    description?: string;
  }) => ServiceResult<KnowledgeRelation>;
  relationList: (args: {
    projectId: string;
  }) => ServiceResult<{ items: KnowledgeRelation[] }>;
  relationUpdate: (args: {
    projectId: string;
    id: string;
    patch: {
      sourceEntityId?: string;
      targetEntityId?: string;
      relationType?: string;
      description?: string;
    };
  }) => ServiceResult<KnowledgeRelation>;
  relationDelete: (args: {
    projectId: string;
    id: string;
  }) => ServiceResult<{ deleted: true }>;

  querySubgraph: (args: {
    projectId: string;
    centerEntityId: string;
    k: number;
  }) => ServiceResult<KnowledgeSubgraphResult>;
  queryPath: (args: {
    projectId: string;
    sourceEntityId: string;
    targetEntityId: string;
    timeoutMs?: number;
  }) => ServiceResult<KnowledgePathResult>;
  queryValidate: (args: {
    projectId: string;
  }) => ServiceResult<KnowledgeValidateResult>;
  queryRelevant: (args: {
    projectId: string;
    excerpt: string;
    maxEntities?: number;
    entityIds?: string[];
  }) => ServiceResult<KnowledgeRelevantQueryResult>;
  queryByIds: (args: {
    projectId: string;
    entityIds: string[];
  }) => ServiceResult<KnowledgeQueryByIdsResult>;
  buildRulesInjection: (
    args: KgRulesInjectionRequest,
  ) => ServiceResult<KgRulesInjectionData>;
};

type ServiceLimits = {
  nodeLimit: number;
  edgeLimit: number;
  attributeKeysLimit: number;
  queryTimeoutMs: number;
  pathExpansionLimit: number;
  subgraphMaxK: number;
};

type EntityRow = {
  id: string;
  projectId: string;
  type: KnowledgeEntityType;
  name: string;
  description: string;
  attributesJson: string;
  version: number;
  createdAt: string;
  updatedAt: string;
};

type RelationRow = {
  id: string;
  projectId: string;
  sourceEntityId: string;
  targetEntityId: string;
  relationType: string;
  description: string;
  createdAt: string;
};

/**
 * Build a stable IPC error object.
 *
 * Why: services must return deterministic error codes/messages for IPC tests.
 */
function ipcError(code: IpcErrorCode, message: string, details?: unknown): Err {
  return { ok: false, error: { code, message, details } };
}

/**
 * Parse a positive integer from env with fallback.
 */
function resolvePositiveInt(
  value: string | undefined,
  fallback: number,
): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

/**
 * Resolve runtime limits, with test-friendly env overrides.
 */
function resolveLimits(): ServiceLimits {
  return {
    nodeLimit: resolvePositiveInt(
      process.env.CREONOW_KG_NODE_LIMIT,
      DEFAULT_NODE_LIMIT,
    ),
    edgeLimit: resolvePositiveInt(
      process.env.CREONOW_KG_EDGE_LIMIT,
      DEFAULT_EDGE_LIMIT,
    ),
    attributeKeysLimit: resolvePositiveInt(
      process.env.CREONOW_KG_ATTRIBUTE_KEYS_LIMIT,
      DEFAULT_ATTRIBUTE_KEYS_LIMIT,
    ),
    queryTimeoutMs: resolvePositiveInt(
      process.env.CREONOW_KG_QUERY_TIMEOUT_MS,
      DEFAULT_QUERY_TIMEOUT_MS,
    ),
    pathExpansionLimit: resolvePositiveInt(
      process.env.CREONOW_KG_PATH_EXPANSION_LIMIT,
      DEFAULT_PATH_EXPANSION_LIMIT,
    ),
    subgraphMaxK: resolvePositiveInt(
      process.env.CREONOW_KG_SUBGRAPH_MAX_K,
      DEFAULT_SUBGRAPH_MAX_K,
    ),
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeText(value: string): string {
  return value.trim();
}

function normalizeEntityType(value: string): KnowledgeEntityType | undefined {
  const normalized = value.trim() as KnowledgeEntityType;
  if (KNOWLEDGE_ENTITY_TYPES.includes(normalized)) {
    return normalized;
  }
  return undefined;
}

function normalizeRelationTypeKey(value: string): string {
  return value.trim().toLowerCase();
}

function validateProjectId(projectId: string): Err | null {
  if (projectId.trim().length === 0) {
    return ipcError("INVALID_ARGUMENT", "projectId is required");
  }
  return null;
}

function validateEntityName(name: string): Err | null {
  const normalized = normalizeText(name);
  if (normalized.length === 0) {
    return ipcError("INVALID_ARGUMENT", "name is required");
  }
  if (normalized.length > MAX_ENTITY_NAME_CHARS) {
    return ipcError(
      "INVALID_ARGUMENT",
      `name exceeds ${MAX_ENTITY_NAME_CHARS} chars`,
    );
  }
  return null;
}

function validateDescription(description: string): Err | null {
  if (description.length > MAX_DESCRIPTION_CHARS) {
    return ipcError(
      "INVALID_ARGUMENT",
      `description exceeds ${MAX_DESCRIPTION_CHARS} chars`,
    );
  }
  return null;
}

function validateRelationType(relationType: string): Err | null {
  if (relationType.length === 0) {
    return ipcError("INVALID_ARGUMENT", "relationType is required");
  }
  if (relationType.length > MAX_RELATION_TYPE_CHARS) {
    return ipcError(
      "INVALID_ARGUMENT",
      `relationType exceeds ${MAX_RELATION_TYPE_CHARS} chars`,
    );
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function validateAndNormalizeAttributes(args: {
  attributes: Record<string, string> | undefined;
  limit: number;
}): ServiceResult<Record<string, string>> {
  if (!args.attributes) {
    return { ok: true, data: {} };
  }

  const entries = Object.entries(args.attributes);
  if (entries.length > args.limit) {
    return ipcError(
      "KG_ATTRIBUTE_KEYS_EXCEEDED",
      `attributes keys exceed ${args.limit}`,
      { limit: args.limit, actual: entries.length },
    );
  }

  const normalized: Record<string, string> = {};
  for (const [rawKey, rawValue] of entries) {
    const key = rawKey.trim();
    if (key.length === 0) {
      return ipcError("INVALID_ARGUMENT", "attribute key must not be empty");
    }
    normalized[key] = String(rawValue);
  }

  return { ok: true, data: normalized };
}

function parseAttributes(attributesJson: string): Record<string, string> {
  try {
    const parsed = JSON.parse(attributesJson) as unknown;
    if (!isRecord(parsed)) {
      return {};
    }

    const normalized: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string") {
        normalized[key] = value;
      }
    }
    return normalized;
  } catch {
    return {};
  }
}

function ensureProjectExists(
  db: Database.Database,
  projectId: string,
): Err | null {
  const row = db
    .prepare<
      [string],
      { projectId: string }
    >("SELECT project_id as projectId FROM projects WHERE project_id = ?")
    .get(projectId);

  if (!row) {
    return ipcError("NOT_FOUND", "Project not found");
  }
  return null;
}

function selectEntityById(
  db: Database.Database,
  id: string,
): EntityRow | undefined {
  return db
    .prepare<
      [string],
      EntityRow
    >("SELECT id, project_id as projectId, type, name, description, attributes_json as attributesJson, version, created_at as createdAt, updated_at as updatedAt FROM kg_entities WHERE id = ?")
    .get(id);
}

function selectRelationById(
  db: Database.Database,
  id: string,
): RelationRow | undefined {
  return db
    .prepare<
      [string],
      RelationRow
    >("SELECT id, project_id as projectId, source_entity_id as sourceEntityId, target_entity_id as targetEntityId, relation_type as relationType, description, created_at as createdAt FROM kg_relations WHERE id = ?")
    .get(id);
}

function rowToEntity(row: EntityRow): KnowledgeEntity {
  return {
    id: row.id,
    projectId: row.projectId,
    type: row.type,
    name: row.name,
    description: row.description,
    attributes: parseAttributes(row.attributesJson),
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function rowToRelation(row: RelationRow): KnowledgeRelation {
  return {
    id: row.id,
    projectId: row.projectId,
    sourceEntityId: row.sourceEntityId,
    targetEntityId: row.targetEntityId,
    relationType: row.relationType,
    description: row.description,
    createdAt: row.createdAt,
  };
}

function countEntities(db: Database.Database, projectId: string): number {
  const row = db
    .prepare<
      [string],
      { count: number }
    >("SELECT COUNT(1) as count FROM kg_entities WHERE project_id = ?")
    .get(projectId);
  return row?.count ?? 0;
}

function countRelations(db: Database.Database, projectId: string): number {
  const row = db
    .prepare<
      [string],
      { count: number }
    >("SELECT COUNT(1) as count FROM kg_relations WHERE project_id = ?")
    .get(projectId);
  return row?.count ?? 0;
}

function ensureEntityInProject(
  db: Database.Database,
  args: { projectId: string; entityId: string; fieldName: string },
): EntityRow | Err {
  const row = db
    .prepare<
      [string, string],
      EntityRow
    >("SELECT id, project_id as projectId, type, name, description, attributes_json as attributesJson, version, created_at as createdAt, updated_at as updatedAt FROM kg_entities WHERE project_id = ? AND id = ?")
    .get(args.projectId, args.entityId);

  if (!row) {
    return ipcError(
      "KG_RELATION_INVALID",
      `${args.fieldName} not found in project`,
      { fieldName: args.fieldName, entityId: args.entityId },
    );
  }

  return row;
}

function entityDuplicateExists(
  db: Database.Database,
  args: {
    projectId: string;
    type: KnowledgeEntityType;
    name: string;
    excludeId?: string;
  },
): boolean {
  const normalizedName = normalizeText(args.name);
  const query = args.excludeId
    ? "SELECT id FROM kg_entities WHERE project_id = ? AND type = ? AND lower(trim(name)) = lower(trim(?)) AND id != ? LIMIT 1"
    : "SELECT id FROM kg_entities WHERE project_id = ? AND type = ? AND lower(trim(name)) = lower(trim(?)) LIMIT 1";

  const row = args.excludeId
    ? db
        .prepare<[string, string, string, string], { id: string }>(query)
        .get(args.projectId, args.type, normalizedName, args.excludeId)
    : db
        .prepare<[string, string, string], { id: string }>(query)
        .get(args.projectId, args.type, normalizedName);

  return Boolean(row);
}

function ensureRelationTypeRegistered(
  db: Database.Database,
  args: { projectId: string; relationType: string },
): void {
  const ts = nowIso();

  const insertBuiltin = db.prepare(
    "INSERT OR IGNORE INTO kg_relation_types (id, project_id, key, label, builtin, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  );

  for (const key of BUILTIN_RELATION_TYPES) {
    insertBuiltin.run(
      `builtin-${args.projectId}-${key}`,
      args.projectId,
      key,
      key,
      1,
      ts,
    );
  }

  const normalized = normalizeRelationTypeKey(args.relationType);
  if (
    BUILTIN_RELATION_TYPES.includes(
      normalized as (typeof BUILTIN_RELATION_TYPES)[number],
    )
  ) {
    return;
  }

  if (normalized.length === 0) {
    return;
  }

  db.prepare(
    "INSERT OR IGNORE INTO kg_relation_types (id, project_id, key, label, builtin, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(
    `custom-${args.projectId}-${normalized}`,
    args.projectId,
    normalized,
    args.relationType,
    0,
    ts,
  );
}

function listProjectEntities(
  db: Database.Database,
  projectId: string,
): KnowledgeEntity[] {
  const rows = db
    .prepare<
      [string],
      EntityRow
    >("SELECT id, project_id as projectId, type, name, description, attributes_json as attributesJson, version, created_at as createdAt, updated_at as updatedAt FROM kg_entities WHERE project_id = ? ORDER BY updated_at DESC, id ASC")
    .all(projectId);
  return rows.map(rowToEntity);
}

function listProjectRelations(
  db: Database.Database,
  projectId: string,
): KnowledgeRelation[] {
  const rows = db
    .prepare<
      [string],
      RelationRow
    >("SELECT id, project_id as projectId, source_entity_id as sourceEntityId, target_entity_id as targetEntityId, relation_type as relationType, description, created_at as createdAt FROM kg_relations WHERE project_id = ? ORDER BY created_at DESC, id ASC")
    .all(projectId);
  return rows.map(rowToRelation);
}

function listEntitiesByIds(
  db: Database.Database,
  entityIds: string[],
): Array<{ id: string; projectId: string; row: EntityRow }> {
  if (entityIds.length === 0) {
    return [];
  }

  const placeholders = entityIds.map(() => "?").join(",");
  const sql = `SELECT id, project_id as projectId, type, name, description, attributes_json as attributesJson, version, created_at as createdAt, updated_at as updatedAt FROM kg_entities WHERE id IN (${placeholders})`;

  const rows = db.prepare(sql).all(...entityIds) as EntityRow[];
  return rows.map((row) => ({
    id: row.id,
    projectId: row.projectId,
    row,
  }));
}

function buildDirectedAdjacency(
  relations: KnowledgeRelation[],
): Map<string, string[]> {
  const adjacency = new Map<string, string[]>();
  for (const relation of relations) {
    const current = adjacency.get(relation.sourceEntityId) ?? [];
    current.push(relation.targetEntityId);
    adjacency.set(relation.sourceEntityId, current);
  }
  return adjacency;
}

function buildUndirectedAdjacency(
  relations: KnowledgeRelation[],
): Map<string, string[]> {
  const adjacency = new Map<string, string[]>();
  for (const relation of relations) {
    const source = adjacency.get(relation.sourceEntityId) ?? [];
    source.push(relation.targetEntityId);
    adjacency.set(relation.sourceEntityId, source);

    const target = adjacency.get(relation.targetEntityId) ?? [];
    target.push(relation.sourceEntityId);
    adjacency.set(relation.targetEntityId, target);
  }
  return adjacency;
}

function dedupeIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const rawId of ids) {
    const id = rawId.trim();
    if (id.length === 0 || seen.has(id)) {
      continue;
    }
    seen.add(id);
    ordered.push(id);
  }
  return ordered;
}

function normalizeKeywordTokens(text: string): string[] {
  const tokens = text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
  return [...new Set(tokens)];
}

function resolveMaxEntities(maxEntities: number | undefined): number {
  if (!maxEntities || !Number.isFinite(maxEntities)) {
    return 5;
  }
  const normalized = Math.floor(maxEntities);
  if (normalized <= 0) {
    return 1;
  }
  return Math.min(50, normalized);
}

/**
 * Create a KnowledgeGraphService backed by SQLite (SSOT).
 */
export function createKnowledgeGraphService(args: {
  db: Database.Database;
  logger: Logger;
}): KnowledgeGraphService {
  const limits = resolveLimits();

  return {
    entityCreate: ({ projectId, type, name, description, attributes }) => {
      const invalidProjectId = validateProjectId(projectId);
      if (invalidProjectId) {
        return invalidProjectId;
      }

      const normalizedType = normalizeEntityType(type);
      if (!normalizedType) {
        return ipcError("INVALID_ARGUMENT", "type is invalid");
      }

      const invalidName = validateEntityName(name);
      if (invalidName) {
        return invalidName;
      }

      const normalizedDescription = normalizeText(description ?? "");
      const invalidDescription = validateDescription(normalizedDescription);
      if (invalidDescription) {
        return invalidDescription;
      }

      const normalizedAttributes = validateAndNormalizeAttributes({
        attributes,
        limit: limits.attributeKeysLimit,
      });
      if (!normalizedAttributes.ok) {
        return normalizedAttributes;
      }

      const normalizedProjectId = projectId.trim();
      const normalizedName = normalizeText(name);

      try {
        const projectExists = ensureProjectExists(args.db, normalizedProjectId);
        if (projectExists) {
          return projectExists;
        }

        if (countEntities(args.db, normalizedProjectId) >= limits.nodeLimit) {
          return ipcError("KG_CAPACITY_EXCEEDED", "node capacity exceeded", {
            kind: "node",
            limit: limits.nodeLimit,
          });
        }

        if (
          entityDuplicateExists(args.db, {
            projectId: normalizedProjectId,
            type: normalizedType,
            name: normalizedName,
          })
        ) {
          return ipcError(
            "KG_ENTITY_DUPLICATE",
            "entity with same type and normalized name already exists",
            {
              type: normalizedType,
              name: normalizedName,
            },
          );
        }

        const id = randomUUID();
        const ts = nowIso();
        args.db
          .prepare(
            "INSERT INTO kg_entities (id, project_id, type, name, description, attributes_json, version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          )
          .run(
            id,
            normalizedProjectId,
            normalizedType,
            normalizedName,
            normalizedDescription,
            JSON.stringify(normalizedAttributes.data),
            1,
            ts,
            ts,
          );

        const row = selectEntityById(args.db, id);
        if (!row) {
          return ipcError("DB_ERROR", "Failed to load created entity");
        }

        return { ok: true, data: rowToEntity(row) };
      } catch (error) {
        args.logger.error("kg_entity_create_failed", {
          code: "DB_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return ipcError("DB_ERROR", "Failed to create entity");
      }
    },

    entityRead: ({ projectId, id }) => {
      const invalidProjectId = validateProjectId(projectId);
      if (invalidProjectId) {
        return invalidProjectId;
      }
      if (id.trim().length === 0) {
        return ipcError("INVALID_ARGUMENT", "id is required");
      }

      const normalizedProjectId = projectId.trim();
      const normalizedId = id.trim();

      try {
        const projectExists = ensureProjectExists(args.db, normalizedProjectId);
        if (projectExists) {
          return projectExists;
        }

        const row = selectEntityById(args.db, normalizedId);
        if (!row || row.projectId !== normalizedProjectId) {
          return ipcError("NOT_FOUND", "Entity not found");
        }

        return { ok: true, data: rowToEntity(row) };
      } catch (error) {
        args.logger.error("kg_entity_read_failed", {
          code: "DB_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return ipcError("DB_ERROR", "Failed to read entity");
      }
    },

    entityList: ({ projectId }) => {
      const invalidProjectId = validateProjectId(projectId);
      if (invalidProjectId) {
        return invalidProjectId;
      }

      const normalizedProjectId = projectId.trim();

      try {
        const projectExists = ensureProjectExists(args.db, normalizedProjectId);
        if (projectExists) {
          return projectExists;
        }

        return {
          ok: true,
          data: { items: listProjectEntities(args.db, normalizedProjectId) },
        };
      } catch (error) {
        args.logger.error("kg_entity_list_failed", {
          code: "DB_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return ipcError("DB_ERROR", "Failed to list entities");
      }
    },

    entityUpdate: ({ projectId, id, expectedVersion, patch }) => {
      const invalidProjectId = validateProjectId(projectId);
      if (invalidProjectId) {
        return invalidProjectId;
      }
      if (id.trim().length === 0) {
        return ipcError("INVALID_ARGUMENT", "id is required");
      }
      if (!Number.isInteger(expectedVersion) || expectedVersion <= 0) {
        return ipcError(
          "INVALID_ARGUMENT",
          "expectedVersion must be a positive integer",
        );
      }

      const patchKeys = Object.keys(patch) as Array<keyof typeof patch>;
      if (patchKeys.length === 0) {
        return ipcError("INVALID_ARGUMENT", "patch is required");
      }

      if (typeof patch.name === "string") {
        const invalidName = validateEntityName(patch.name);
        if (invalidName) {
          return invalidName;
        }
      }

      if (typeof patch.description === "string") {
        const invalidDescription = validateDescription(
          patch.description.trim(),
        );
        if (invalidDescription) {
          return invalidDescription;
        }
      }

      if (typeof patch.type === "string") {
        const normalizedType = normalizeEntityType(patch.type);
        if (!normalizedType) {
          return ipcError("INVALID_ARGUMENT", "patch.type is invalid");
        }
      }

      let normalizedAttributes: ServiceResult<Record<string, string>> | null =
        null;
      if (patch.attributes) {
        normalizedAttributes = validateAndNormalizeAttributes({
          attributes: patch.attributes,
          limit: limits.attributeKeysLimit,
        });
        if (!normalizedAttributes.ok) {
          return normalizedAttributes;
        }
      }

      const normalizedProjectId = projectId.trim();
      const normalizedId = id.trim();

      try {
        const projectExists = ensureProjectExists(args.db, normalizedProjectId);
        if (projectExists) {
          return projectExists;
        }

        const existing = selectEntityById(args.db, normalizedId);
        if (!existing || existing.projectId !== normalizedProjectId) {
          return ipcError("NOT_FOUND", "Entity not found");
        }

        if (existing.version !== expectedVersion) {
          return ipcError("KG_ENTITY_CONFLICT", "entity version conflict", {
            expectedVersion,
            latestVersion: existing.version,
            latestSnapshot: rowToEntity(existing),
          });
        }

        const nextType =
          typeof patch.type === "string"
            ? (normalizeEntityType(patch.type) ?? existing.type)
            : existing.type;
        const nextName =
          typeof patch.name === "string"
            ? normalizeText(patch.name)
            : existing.name;
        const nextDescription =
          typeof patch.description === "string"
            ? normalizeText(patch.description)
            : existing.description;
        const nextAttributesJson = normalizedAttributes
          ? JSON.stringify(normalizedAttributes.data)
          : existing.attributesJson;

        if (
          entityDuplicateExists(args.db, {
            projectId: normalizedProjectId,
            type: nextType,
            name: nextName,
            excludeId: normalizedId,
          })
        ) {
          return ipcError(
            "KG_ENTITY_DUPLICATE",
            "entity with same type and normalized name already exists",
            { type: nextType, name: nextName },
          );
        }

        args.db
          .prepare(
            "UPDATE kg_entities SET type = ?, name = ?, description = ?, attributes_json = ?, version = ?, updated_at = ? WHERE id = ?",
          )
          .run(
            nextType,
            nextName,
            nextDescription,
            nextAttributesJson,
            existing.version + 1,
            nowIso(),
            normalizedId,
          );

        const row = selectEntityById(args.db, normalizedId);
        if (!row) {
          return ipcError("DB_ERROR", "Failed to load updated entity");
        }

        return { ok: true, data: rowToEntity(row) };
      } catch (error) {
        args.logger.error("kg_entity_update_failed", {
          code: "DB_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return ipcError("DB_ERROR", "Failed to update entity");
      }
    },

    entityDelete: ({ projectId, id }) => {
      const invalidProjectId = validateProjectId(projectId);
      if (invalidProjectId) {
        return invalidProjectId;
      }
      if (id.trim().length === 0) {
        return ipcError("INVALID_ARGUMENT", "id is required");
      }

      const normalizedProjectId = projectId.trim();
      const normalizedId = id.trim();

      try {
        const projectExists = ensureProjectExists(args.db, normalizedProjectId);
        if (projectExists) {
          return projectExists;
        }

        const existing = selectEntityById(args.db, normalizedId);
        if (!existing || existing.projectId !== normalizedProjectId) {
          return ipcError("NOT_FOUND", "Entity not found");
        }

        let deletedRelationCount = 0;
        args.db.transaction(() => {
          const deletedRelations = args.db
            .prepare(
              "DELETE FROM kg_relations WHERE project_id = ? AND (source_entity_id = ? OR target_entity_id = ?)",
            )
            .run(normalizedProjectId, normalizedId, normalizedId);
          deletedRelationCount = deletedRelations.changes;

          args.db
            .prepare("DELETE FROM kg_entities WHERE project_id = ? AND id = ?")
            .run(normalizedProjectId, normalizedId);
        })();

        return { ok: true, data: { deleted: true, deletedRelationCount } };
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
      sourceEntityId,
      targetEntityId,
      relationType,
      description,
    }) => {
      const invalidProjectId = validateProjectId(projectId);
      if (invalidProjectId) {
        return invalidProjectId;
      }

      const normalizedSource = sourceEntityId.trim();
      const normalizedTarget = targetEntityId.trim();
      const normalizedType = relationType.trim();
      const normalizedDescription = normalizeText(description ?? "");

      if (normalizedSource.length === 0) {
        return ipcError("INVALID_ARGUMENT", "sourceEntityId is required");
      }
      if (normalizedTarget.length === 0) {
        return ipcError("INVALID_ARGUMENT", "targetEntityId is required");
      }
      if (normalizedSource === normalizedTarget) {
        return ipcError(
          "KG_RELATION_INVALID",
          "sourceEntityId and targetEntityId must be different",
        );
      }

      const invalidRelationType = validateRelationType(normalizedType);
      if (invalidRelationType) {
        return invalidRelationType;
      }

      const invalidDescription = validateDescription(normalizedDescription);
      if (invalidDescription) {
        return invalidDescription;
      }

      const normalizedProjectId = projectId.trim();

      try {
        const projectExists = ensureProjectExists(args.db, normalizedProjectId);
        if (projectExists) {
          return projectExists;
        }

        if (countRelations(args.db, normalizedProjectId) >= limits.edgeLimit) {
          return ipcError("KG_CAPACITY_EXCEEDED", "edge capacity exceeded", {
            kind: "edge",
            limit: limits.edgeLimit,
          });
        }

        const sourceEntity = ensureEntityInProject(args.db, {
          projectId: normalizedProjectId,
          entityId: normalizedSource,
          fieldName: "sourceEntityId",
        });
        if (!sourceEntity || "ok" in sourceEntity) {
          args.logger.error("kg_relation_invalid", {
            reason: "source_missing_or_cross_project",
            project_id: normalizedProjectId,
            source_entity_id: normalizedSource,
          });
          return sourceEntity;
        }

        const targetEntity = ensureEntityInProject(args.db, {
          projectId: normalizedProjectId,
          entityId: normalizedTarget,
          fieldName: "targetEntityId",
        });
        if (!targetEntity || "ok" in targetEntity) {
          args.logger.error("kg_relation_invalid", {
            reason: "target_missing_or_cross_project",
            project_id: normalizedProjectId,
            target_entity_id: normalizedTarget,
          });
          return targetEntity;
        }

        ensureRelationTypeRegistered(args.db, {
          projectId: normalizedProjectId,
          relationType: normalizedType,
        });

        const id = randomUUID();
        const ts = nowIso();
        args.db
          .prepare(
            "INSERT INTO kg_relations (id, project_id, source_entity_id, target_entity_id, relation_type, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
          )
          .run(
            id,
            normalizedProjectId,
            sourceEntity.id,
            targetEntity.id,
            normalizedType,
            normalizedDescription,
            ts,
          );

        const row = selectRelationById(args.db, id);
        if (!row) {
          return ipcError("DB_ERROR", "Failed to load created relation");
        }

        return { ok: true, data: rowToRelation(row) };
      } catch (error) {
        args.logger.error("kg_relation_create_failed", {
          code: "DB_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return ipcError("DB_ERROR", "Failed to create relation");
      }
    },

    relationList: ({ projectId }) => {
      const invalidProjectId = validateProjectId(projectId);
      if (invalidProjectId) {
        return invalidProjectId;
      }

      const normalizedProjectId = projectId.trim();

      try {
        const projectExists = ensureProjectExists(args.db, normalizedProjectId);
        if (projectExists) {
          return projectExists;
        }

        return {
          ok: true,
          data: { items: listProjectRelations(args.db, normalizedProjectId) },
        };
      } catch (error) {
        args.logger.error("kg_relation_list_failed", {
          code: "DB_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return ipcError("DB_ERROR", "Failed to list relations");
      }
    },

    relationUpdate: ({ projectId, id, patch }) => {
      const invalidProjectId = validateProjectId(projectId);
      if (invalidProjectId) {
        return invalidProjectId;
      }
      if (id.trim().length === 0) {
        return ipcError("INVALID_ARGUMENT", "id is required");
      }

      const patchKeys = Object.keys(patch) as Array<keyof typeof patch>;
      if (patchKeys.length === 0) {
        return ipcError("INVALID_ARGUMENT", "patch is required");
      }

      if (typeof patch.relationType === "string") {
        const invalidRelationType = validateRelationType(
          patch.relationType.trim(),
        );
        if (invalidRelationType) {
          return invalidRelationType;
        }
      }

      if (typeof patch.description === "string") {
        const invalidDescription = validateDescription(
          patch.description.trim(),
        );
        if (invalidDescription) {
          return invalidDescription;
        }
      }

      const normalizedProjectId = projectId.trim();
      const normalizedId = id.trim();

      try {
        const projectExists = ensureProjectExists(args.db, normalizedProjectId);
        if (projectExists) {
          return projectExists;
        }

        const existing = selectRelationById(args.db, normalizedId);
        if (!existing || existing.projectId !== normalizedProjectId) {
          return ipcError("NOT_FOUND", "Relation not found");
        }

        const nextSource =
          typeof patch.sourceEntityId === "string"
            ? patch.sourceEntityId.trim()
            : existing.sourceEntityId;
        const nextTarget =
          typeof patch.targetEntityId === "string"
            ? patch.targetEntityId.trim()
            : existing.targetEntityId;

        if (nextSource.length === 0 || nextTarget.length === 0) {
          return ipcError(
            "INVALID_ARGUMENT",
            "relation endpoints are required",
          );
        }
        if (nextSource === nextTarget) {
          return ipcError(
            "KG_RELATION_INVALID",
            "sourceEntityId and targetEntityId must be different",
          );
        }

        const sourceEntity = ensureEntityInProject(args.db, {
          projectId: normalizedProjectId,
          entityId: nextSource,
          fieldName: "sourceEntityId",
        });
        if ("ok" in sourceEntity) {
          return sourceEntity;
        }

        const targetEntity = ensureEntityInProject(args.db, {
          projectId: normalizedProjectId,
          entityId: nextTarget,
          fieldName: "targetEntityId",
        });
        if ("ok" in targetEntity) {
          return targetEntity;
        }

        const nextType =
          typeof patch.relationType === "string"
            ? patch.relationType.trim()
            : existing.relationType;
        const nextDescription =
          typeof patch.description === "string"
            ? patch.description.trim()
            : existing.description;

        ensureRelationTypeRegistered(args.db, {
          projectId: normalizedProjectId,
          relationType: nextType,
        });

        args.db
          .prepare(
            "UPDATE kg_relations SET source_entity_id = ?, target_entity_id = ?, relation_type = ?, description = ? WHERE id = ? AND project_id = ?",
          )
          .run(
            sourceEntity.id,
            targetEntity.id,
            nextType,
            nextDescription,
            normalizedId,
            normalizedProjectId,
          );

        const row = selectRelationById(args.db, normalizedId);
        if (!row) {
          return ipcError("DB_ERROR", "Failed to load updated relation");
        }

        return { ok: true, data: rowToRelation(row) };
      } catch (error) {
        args.logger.error("kg_relation_update_failed", {
          code: "DB_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return ipcError("DB_ERROR", "Failed to update relation");
      }
    },

    relationDelete: ({ projectId, id }) => {
      const invalidProjectId = validateProjectId(projectId);
      if (invalidProjectId) {
        return invalidProjectId;
      }
      if (id.trim().length === 0) {
        return ipcError("INVALID_ARGUMENT", "id is required");
      }

      const normalizedProjectId = projectId.trim();
      const normalizedId = id.trim();

      try {
        const projectExists = ensureProjectExists(args.db, normalizedProjectId);
        if (projectExists) {
          return projectExists;
        }

        const existing = selectRelationById(args.db, normalizedId);
        if (!existing || existing.projectId !== normalizedProjectId) {
          return ipcError("NOT_FOUND", "Relation not found");
        }

        args.db
          .prepare("DELETE FROM kg_relations WHERE project_id = ? AND id = ?")
          .run(normalizedProjectId, normalizedId);

        return { ok: true, data: { deleted: true } };
      } catch (error) {
        args.logger.error("kg_relation_delete_failed", {
          code: "DB_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return ipcError("DB_ERROR", "Failed to delete relation");
      }
    },

    querySubgraph: ({ projectId, centerEntityId, k }) => {
      const startedAt = Date.now();
      const invalidProjectId = validateProjectId(projectId);
      if (invalidProjectId) {
        return invalidProjectId;
      }
      if (centerEntityId.trim().length === 0) {
        return ipcError("INVALID_ARGUMENT", "centerEntityId is required");
      }
      if (!Number.isInteger(k) || k <= 0) {
        return ipcError("INVALID_ARGUMENT", "k must be a positive integer");
      }
      if (k > limits.subgraphMaxK) {
        return ipcError(
          "KG_SUBGRAPH_K_EXCEEDED",
          `k must be <= ${limits.subgraphMaxK}`,
          { maxK: limits.subgraphMaxK, requestedK: k },
        );
      }

      const normalizedProjectId = projectId.trim();
      const normalizedCenter = centerEntityId.trim();

      try {
        const projectExists = ensureProjectExists(args.db, normalizedProjectId);
        if (projectExists) {
          return projectExists;
        }

        const center = selectEntityById(args.db, normalizedCenter);
        if (!center || center.projectId !== normalizedProjectId) {
          return ipcError("NOT_FOUND", "center entity not found");
        }

        const entities = listProjectEntities(args.db, normalizedProjectId);
        const relations = listProjectRelations(args.db, normalizedProjectId);
        const adjacency = buildUndirectedAdjacency(relations);

        const visited = new Set<string>([normalizedCenter]);
        const queue: Array<{ entityId: string; depth: number }> = [
          { entityId: normalizedCenter, depth: 0 },
        ];

        while (queue.length > 0) {
          const head = queue.shift();
          if (!head) {
            break;
          }

          if (head.depth >= k) {
            continue;
          }

          const neighbors = adjacency.get(head.entityId) ?? [];
          for (const neighbor of neighbors) {
            if (visited.has(neighbor)) {
              continue;
            }
            visited.add(neighbor);
            queue.push({ entityId: neighbor, depth: head.depth + 1 });
          }
        }

        const selectedEntities = entities.filter((entity) =>
          visited.has(entity.id),
        );
        const selectedRelations = relations.filter(
          (relation) =>
            visited.has(relation.sourceEntityId) &&
            visited.has(relation.targetEntityId),
        );

        return {
          ok: true,
          data: {
            entities: selectedEntities,
            relations: selectedRelations,
            nodeCount: selectedEntities.length,
            edgeCount: selectedRelations.length,
            queryCostMs: Date.now() - startedAt,
          },
        };
      } catch (error) {
        args.logger.error("kg_query_subgraph_failed", {
          code: "DB_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return ipcError("DB_ERROR", "Failed to query subgraph");
      }
    },

    queryPath: ({ projectId, sourceEntityId, targetEntityId, timeoutMs }) => {
      const startedAt = Date.now();
      const invalidProjectId = validateProjectId(projectId);
      if (invalidProjectId) {
        return invalidProjectId;
      }

      const normalizedSource = sourceEntityId.trim();
      const normalizedTarget = targetEntityId.trim();
      if (normalizedSource.length === 0 || normalizedTarget.length === 0) {
        return ipcError(
          "INVALID_ARGUMENT",
          "sourceEntityId and targetEntityId are required",
        );
      }

      const effectiveTimeoutMs = timeoutMs ?? limits.queryTimeoutMs;
      if (effectiveTimeoutMs <= 0) {
        return ipcError("KG_QUERY_TIMEOUT", "query timeout", {
          timeoutMs: effectiveTimeoutMs,
          suggestion: "reduce graph scope or use keyword filtering",
        });
      }

      const normalizedProjectId = projectId.trim();

      try {
        const projectExists = ensureProjectExists(args.db, normalizedProjectId);
        if (projectExists) {
          return projectExists;
        }

        const source = selectEntityById(args.db, normalizedSource);
        const target = selectEntityById(args.db, normalizedTarget);
        if (
          !source ||
          !target ||
          source.projectId !== normalizedProjectId ||
          target.projectId !== normalizedProjectId
        ) {
          return ipcError("KG_RELATION_INVALID", "path endpoints are invalid", {
            sourceEntityId: normalizedSource,
            targetEntityId: normalizedTarget,
          });
        }

        const relations = listProjectRelations(args.db, normalizedProjectId);
        const adjacency = buildDirectedAdjacency(relations);

        const queue: string[] = [normalizedSource];
        const visited = new Set<string>([normalizedSource]);
        const previous = new Map<string, string>();

        let expansions = 0;
        let found = false;

        while (queue.length > 0) {
          if (Date.now() - startedAt > effectiveTimeoutMs) {
            return ipcError("KG_QUERY_TIMEOUT", "query timeout", {
              timeoutMs: effectiveTimeoutMs,
              expansions,
              suggestion: "reduce graph scope or use keyword filtering",
            });
          }

          const nodeId = queue.shift();
          if (!nodeId) {
            break;
          }

          expansions += 1;
          if (expansions > limits.pathExpansionLimit) {
            return ipcError("KG_QUERY_TIMEOUT", "query timeout", {
              expansions,
              maxExpansions: limits.pathExpansionLimit,
              suggestion: "reduce graph scope or use keyword filtering",
            });
          }

          if (nodeId === normalizedTarget) {
            found = true;
            break;
          }

          const neighbors = adjacency.get(nodeId) ?? [];
          for (const neighbor of neighbors) {
            if (visited.has(neighbor)) {
              continue;
            }
            visited.add(neighbor);
            previous.set(neighbor, nodeId);
            queue.push(neighbor);
          }
        }

        if (!found) {
          return {
            ok: true,
            data: {
              pathEntityIds: [],
              expansions,
              degraded: false,
              queryCostMs: Date.now() - startedAt,
            },
          };
        }

        const path: string[] = [];
        let cursor: string | undefined = normalizedTarget;
        while (cursor) {
          path.push(cursor);
          cursor = previous.get(cursor);
        }
        path.reverse();

        return {
          ok: true,
          data: {
            pathEntityIds: path,
            expansions,
            degraded: false,
            queryCostMs: Date.now() - startedAt,
          },
        };
      } catch (error) {
        args.logger.error("kg_query_path_failed", {
          code: "DB_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return ipcError("DB_ERROR", "Failed to query path");
      }
    },

    queryValidate: ({ projectId }) => {
      const startedAt = Date.now();
      const invalidProjectId = validateProjectId(projectId);
      if (invalidProjectId) {
        return invalidProjectId;
      }

      const normalizedProjectId = projectId.trim();

      try {
        const projectExists = ensureProjectExists(args.db, normalizedProjectId);
        if (projectExists) {
          return projectExists;
        }

        const relations = listProjectRelations(args.db, normalizedProjectId);
        const adjacency = buildDirectedAdjacency(relations);
        const cycles: string[][] = [];
        const cycleKeys = new Set<string>();

        const visited = new Set<string>();
        const stack = new Set<string>();
        const path: string[] = [];

        const walk = (nodeId: string): void => {
          visited.add(nodeId);
          stack.add(nodeId);
          path.push(nodeId);

          const neighbors = adjacency.get(nodeId) ?? [];
          for (const neighbor of neighbors) {
            if (!visited.has(neighbor)) {
              walk(neighbor);
              continue;
            }
            if (!stack.has(neighbor)) {
              continue;
            }

            const idx = path.lastIndexOf(neighbor);
            if (idx < 0) {
              continue;
            }
            const cycle = [...path.slice(idx), neighbor];
            const key = cycle.join("->");
            if (cycleKeys.has(key)) {
              continue;
            }

            cycleKeys.add(key);
            cycles.push(cycle);
          }

          stack.delete(nodeId);
          path.pop();
        };

        for (const nodeId of adjacency.keys()) {
          if (!visited.has(nodeId)) {
            walk(nodeId);
          }
        }

        return {
          ok: true,
          data: {
            cycles,
            queryCostMs: Date.now() - startedAt,
          },
        };
      } catch (error) {
        args.logger.error("kg_query_validate_failed", {
          code: "DB_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return ipcError("DB_ERROR", "Failed to validate graph");
      }
    },

    queryRelevant: ({ projectId, excerpt, maxEntities, entityIds }) => {
      const startedAt = Date.now();
      const invalidProjectId = validateProjectId(projectId);
      if (invalidProjectId) {
        return invalidProjectId;
      }

      const normalizedProjectId = projectId.trim();
      const normalizedExcerpt = excerpt.trim().toLowerCase();
      const normalizedEntityIds = dedupeIds(entityIds ?? []);
      const maxCount = resolveMaxEntities(maxEntities);

      if (process.env.CREONOW_KG_FORCE_RELEVANT_QUERY_FAIL === "1") {
        args.logger.error("kg_query_relevant_failed", {
          code: "KG_RELEVANT_QUERY_FAILED",
          project_id: normalizedProjectId,
        });
        return ipcError(
          "KG_RELEVANT_QUERY_FAILED",
          "relevant query unavailable",
          { projectId: normalizedProjectId },
        );
      }

      try {
        const projectExists = ensureProjectExists(args.db, normalizedProjectId);
        if (projectExists) {
          return projectExists;
        }

        let candidateEntities: KnowledgeEntity[] = [];
        if (normalizedEntityIds.length > 0) {
          const rows = listEntitiesByIds(args.db, normalizedEntityIds);
          const crossProjectIds = rows
            .filter((row) => row.projectId !== normalizedProjectId)
            .map((row) => row.id);

          if (crossProjectIds.length > 0) {
            args.logger.error("kg_scope_violation", {
              project_id: normalizedProjectId,
              foreign_entity_ids: crossProjectIds,
              reason: "query_relevant",
            });
            return ipcError(
              "KG_SCOPE_VIOLATION",
              "cross-project entity access denied",
              {
                projectId: normalizedProjectId,
                foreignEntityIds: crossProjectIds,
              },
            );
          }

          const rowById = new Map(rows.map((row) => [row.id, row.row]));
          candidateEntities = normalizedEntityIds
            .map((id) => {
              const row = rowById.get(id);
              return row ? rowToEntity(row) : null;
            })
            .filter((entity): entity is KnowledgeEntity => entity !== null);
        } else {
          candidateEntities = listProjectEntities(args.db, normalizedProjectId);
        }

        if (normalizedExcerpt.length === 0) {
          return {
            ok: true,
            data: {
              items: candidateEntities.slice(0, maxCount),
              queryCostMs: Date.now() - startedAt,
            },
          };
        }

        const excerptTokens = new Set(
          normalizeKeywordTokens(normalizedExcerpt),
        );
        const scored = candidateEntities
          .map((entity) => {
            let score = 0;
            const mentionIndex = normalizedExcerpt.indexOf(
              entity.name.toLowerCase(),
            );

            if (mentionIndex >= 0) {
              score += 100;
            }

            const textBlob = `${entity.description} ${Object.values(entity.attributes).join(" ")}`;
            const tokens = normalizeKeywordTokens(textBlob).slice(0, 24);
            for (const token of tokens) {
              if (
                excerptTokens.has(token) ||
                normalizedExcerpt.includes(token)
              ) {
                score += 8;
              }
            }

            return {
              entity,
              score,
              mentionIndex:
                mentionIndex >= 0 ? mentionIndex : Number.MAX_SAFE_INTEGER,
            };
          })
          .filter((item) => item.score > 0)
          .sort((a, b) => {
            if (b.score !== a.score) {
              return b.score - a.score;
            }
            if (a.mentionIndex !== b.mentionIndex) {
              return a.mentionIndex - b.mentionIndex;
            }
            return b.entity.updatedAt.localeCompare(a.entity.updatedAt);
          });

        return {
          ok: true,
          data: {
            items: scored.slice(0, maxCount).map((item) => item.entity),
            queryCostMs: Date.now() - startedAt,
          },
        };
      } catch (error) {
        args.logger.error("kg_query_relevant_failed", {
          code: "DB_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return ipcError("DB_ERROR", "Failed to query relevant entities");
      }
    },

    queryByIds: ({ projectId, entityIds }) => {
      const invalidProjectId = validateProjectId(projectId);
      if (invalidProjectId) {
        return invalidProjectId;
      }

      const normalizedProjectId = projectId.trim();
      const normalizedEntityIds = dedupeIds(entityIds);
      if (normalizedEntityIds.length === 0) {
        return { ok: true, data: { items: [] } };
      }

      try {
        const projectExists = ensureProjectExists(args.db, normalizedProjectId);
        if (projectExists) {
          return projectExists;
        }

        const rows = listEntitiesByIds(args.db, normalizedEntityIds);
        const crossProjectIds = rows
          .filter((row) => row.projectId !== normalizedProjectId)
          .map((row) => row.id);
        if (crossProjectIds.length > 0) {
          args.logger.error("kg_scope_violation", {
            project_id: normalizedProjectId,
            foreign_entity_ids: crossProjectIds,
            reason: "query_by_ids",
          });
          return ipcError(
            "KG_SCOPE_VIOLATION",
            "cross-project entity access denied",
            {
              projectId: normalizedProjectId,
              foreignEntityIds: crossProjectIds,
            },
          );
        }

        const rowById = new Map(rows.map((row) => [row.id, row.row]));
        const orderedItems = normalizedEntityIds
          .map((id) => {
            const row = rowById.get(id);
            return row ? rowToEntity(row) : null;
          })
          .filter((entity): entity is KnowledgeEntity => entity !== null);

        return { ok: true, data: { items: orderedItems } };
      } catch (error) {
        args.logger.error("kg_query_by_ids_failed", {
          code: "DB_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return ipcError("DB_ERROR", "Failed to query entities by ids");
      }
    },

    buildRulesInjection: ({
      projectId,
      documentId,
      excerpt,
      traceId,
      maxEntities,
      entityIds,
    }) => {
      const invalidProjectId = validateProjectId(projectId);
      if (invalidProjectId) {
        return invalidProjectId;
      }
      if (documentId.trim().length === 0) {
        return ipcError("INVALID_ARGUMENT", "documentId is required");
      }
      if (traceId.trim().length === 0) {
        return ipcError("INVALID_ARGUMENT", "traceId is required");
      }

      const normalizedProjectId = projectId.trim();
      const relevantRes = createKnowledgeGraphService({
        db: args.db,
        logger: args.logger,
      }).queryRelevant({
        projectId: normalizedProjectId,
        excerpt,
        maxEntities,
        entityIds,
      });

      if (!relevantRes.ok) {
        if (relevantRes.error.code === "KG_SCOPE_VIOLATION") {
          return relevantRes;
        }

        args.logger.error("kg_rules_injection_fallback", {
          code: relevantRes.error.code,
          trace_id: traceId,
          project_id: normalizedProjectId,
        });
        return {
          ok: true,
          data: {
            injectedEntities: [],
            source: "kg-rules-mock",
          },
        };
      }

      if (relevantRes.data.items.length === 0) {
        return {
          ok: true,
          data: {
            injectedEntities: [],
            source: "kg-rules-mock",
          },
        };
      }

      try {
        const entityNameById = new Map<string, string>();
        for (const entity of listProjectEntities(
          args.db,
          normalizedProjectId,
        )) {
          entityNameById.set(entity.id, entity.name);
        }

        const relations = listProjectRelations(args.db, normalizedProjectId);
        const injectedEntities: KgRulesInjectionEntity[] =
          relevantRes.data.items.map((entity) => {
            const attributes: Record<string, string> = {};
            for (const [rawKey, rawValue] of Object.entries(
              entity.attributes,
            )) {
              const key = rawKey.trim();
              const value = rawValue.trim();
              if (key.length === 0 || value.length === 0) {
                continue;
              }
              attributes[key] = value;
            }

            const relationsSummary: string[] = [];
            for (const relation of relations) {
              if (
                relation.sourceEntityId !== entity.id &&
                relation.targetEntityId !== entity.id
              ) {
                continue;
              }

              const sourceName =
                entityNameById.get(relation.sourceEntityId) ??
                relation.sourceEntityId;
              const targetName =
                entityNameById.get(relation.targetEntityId) ??
                relation.targetEntityId;
              relationsSummary.push(
                `${sourceName} -(${relation.relationType})-> ${targetName}`,
              );

              if (relationsSummary.length >= 8) {
                break;
              }
            }

            return {
              id: entity.id,
              name: entity.name,
              type: entity.type,
              attributes,
              relationsSummary,
            };
          });

        return {
          ok: true,
          data: {
            injectedEntities,
            source: "kg-rules-mock",
          },
        };
      } catch (error) {
        args.logger.error("kg_rules_injection_failed", {
          code: "DB_ERROR",
          trace_id: traceId,
          message: error instanceof Error ? error.message : String(error),
        });
        return ipcError("DB_ERROR", "Failed to build KG rules injection", {
          traceId,
        });
      }
    },
  };
}
