import type Database from "better-sqlite3";

import { ipcError, type ServiceResult } from "../shared/ipcResult";

const SETTINGS_SCOPE = "app" as const;
const KEY_PRIMARY_MODEL = "creonow.ai.model.primary" as const;
const KEY_AUXILIARY_MODEL = "creonow.ai.model.auxiliary" as const;

type SettingsRow = { valueJson: string };

export type ModelConfig = {
  primary_model: string | null;
  auxiliary_model: string | null;
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

function normalizeModel(raw: unknown): string | null {
  if (typeof raw !== "string") {
    return null;
  }
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function createModelConfigService(args: {
  db: Database.Database;
}): ModelConfigService {
  function readRaw(): ModelConfig {
    return {
      primary_model: normalizeModel(readSetting(args.db, KEY_PRIMARY_MODEL)),
      auxiliary_model: normalizeModel(readSetting(args.db, KEY_AUXILIARY_MODEL)),
    };
  }

  function resolve(): ServiceResult<ResolvedModelConfig> {
    const raw = readRaw();
    const primary = raw.primary_model;
    const auxiliary = raw.auxiliary_model;

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

    const shared = primary ?? auxiliary;
    if (!shared) {
      return ipcError("INTERNAL", "Resolved model config unexpectedly empty");
    }

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
