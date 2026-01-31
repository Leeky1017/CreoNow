import { randomUUID } from "node:crypto";

import type Database from "better-sqlite3";

import type {
  IpcError,
  IpcErrorCode,
} from "../../../../../../packages/shared/types/ipc-generated";
import type { Logger } from "../../logging/logger";

export type MemoryType = "preference" | "fact" | "note";
export type MemoryScope = "global" | "project";
export type MemoryOrigin = "manual" | "learned";

export type UserMemoryItem = {
  memoryId: string;
  type: MemoryType;
  scope: MemoryScope;
  projectId?: string;
  origin: MemoryOrigin;
  sourceRef?: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
};

export type MemorySettings = {
  injectionEnabled: boolean;
  preferenceLearningEnabled: boolean;
  privacyModeEnabled: boolean;
  preferenceLearningThreshold: number;
};

export type MemoryInjectionMode = "deterministic" | "semantic";

export type MemoryInjectionReason =
  | { kind: "deterministic" }
  | { kind: "semantic"; score: number };

export type MemoryInjectionItem = {
  id: string;
  type: MemoryType;
  scope: MemoryScope;
  origin: MemoryOrigin;
  content: string;
  reason: MemoryInjectionReason;
};

export type MemoryInjectionPreview = {
  items: MemoryInjectionItem[];
  mode: MemoryInjectionMode;
  diagnostics?: { degradedFrom: "semantic"; reason: string };
};

type Ok<T> = { ok: true; data: T };
type Err = { ok: false; error: IpcError };
export type ServiceResult<T> = Ok<T> | Err;

export type MemoryService = {
  create: (args: {
    type: MemoryType;
    scope: MemoryScope;
    projectId?: string;
    content: string;
  }) => ServiceResult<UserMemoryItem>;
  list: (args: {
    projectId?: string;
    includeDeleted?: boolean;
  }) => ServiceResult<{ items: UserMemoryItem[] }>;
  update: (args: {
    memoryId: string;
    patch: {
      type?: MemoryType;
      scope?: MemoryScope;
      projectId?: string;
      content?: string;
    };
  }) => ServiceResult<UserMemoryItem>;
  delete: (args: { memoryId: string }) => ServiceResult<{ deleted: true }>;
  getSettings: () => ServiceResult<MemorySettings>;
  updateSettings: (args: {
    patch: Partial<MemorySettings>;
  }) => ServiceResult<MemorySettings>;
  previewInjection: (args: {
    projectId?: string;
    queryText?: string;
  }) => ServiceResult<MemoryInjectionPreview>;
};

const SETTINGS_SCOPE = "app" as const;
const SETTINGS_PREFIX = "creonow.memory." as const;

const DEFAULT_SETTINGS: MemorySettings = {
  injectionEnabled: true,
  preferenceLearningEnabled: true,
  privacyModeEnabled: false,
  preferenceLearningThreshold: 3,
};

const SCOPE_RANK: Readonly<Record<MemoryScope, number>> = {
  project: 0,
  global: 1,
};

const TYPE_RANK: Readonly<Record<MemoryType, number>> = {
  preference: 0,
  fact: 1,
  note: 2,
};

function nowTs(): number {
  return Date.now();
}

/**
 * Build a stable IPC error object.
 *
 * Why: services must return deterministic error codes/messages for IPC tests.
 */
function ipcError(code: IpcErrorCode, message: string, details?: unknown): Err {
  return { ok: false, error: { code, message, details } };
}

function isMemoryType(x: string): x is MemoryType {
  return x === "preference" || x === "fact" || x === "note";
}

function isMemoryScope(x: string): x is MemoryScope {
  return x === "global" || x === "project";
}

function isMemoryOrigin(x: string): x is MemoryOrigin {
  return x === "manual" || x === "learned";
}

type MemoryRow = {
  memoryId: string;
  type: string;
  scope: string;
  projectId: string | null;
  origin: string;
  sourceRef: string | null;
  content: string;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
};

function rowToMemory(row: MemoryRow): ServiceResult<UserMemoryItem> {
  if (!isMemoryType(row.type)) {
    return ipcError("DB_ERROR", "Invalid memory type", { type: row.type });
  }
  if (!isMemoryScope(row.scope)) {
    return ipcError("DB_ERROR", "Invalid memory scope", { scope: row.scope });
  }
  if (!isMemoryOrigin(row.origin)) {
    return ipcError("DB_ERROR", "Invalid memory origin", { origin: row.origin });
  }

  return {
    ok: true,
    data: {
      memoryId: row.memoryId,
      type: row.type,
      scope: row.scope,
      projectId: row.projectId ?? undefined,
      origin: row.origin,
      sourceRef: row.sourceRef ?? undefined,
      content: row.content,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt ?? undefined,
    },
  };
}

