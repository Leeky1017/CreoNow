import Database from "better-sqlite3";
import { describe, expect, it, vi } from "vitest";

import type { Logger } from "../../../logging/logger";
import { createModelConfigService } from "../modelConfig";

function createSettingsDb(): Database.Database {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE settings (
      scope TEXT NOT NULL,
      key TEXT NOT NULL,
      value_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (scope, key)
    )
  `);
  return db;
}

function putSetting(db: Database.Database, key: string, value: unknown): void {
  db.prepare(
    "INSERT INTO settings (scope, key, value_json, updated_at) VALUES (?, ?, ?, ?)",
  ).run("app", key, JSON.stringify(value), Date.now());
}

function createLogger(): Logger {
  return {
    logPath: "<test>",
    info: vi.fn(),
    error: vi.fn(),
  };
}

describe("modelConfig", () => {
  it("returns AI_NOT_CONFIGURED when both models are missing", () => {
    const db = createSettingsDb();
    const service = createModelConfigService({ db, logger: createLogger() });

    const result = service.resolve();
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected missing model config to fail");
    }
    expect(result.error.code).toBe("AI_NOT_CONFIGURED");
  });

  it("uses single primary model for all tasks when auxiliary is missing", () => {
    const db = createSettingsDb();
    putSetting(db, "creonow.ai.model.primary", "gpt-4o");

    const service = createModelConfigService({ db, logger: createLogger() });
    const result = service.resolve();
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected model config to resolve");
    }
    expect(result.data.primaryModel).toBe("gpt-4o");
    expect(result.data.auxiliaryModel).toBe("gpt-4o");
    expect(result.data.sharedModel).toBe(true);
  });

  it("uses single auxiliary model for all tasks when primary is missing", () => {
    const db = createSettingsDb();
    putSetting(db, "creonow.ai.model.auxiliary", "gpt-4o-mini");

    const service = createModelConfigService({ db, logger: createLogger() });
    const result = service.resolve();
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected model config to resolve");
    }
    expect(result.data.primaryModel).toBe("gpt-4o-mini");
    expect(result.data.auxiliaryModel).toBe("gpt-4o-mini");
    expect(result.data.sharedModel).toBe(true);
  });

  it("keeps primary and auxiliary models independent when both configured", () => {
    const db = createSettingsDb();
    putSetting(db, "creonow.ai.model.primary", "gpt-4.1");
    putSetting(db, "creonow.ai.model.auxiliary", "gpt-4.1-mini");

    const service = createModelConfigService({ db, logger: createLogger() });
    const result = service.resolve();
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected model config to resolve");
    }
    expect(result.data.primaryModel).toBe("gpt-4.1");
    expect(result.data.auxiliaryModel).toBe("gpt-4.1-mini");
    expect(result.data.sharedModel).toBe(false);
  });

  it("logs parse failure and treats corrupted JSON as missing", () => {
    const db = createSettingsDb();
    db.prepare(
      "INSERT INTO settings (scope, key, value_json, updated_at) VALUES (?, ?, ?, ?)",
    ).run("app", "creonow.ai.model.primary", "{\"broken\":", Date.now());
    putSetting(db, "creonow.ai.model.auxiliary", "gpt-4o-mini");

    const logger = createLogger();
    const service = createModelConfigService({ db, logger });
    const result = service.resolve();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected fallback to auxiliary model");
    }
    expect(result.data.primaryModel).toBe("gpt-4o-mini");
    expect(result.data.sharedModel).toBe(true);
    expect(logger.error).toHaveBeenCalledWith(
      "settings_json_parse_failed",
      expect.objectContaining({
        key: "creonow.ai.model.primary",
      }),
    );
  });
});
