import fs from "node:fs";
import path from "node:path";

import type Database from "better-sqlite3";
import { afterEach, expect, it, vi } from "vitest";

import { closeDb, getDb } from "../connection";
import { initDb } from "../init";
import { initialSchemaMigration } from "../migrations/001_initial_schema";

afterEach(() => {
  closeDb();
  vi.restoreAllMocks();
});

it("DB-INIT-F1: clears singleton when TS bridge migration fails in initDb", () => {
  const userDataDir = path.join(
    import.meta.dirname,
    ".artifacts",
    "init-db-bridge-failure-test",
  );
  fs.rmSync(userDataDir, { recursive: true, force: true });
  fs.mkdirSync(userDataDir, { recursive: true });

  const migrationSpy = vi
    .spyOn(initialSchemaMigration, "up")
    .mockImplementation((_db: Database.Database) => {
      throw new Error("forced migration failure for DB-INIT-F1");
    });
  const infoSpy = vi.fn();
  const errorSpy = vi.fn();

  const logger = {
    logPath: path.join(userDataDir, "logs", "main.log"),
    info: infoSpy,
    error: errorSpy,
  };

  try {
    const result = initDb({ userDataDir, logger });
    expect(result.ok).toBe(false);
    expect(() => getDb()).toThrow(/not initialised/i);
    expect(
      infoSpy.mock.calls.some(([event]) => event === "db_ready"),
    ).toBe(false);
    expect(
      errorSpy.mock.calls.some(([event]) => event === "migration_failed"),
    ).toBe(true);
  } finally {
    migrationSpy.mockRestore();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
});
