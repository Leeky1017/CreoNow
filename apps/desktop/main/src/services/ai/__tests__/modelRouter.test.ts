import Database from "better-sqlite3";
import { describe, expect, it, vi } from "vitest";

import type { Logger } from "../../../logging/logger";
import { ipcError } from "../../shared/ipcResult";
import { createModelConfigService } from "../modelConfig";
import { createModelRouter } from "../modelRouter";

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

describe("modelRouter", () => {
  it("routes generation task to primary model", async () => {
    const db = createSettingsDb();
    putSetting(db, "creonow.ai.model.primary", "gpt-4.1");
    putSetting(db, "creonow.ai.model.auxiliary", "gpt-4.1-mini");

    const router = createModelRouter({
      modelConfigService: createModelConfigService({ db, logger: createLogger() }),
      resolveProvider: async () => ({
        ok: true,
        data: {
          primary: {
            provider: "openai",
            baseUrl: "https://api.openai.com",
            apiKey: "sk-test",
            timeoutMs: 30000,
          },
          backup: null,
        },
      }),
    });

    const result = await router.selectProvider({
      skillId: "builtin:continue",
      taskType: "generation",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected router to resolve provider");
    }
    expect(result.data.model).toBe("gpt-4.1");
    expect(result.data.taskType).toBe("generation");
  });

  it("routes auxiliary task to auxiliary model", async () => {
    const db = createSettingsDb();
    putSetting(db, "creonow.ai.model.primary", "gpt-4.1");
    putSetting(db, "creonow.ai.model.auxiliary", "gpt-4.1-mini");

    const router = createModelRouter({
      modelConfigService: createModelConfigService({ db, logger: createLogger() }),
      resolveProvider: async () => ({
        ok: true,
        data: {
          primary: {
            provider: "proxy",
            baseUrl: "https://proxy.example.com/v1",
            timeoutMs: 30000,
          },
          backup: null,
        },
      }),
    });

    const result = await router.selectProvider({
      skillId: "builtin:summarize",
      taskType: "auxiliary",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected router to resolve provider");
    }
    expect(result.data.model).toBe("gpt-4.1-mini");
    expect(result.data.taskType).toBe("auxiliary");
  });

  it("falls back to shared model when only one model configured", async () => {
    const db = createSettingsDb();
    putSetting(db, "creonow.ai.model.primary", "gpt-4o");

    const router = createModelRouter({
      modelConfigService: createModelConfigService({ db, logger: createLogger() }),
      resolveProvider: async () => ({
        ok: true,
        data: {
          primary: {
            provider: "openai",
            baseUrl: "https://api.openai.com",
            apiKey: "sk-test",
            timeoutMs: 30000,
          },
          backup: null,
        },
      }),
    });

    const result = await router.selectProvider({
      skillId: "builtin:classify",
      taskType: "auxiliary",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected router to resolve provider");
    }
    expect(result.data.model).toBe("gpt-4o");
  });

  it("infers auxiliary task from skillId hints", async () => {
    const db = createSettingsDb();
    putSetting(db, "creonow.ai.model.primary", "gpt-4.1");
    putSetting(db, "creonow.ai.model.auxiliary", "gpt-4.1-mini");

    const router = createModelRouter({
      modelConfigService: createModelConfigService({ db, logger: createLogger() }),
      resolveProvider: async () => ({
        ok: true,
        data: {
          primary: {
            provider: "openai",
            baseUrl: "https://api.openai.com",
            apiKey: "sk-test",
            timeoutMs: 30000,
          },
          backup: null,
        },
      }),
    });

    const result = await router.selectProvider({
      skillId: "builtin:summarize-chapter",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected router to resolve provider");
    }
    expect(result.data.model).toBe("gpt-4.1-mini");
    expect(result.data.taskType).toBe("auxiliary");
  });

  it("returns AI_NOT_CONFIGURED when no model is configured", async () => {
    const db = createSettingsDb();
    const router = createModelRouter({
      modelConfigService: createModelConfigService({ db, logger: createLogger() }),
      resolveProvider: async () => ({
        ok: true,
        data: {
          primary: {
            provider: "openai",
            baseUrl: "https://api.openai.com",
            apiKey: "sk-test",
            timeoutMs: 30000,
          },
          backup: null,
        },
      }),
    });

    const result = await router.selectProvider({
      skillId: "builtin:continue",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected missing model config to fail");
    }
    expect(result.error.code).toBe("AI_NOT_CONFIGURED");
  });

  it("propagates resolveProvider failure", async () => {
    const db = createSettingsDb();
    putSetting(db, "creonow.ai.model.primary", "gpt-4o");

    const router = createModelRouter({
      modelConfigService: createModelConfigService({ db, logger: createLogger() }),
      resolveProvider: async () =>
        ipcError("AI_NOT_CONFIGURED", "no provider configured"),
    });
    const result = await router.selectProvider({ skillId: "builtin:continue" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("AI_NOT_CONFIGURED");
    }
  });
});