function compareDeterministic(a: UserMemoryItem, b: UserMemoryItem): number {
  const scopeDiff = SCOPE_RANK[a.scope] - SCOPE_RANK[b.scope];
  if (scopeDiff !== 0) {
    return scopeDiff;
  }
  const typeDiff = TYPE_RANK[a.type] - TYPE_RANK[b.type];
  if (typeDiff !== 0) {
    return typeDiff;
  }
  if (a.updatedAt !== b.updatedAt) {
    return b.updatedAt - a.updatedAt;
  }
  return a.memoryId.localeCompare(b.memoryId);
}

/**
 * Deterministically sort memory items for list/preview.
 *
 * Why: injection preview MUST be fully deterministic for stable prompt caching
 * and Windows E2E assertions.
 */
export function deterministicMemorySort(
  items: readonly UserMemoryItem[],
): UserMemoryItem[] {
  return [...items].sort(compareDeterministic);
}

type SettingsRow = { valueJson: string };

function getSettingKey(name: keyof MemorySettings): string {
  return `${SETTINGS_PREFIX}${name}`;
}

function readSetting(db: Database.Database, key: string): unknown | null {
  const row = db
    .prepare<[string, string], SettingsRow>(
      "SELECT value_json as valueJson FROM settings WHERE scope = ? AND key = ?",
    )
    .get(SETTINGS_SCOPE, key);
  if (!row) {
    return null;
  }
  try {
    return JSON.parse(row.valueJson) as unknown;
  } catch {
    return null;
  }
}

function readBoolSetting(
  db: Database.Database,
  key: string,
  fallback: boolean,
): boolean {
  const value = readSetting(db, key);
  return typeof value === "boolean" ? value : fallback;
}

