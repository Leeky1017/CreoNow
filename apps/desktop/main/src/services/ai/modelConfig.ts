/**
 * @module modelConfig
 * ## 职责：从 settings 表读取 primary/auxiliary 模型配置并解析为路由可用结构
 * ## 不做什么：不做 provider 解析、不做网络请求
 * ## 依赖方向：ai → shared(ipcResult)
 * ## 关键不变量：INV-10（配置损坏需保留错误上下文）
 */

import type Database from "better-sqlite3";

import type { Logger } from "../../logging/logger";
import { ipcError, type ServiceResult } from "../shared/ipcResult";

const SETTINGS_SCOPE = "app" as const;
const KEY_PRIMARY_MODEL = "creonow.ai.model.primary" as const;
const KEY_AUXILIARY_MODEL = "creonow.ai.model.auxiliary" as const;

type SettingsRow = { valueJson: string };

export type ModelConfig = {
  primaryModel: string | null;
  auxiliaryModel: string | null;
};

export type ResolvedModelConfig = {
  primaryModel: string;
  auxiliaryModel: string;
  sharedModel: boolean;
};

export type ModelConfigService = {
  readRaw: () => ModelConfig;
  resolve: () => ServiceResult<ResolvedModelConfig>;
};

function readSetting(args: {
  db: Database.Database;
  logger: Logger;
  key: string;
}): unknown {
  const { db, logger, key } = args;
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
  } catch (error) {
    logger.error("settings_json_parse_failed", {
      key,
      reason: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

function normalizeModel(raw: unknown): string | null {
  if (typeof raw !== "string") {
    return null;
  }
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function createModelConfigService(args: {
  db: Database.Database;
  logger: Logger;
}): ModelConfigService {
  function readRaw(): ModelConfig {
    return {
      primaryModel: normalizeModel(
        readSetting({
          db: args.db,
          logger: args.logger,
          key: KEY_PRIMARY_MODEL,
        }),
      ),
      auxiliaryModel: normalizeModel(
        readSetting({
          db: args.db,
          logger: args.logger,
          key: KEY_AUXILIARY_MODEL,
        }),
      ),
    };
  }

  function resolve(): ServiceResult<ResolvedModelConfig> {
    const raw = readRaw();
    const primary = raw.primaryModel;
    const auxiliary = raw.auxiliaryModel;

    if (!primary && !auxiliary) {
      return ipcError(
        "AI_NOT_CONFIGURED",
        "AI model is not configured. Set creonow.ai.model.primary or creonow.ai.model.auxiliary in Settings.",
      );
    }

    if (primary && auxiliary) {
      return {
        ok: true,
        data: {
          primaryModel: primary,
          auxiliaryModel: auxiliary,
          sharedModel: primary === auxiliary,
        },
      };
    }

    // After the two guards above, exactly one of primary/auxiliary is non-null.
    const shared = (primary ?? auxiliary)!;

    return {
      ok: true,
      data: {
        primaryModel: shared,
        auxiliaryModel: shared,
        sharedModel: true,
      },
    };
  }

  return {
    readRaw,
    resolve,
  };
}
