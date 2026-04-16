import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";

import {
  buildAiPersonaMemoryOverlay,
  createAiPersonaService,
} from "../aiPersonaService";
import type { DbLike } from "../dbTypes";

function createDb(): Database.Database {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE settings (
      scope TEXT NOT NULL,
      key TEXT NOT NULL,
      value_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (scope, key)
    );
  `);
  return db;
}

describe("aiPersonaService", () => {
  let db: Database.Database | null = null;

  afterEach(() => {
    db?.close();
    db = null;
  });

  it("uses default humor=true when setting is missing", () => {
    db = createDb();
    const service = createAiPersonaService({ db: db as unknown as DbLike });

    const config = service.getConfig();
    expect(config.humorEnabled).toBe(true);
    expect(service.buildMemoryOverlay()).toContain("humor: contextual");
    expect(service.buildMemoryOverlay()).toContain("humor_switch: enabled");
  });

  it("reads ai.persona.humor from settings", () => {
    db = createDb();
    db.prepare(
      "INSERT INTO settings (scope, key, value_json, updated_at) VALUES (?, ?, ?, ?)",
    ).run("app", "ai.persona.humor", JSON.stringify(false), Date.now());

    const service = createAiPersonaService({ db: db as unknown as DbLike });
    const config = service.getConfig();

    expect(config.humorEnabled).toBe(false);
    const overlay = service.buildMemoryOverlay();
    expect(overlay).toContain("humor_switch: disabled");
    expect(overlay).toContain("执行约束：");
  });

  it("falls back to default when settings row is invalid JSON", () => {
    db = createDb();
    db.prepare(
      "INSERT INTO settings (scope, key, value_json, updated_at) VALUES (?, ?, ?, ?)",
    ).run("app", "ai.persona.humor", "{invalid", Date.now());

    const service = createAiPersonaService({ db: db as unknown as DbLike });
    expect(service.getConfig().humorEnabled).toBe(true);
  });

  it("renders deterministic default overlay text", () => {
    const overlay = buildAiPersonaMemoryOverlay({
      humorEnabled: true,
    });
    expect(overlay).toContain("[AI 人格模板 · Memory L0]");
    expect(overlay).toContain("tone: collaborative");
    expect(overlay).toContain("assertiveness: moderate");
    expect(overlay).toContain("humility: high");
    expect(overlay).toContain("never:");
    expect(overlay).toContain("无条件赞美用户的每一个决策");
  });
});
