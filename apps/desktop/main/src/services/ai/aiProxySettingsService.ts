import type Database from "better-sqlite3";

import type {
  IpcError,
  IpcErrorCode,
} from "../../../../../../packages/shared/types/ipc-generated";
import type { Logger } from "../../logging/logger";

type Ok<T> = { ok: true; data: T };
type Err = { ok: false; error: IpcError };
export type ServiceResult<T> = Ok<T> | Err;

export type AiProxySettings = {
  enabled: boolean;
  baseUrl: string;
  apiKeyConfigured: boolean;
};

export type AiProxySettingsRaw = {
  enabled: boolean;
  baseUrl: string | null;
  apiKey: string | null;
};

export type AiProxySettingsService = {
  get: () => ServiceResult<AiProxySettings>;
  getRaw: () => ServiceResult<AiProxySettingsRaw>;
  update: (args: {
    patch: Partial<{ enabled: boolean; baseUrl: string; apiKey: string }>;
  }) => ServiceResult<AiProxySettings>;
  test: () => Promise<
    ServiceResult<{
      ok: boolean;
      latencyMs: number;
      error?: { code: IpcErrorCode; message: string };
    }>
  >;
};

const SETTINGS_SCOPE = "app" as const;
const KEY_ENABLED = "creonow.ai.proxy.enabled" as const;
const KEY_BASE_URL = "creonow.ai.proxy.baseUrl" as const;
const KEY_API_KEY = "creonow.ai.proxy.apiKey" as const;

function nowTs(): number {
  return Date.now();
}

/**
 * Build a stable IPC error object.
 *
 * Why: proxy errors must be deterministic and must not leak secrets.
 */
function ipcError(code: IpcErrorCode, message: string, details?: unknown): Err {
  return { ok: false, error: { code, message, details } };
}

type SettingsRow = { valueJson: string };

function readSetting(db: Database.Database, key: string): unknown | null {
  const row = db
    .prepare<
      [string, string],
      SettingsRow
    >("SELECT value_json as valueJson FROM settings WHERE scope = ? AND key = ?")
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

function writeSetting(
  db: Database.Database,
  key: string,
  value: unknown,
  ts: number,
): void {
  db.prepare(
    "INSERT INTO settings (scope, key, value_json, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(scope, key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at",
  ).run(SETTINGS_SCOPE, key, JSON.stringify(value), ts);
}

function normalizeBaseUrl(raw: unknown): string | null {
  if (typeof raw !== "string") {
    return null;
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return null;
  }
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return trimmed;
  } catch {
    return null;
  }
}