function readNumberSetting(
  db: Database.Database,
  key: string,
  fallback: number,
): number {
  const value = readSetting(db, key);
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function writeSetting(
  db: Database.Database,
  key: string,
  value: boolean | number,
  ts: number,
): void {
  db.prepare(
    "INSERT INTO settings (scope, key, value_json, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(scope, key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at",
  ).run(SETTINGS_SCOPE, key, JSON.stringify(value), ts);
}

function selectMemoryById(
  db: Database.Database,
  memoryId: string,
): MemoryRow | undefined {
  return db
    .prepare<[string], MemoryRow>(
      "SELECT memory_id as memoryId, type, scope, project_id as projectId, origin, source_ref as sourceRef, content, created_at as createdAt, updated_at as updatedAt, deleted_at as deletedAt FROM user_memory WHERE memory_id = ?",
    )
    .get(memoryId);
}

/**
 * Create a MemoryService backed by SQLite (SSOT).
 */
export function createMemoryService(args: {
  db: Database.Database;
  logger: Logger;
}): MemoryService {
  function getSettings(): ServiceResult<MemorySettings> {
    try {
      return {
        ok: true,
        data: {
          injectionEnabled: readBoolSetting(
            args.db,
            getSettingKey("injectionEnabled"),
            DEFAULT_SETTINGS.injectionEnabled,
          ),
          preferenceLearningEnabled: readBoolSetting(
            args.db,
            getSettingKey("preferenceLearningEnabled"),
            DEFAULT_SETTINGS.preferenceLearningEnabled,
          ),
          privacyModeEnabled: readBoolSetting(
            args.db,
            getSettingKey("privacyModeEnabled"),
            DEFAULT_SETTINGS.privacyModeEnabled,
          ),
          preferenceLearningThreshold: readNumberSetting(
            args.db,
            getSettingKey("preferenceLearningThreshold"),
            DEFAULT_SETTINGS.preferenceLearningThreshold,
          ),
        },
      };
    } catch (error) {
      return ipcError(
        "DB_ERROR",
        "Failed to read memory settings",
        error instanceof Error ? { message: error.message } : { error },
      );
    }
  }

  function updateSettings(args2: {
    patch: Partial<MemorySettings>;
  }): ServiceResult<MemorySettings> {
    const keys = Object.keys(args2.patch) as Array<keyof MemorySettings>;
    if (keys.length === 0) {
      return ipcError("INVALID_ARGUMENT", "patch is required");
    }

    const threshold = args2.patch.preferenceLearningThreshold;
    if (
      typeof threshold === "number" &&
      (!Number.isFinite(threshold) ||
        !Number.isInteger(threshold) ||
        threshold < 1 ||
        threshold > 100)
    ) {
      return ipcError(
        "INVALID_ARGUMENT",
        "preferenceLearningThreshold must be an integer between 1 and 100",
      );
    }

    const ts = nowTs();
    try {
      args.db.transaction(() => {
        for (const key of keys) {
          const value = args2.patch[key];
          if (typeof value !== "boolean" && typeof value !== "number") {
            throw new Error(`Invalid setting value for ${String(key)}`);
          }
          writeSetting(args.db, getSettingKey(key), value, ts);
        }
      })();
    } catch (error) {
      args.logger.error("memory_settings_update_failed", {
        code: "DB_ERROR",
        message: error instanceof Error ? error.message : String(error),
      });
      return ipcError("DB_ERROR", "Failed to update memory settings");
    }

    return getSettings();
  }

  return {
    getSettings,
    updateSettings,

    create: ({ type, scope, projectId, content }) => {
      if (!isMemoryType(type)) {
        return ipcError("INVALID_ARGUMENT", "type is invalid");
      }
      if (!isMemoryScope(scope)) {
        return ipcError("INVALID_ARGUMENT", "scope is invalid");
      }
      if (content.trim().length === 0) {
        return ipcError("INVALID_ARGUMENT", "content is required");
      }
      if (scope === "project" && (!projectId || projectId.trim().length === 0)) {
        return ipcError("INVALID_ARGUMENT", "projectId is required for project scope");
      }

      const memoryId = randomUUID();
      const ts = nowTs();
      const scopedProjectId = scope === "project" ? projectId!.trim() : null;

      try {
        args.db
          .prepare(
            "INSERT INTO user_memory (memory_id, type, scope, project_id, origin, source_ref, content, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, 'manual', NULL, ?, ?, ?, NULL)",
          )
          .run(memoryId, type, scope, scopedProjectId, content.trim(), ts, ts);

        args.logger.info("memory_create", {
          memory_id: memoryId,
          type,
          scope,
          origin: "manual",
          content_len: content.trim().length,
        });
      } catch (error) {
        args.logger.error("memory_create_failed", {
          code: "DB_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return ipcError("DB_ERROR", "Failed to create memory");
      }

      const row = selectMemoryById(args.db, memoryId);
      if (!row) {
        return ipcError("DB_ERROR", "Failed to load created memory");
      }
      return rowToMemory(row);
    },

    list: ({ projectId, includeDeleted }) => {
      const scopedProjectId =
        typeof projectId === "string" && projectId.trim().length > 0
          ? projectId.trim()
          : null;
      const whereDeleted = includeDeleted ? "" : "AND deleted_at IS NULL";
      const whereProject = scopedProjectId
        ? "AND (scope = 'global' OR (scope = 'project' AND project_id = ?))"
        : "AND scope = 'global'";

      try {
        const stmt = args.db.prepare<unknown[], MemoryRow>(
          `SELECT memory_id as memoryId, type, scope, project_id as projectId, origin, source_ref as sourceRef, content, created_at as createdAt, updated_at as updatedAt, deleted_at as deletedAt
           FROM user_memory
           WHERE 1=1 ${whereDeleted} ${whereProject}`,
        );
        const rows = scopedProjectId ? stmt.all(scopedProjectId) : stmt.all();

        const parsed: UserMemoryItem[] = [];
        for (const row of rows) {
          const mapped = rowToMemory(row);
          if (!mapped.ok) {
            return mapped;
          }
          parsed.push(mapped.data);
        }
        return { ok: true, data: { items: deterministicMemorySort(parsed) } };
      } catch (error) {
        args.logger.error("memory_list_failed", {
          code: "DB_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return ipcError("DB_ERROR", "Failed to list memories");
      }
    },

    update: ({ memoryId, patch }) => {
      if (memoryId.trim().length === 0) {
        return ipcError("INVALID_ARGUMENT", "memoryId is required");
      }
      if (Object.keys(patch).length === 0) {
        return ipcError("INVALID_ARGUMENT", "patch is required");
      }

      const existing = selectMemoryById(args.db, memoryId);
      if (!existing) {
        return ipcError("NOT_FOUND", "Memory not found", { memoryId });
      }
      const parsed = rowToMemory(existing);
      if (!parsed.ok) {
        return parsed;
      }

      const current = parsed.data;
      const nextType = patch.type ?? current.type;
      const nextScope = patch.scope ?? current.scope;
      const nextContent = patch.content ?? current.content;
      const nextProjectId =
        nextScope === "project"
          ? (patch.projectId ?? current.projectId)
          : null;

      if (!isMemoryType(nextType)) {
        return ipcError("INVALID_ARGUMENT", "type is invalid");
      }
      if (!isMemoryScope(nextScope)) {
        return ipcError("INVALID_ARGUMENT", "scope is invalid");
      }
      if (nextContent.trim().length === 0) {
        return ipcError("INVALID_ARGUMENT", "content is required");
      }
      if (nextScope === "project" && (!nextProjectId || nextProjectId.trim().length === 0)) {
        return ipcError("INVALID_ARGUMENT", "projectId is required for project scope");
      }

      const ts = nowTs();
      try {
        args.db
          .prepare(
            "UPDATE user_memory SET type = ?, scope = ?, project_id = ?, content = ?, updated_at = ? WHERE memory_id = ?",
          )
          .run(
            nextType,
            nextScope,
            nextScope === "project" ? nextProjectId!.trim() : null,
            nextContent.trim(),
            ts,
            memoryId,
          );

        args.logger.info("memory_update", {
          memory_id: memoryId,
          type: nextType,
          scope: nextScope,
          origin: current.origin,
          content_len: nextContent.trim().length,
        });
      } catch (error) {
        args.logger.error("memory_update_failed", {
          code: "DB_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return ipcError("DB_ERROR", "Failed to update memory");
      }

      const updated = selectMemoryById(args.db, memoryId);
      if (!updated) {
        return ipcError("DB_ERROR", "Failed to load updated memory");
      }
      return rowToMemory(updated);
    },

    delete: ({ memoryId }) => {
      if (memoryId.trim().length === 0) {
        return ipcError("INVALID_ARGUMENT", "memoryId is required");
      }

      const row = args.db
        .prepare<[string], { deletedAt: number | null }>(
          "SELECT deleted_at as deletedAt FROM user_memory WHERE memory_id = ?",
        )
        .get(memoryId);
      if (!row) {
        return ipcError("NOT_FOUND", "Memory not found", { memoryId });
      }

      const ts = nowTs();
      try {
        if (row.deletedAt === null) {
          args.db
            .prepare(
              "UPDATE user_memory SET deleted_at = ?, updated_at = ? WHERE memory_id = ?",
            )
            .run(ts, ts, memoryId);
        }

        args.logger.info("memory_delete", { memory_id: memoryId });
        return { ok: true, data: { deleted: true } };
      } catch (error) {
        args.logger.error("memory_delete_failed", {
          code: "DB_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return ipcError("DB_ERROR", "Failed to delete memory");
      }
    },

    previewInjection: ({ projectId, queryText }) => {
      const settings = getSettings();
      if (!settings.ok) {
        return settings;
      }

      if (!settings.data.injectionEnabled) {
        args.logger.info("memory_injection_preview", {
          mode: "deterministic",
          count: 0,
          disabled: true,
        });
        return { ok: true, data: { items: [], mode: "deterministic" } };
      }

      const scopedProjectId =
        typeof projectId === "string" && projectId.trim().length > 0
          ? projectId.trim()
          : null;
      const whereProject = scopedProjectId
        ? "AND (scope = 'global' OR (scope = 'project' AND project_id = ?))"
        : "AND scope = 'global'";

      try {
        const stmt = args.db.prepare<unknown[], MemoryRow>(
          `SELECT memory_id as memoryId, type, scope, project_id as projectId, origin, source_ref as sourceRef, content, created_at as createdAt, updated_at as updatedAt, deleted_at as deletedAt
           FROM user_memory
           WHERE deleted_at IS NULL ${whereProject}`,
        );
        const rows = scopedProjectId ? stmt.all(scopedProjectId) : stmt.all();

        const parsed: UserMemoryItem[] = [];
        for (const row of rows) {
          const mapped = rowToMemory(row);
          if (!mapped.ok) {
            return mapped;
          }
          parsed.push(mapped.data);
        }

        const sorted = deterministicMemorySort(parsed);
        const items: MemoryInjectionItem[] = sorted.map((item) => ({
          id: item.memoryId,
          type: item.type,
          scope: item.scope,
          origin: item.origin,
          content: item.content,
          reason: { kind: "deterministic" },
        }));

        const diagnostics: MemoryInjectionPreview["diagnostics"] =
          typeof queryText === "string" && queryText.trim().length > 0
            ? { degradedFrom: "semantic", reason: "semantic_recall_unavailable" }
            : undefined;

        args.logger.info("memory_injection_preview", {
          mode: "deterministic",
          count: items.length,
        });
        return { ok: true, data: { items, mode: "deterministic", diagnostics } };
      } catch (error) {
        args.logger.error("memory_injection_preview_failed", {
          code: "DB_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return ipcError("DB_ERROR", "Failed to preview memory injection");
      }
    },
  };
}

/**
 * Format memory items into a stable injection block.
 *
 * Why: when injection is disabled we still need a stable placeholder that can
 * be asserted in E2E and does not break prompt caching boundaries.
 */
export function formatMemoryInjectionBlock(args: {
  items: readonly Pick<MemoryInjectionItem, "type" | "scope" | "content">[];
}): string {
  const header = "=== CREONOW_MEMORY_START ===";
  const footer = "=== CREONOW_MEMORY_END ===";

  const lines = args.items.map((item) => {
    const tag = `${item.scope}/${item.type}`;
    return `- (${tag}) ${item.content}`;
  });

  return [header, ...lines, footer].join("\n");
}
