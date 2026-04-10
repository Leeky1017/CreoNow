import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";

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

describe("modelConfig", () => {
  it("returns AI_NOT_CONFIGURED when both models are missing", () => {
    const db = createSettingsDb();
    const service = createModelConfigService({ db });

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

    const service = createModelConfigService({ db });
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

    const service = createModelConfigService({ db });
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

    const service = createModelConfigService({ db });
    const result = service.resolve();
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected model config to resolve");
    }
    expect(result.data.primaryModel).toBe("gpt-4.1");
    expect(result.data.auxiliaryModel).toBe("gpt-4.1-mini");
    expect(result.data.sharedModel).toBe(false);
  });
});