function normalizeApiKey(raw: unknown): string | null {
  if (typeof raw !== "string") {
    return null;
  }
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readRawSettings(db: Database.Database): AiProxySettingsRaw {
  const enabled = readSetting(db, KEY_ENABLED);
  const baseUrl = readSetting(db, KEY_BASE_URL);
  const apiKey = readSetting(db, KEY_API_KEY);

  return {
    enabled: enabled === true,
    baseUrl: normalizeBaseUrl(baseUrl),
    apiKey: normalizeApiKey(apiKey),
  };
}

function toPublic(raw: AiProxySettingsRaw): AiProxySettings {
  return {
    enabled: raw.enabled,
    baseUrl: raw.baseUrl ?? "",
    apiKeyConfigured: typeof raw.apiKey === "string" && raw.apiKey.length > 0,
  };
}

/**
 * Create an AI proxy settings service backed by the main SQLite DB.
 */
export function createAiProxySettingsService(deps: {
  db: Database.Database;
  logger: Logger;
}): AiProxySettingsService {
  function getRaw(): ServiceResult<AiProxySettingsRaw> {
    try {
      return { ok: true, data: readRawSettings(deps.db) };
    } catch (error) {
      deps.logger.error("ai_proxy_settings_get_failed", {
        code: "DB_ERROR",
        message: error instanceof Error ? error.message : String(error),
      });
      return ipcError("DB_ERROR", "Failed to read proxy settings");
    }
  }

  function get(): ServiceResult<AiProxySettings> {
    const raw = getRaw();
    return raw.ok ? { ok: true, data: toPublic(raw.data) } : raw;
  }

  function update(args: {
    patch: Partial<{ enabled: boolean; baseUrl: string; apiKey: string }>;
  }): ServiceResult<AiProxySettings> {
    const patchKeys = Object.keys(args.patch);
    if (patchKeys.length === 0) {
      return ipcError("INVALID_ARGUMENT", "patch is required");
    }

    const existing = getRaw();
    if (!existing.ok) {
      return existing;
    }

    const next: AiProxySettingsRaw = {
      enabled: args.patch.enabled ?? existing.data.enabled,
      baseUrl:
        typeof args.patch.baseUrl === "string"
          ? normalizeBaseUrl(args.patch.baseUrl)
          : existing.data.baseUrl,
      apiKey:
        typeof args.patch.apiKey === "string"
          ? normalizeApiKey(args.patch.apiKey)
          : existing.data.apiKey,
    };

    if (next.enabled && !next.baseUrl) {
      return ipcError(
        "INVALID_ARGUMENT",
        "proxy baseUrl is required when proxy enabled",
      );
    }

    const ts = nowTs();
    try {
      deps.db.transaction(() => {
        if (typeof args.patch.enabled === "boolean") {
          writeSetting(deps.db, KEY_ENABLED, next.enabled, ts);
        }
        if (typeof args.patch.baseUrl === "string") {
          writeSetting(deps.db, KEY_BASE_URL, next.baseUrl ?? "", ts);
        }
        if (typeof args.patch.apiKey === "string") {
          writeSetting(deps.db, KEY_API_KEY, next.apiKey ?? "", ts);
        }
      })();

      deps.logger.info("ai_proxy_settings_updated", {
        enabled: next.enabled,
        baseUrlConfigured: typeof next.baseUrl === "string",
        apiKeyConfigured: typeof next.apiKey === "string",
      });

      return { ok: true, data: toPublic(next) };
    } catch (error) {
      deps.logger.error("ai_proxy_settings_update_failed", {
        code: "DB_ERROR",
        message: error instanceof Error ? error.message : String(error),
      });
      return ipcError("DB_ERROR", "Failed to update proxy settings");
    }
  }

  async function testProxy(): Promise<
    ServiceResult<{
      ok: boolean;
      latencyMs: number;
      error?: { code: IpcErrorCode; message: string };
    }>
  > {
    const raw = getRaw();
    if (!raw.ok) {
      return raw;
    }
    if (!raw.data.enabled) {
      return {
        ok: true,
        data: {
          ok: false,
          latencyMs: 0,
          error: { code: "INVALID_ARGUMENT", message: "proxy is disabled" },
        },
      };
    }
    if (!raw.data.baseUrl) {
      return {
        ok: true,
        data: {
          ok: false,
          latencyMs: 0,
          error: {
            code: "INVALID_ARGUMENT",
            message: "proxy baseUrl is missing",
          },
        },
      };
    }

    const start = nowTs();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2_000);
    try {
      const url = new URL("/v1/models", raw.data.baseUrl).toString();
      const res = await fetch(url, {
        method: "GET",
        headers: raw.data.apiKey
          ? { Authorization: `Bearer ${raw.data.apiKey}` }
          : {},
        signal: controller.signal,
      });

      const latencyMs = nowTs() - start;
      if (res.ok) {
        return { ok: true, data: { ok: true, latencyMs } };
      }

      if (res.status === 401) {
        return {
          ok: true,
          data: {
            ok: false,
            latencyMs,
            error: { code: "PERMISSION_DENIED", message: "Proxy unauthorized" },
          },
        };
      }
      if (res.status === 429) {
        return {
          ok: true,
          data: {
            ok: false,
            latencyMs,
            error: { code: "RATE_LIMITED", message: "Proxy rate limited" },
          },
        };
      }
      return {
        ok: true,
        data: {
          ok: false,
          latencyMs,
          error: { code: "UPSTREAM_ERROR", message: "Proxy request failed" },
        },
      };
    } catch (error) {
      const latencyMs = nowTs() - start;
      return {
        ok: true,
        data: {
          ok: false,
          latencyMs,
          error: {
            code: controller.signal.aborted ? "TIMEOUT" : "UPSTREAM_ERROR",
            message: controller.signal.aborted
              ? "Proxy request timed out"
              : error instanceof Error
                ? error.message
                : String(error),
          },
        },
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  return { get, getRaw, update, test: testProxy };
}
