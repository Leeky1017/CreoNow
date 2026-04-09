import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";
import { afterEach, expect, it, vi } from "vitest";

import { closeDb, getDb, setDbInstance } from "../connection";
import { initDb } from "../init";
import { initialSchemaMigration } from "../migrations/001_initial_schema";

type MigrationDb = Parameters<typeof initialSchemaMigration.up>[0];

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
    .mockImplementation((_db: MigrationDb) => {
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

it("DB-INIT-F2: keeps prior healthy singleton when a retry initDb attempt fails", () => {
  const userDataDir = path.join(
    import.meta.dirname,
    ".artifacts",
    "init-db-bridge-failure-with-existing-singleton-test",
  );
  fs.rmSync(userDataDir, { recursive: true, force: true });
  fs.mkdirSync(userDataDir, { recursive: true });

  const healthyDb = new Database(":memory:");
  healthyDb.exec("CREATE TABLE IF NOT EXISTS keepalive (id TEXT PRIMARY KEY)");
  healthyDb.prepare("INSERT INTO keepalive (id) VALUES (?)").run("ok");
  setDbInstance(healthyDb);

  const migrationSpy = vi
    .spyOn(initialSchemaMigration, "up")
    .mockImplementation((_db: MigrationDb) => {
      throw new Error("forced migration failure for DB-INIT-F2");
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
    expect(getDb()).toBe(healthyDb);
    const row = healthyDb
      .prepare("SELECT id FROM keepalive WHERE id = ? LIMIT 1")
      .get("ok") as { id: string } | undefined;
    expect(row?.id).toBe("ok");
    expect(
      errorSpy.mock.calls.some(([event]) => event === "migration_failed"),
    ).toBe(true);
  } finally {
    migrationSpy.mockRestore();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
});

it("DB-INIT-F3: logger failure after publication clears the newly published singleton", () => {
  const userDataDir = path.join(
    import.meta.dirname,
    ".artifacts",
    "init-db-logger-failure-after-publication-test",
  );
  fs.rmSync(userDataDir, { recursive: true, force: true });
  fs.mkdirSync(userDataDir, { recursive: true });

  const logger = {
    logPath: path.join(userDataDir, "logs", "main.log"),
    info: vi.fn((event: string) => {
      if (event === "db_ready") {
        throw new Error("forced logger failure for DB-INIT-F3");
      }
    }),
    error: vi.fn(),
  };

  try {
    const result = initDb({ userDataDir, logger });
    expect(result.ok).toBe(false);
    expect(() => getDb()).toThrow(/not initialised/i);
    expect(
      logger.error.mock.calls.some(([event]) => event === "migration_failed"),
    ).toBe(true);
  } finally {
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
});

it("DB-INIT-F4: singleton conflict must fail before db_ready is emitted", () => {
  const userDataDir = path.join(
    import.meta.dirname,
    ".artifacts",
    "init-db-singleton-conflict-no-false-ready",
  );
  fs.rmSync(userDataDir, { recursive: true, force: true });
  fs.mkdirSync(userDataDir, { recursive: true });

  const healthyDb = new Database(":memory:");
  healthyDb.exec("CREATE TABLE IF NOT EXISTS keepalive (id TEXT PRIMARY KEY)");
  healthyDb.prepare("INSERT INTO keepalive (id) VALUES (?)").run("ok");
  setDbInstance(healthyDb);

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
    expect(
      infoSpy.mock.calls.some(([event]) => event === "db_ready"),
    ).toBe(false);
    expect(getDb()).toBe(healthyDb);
    expect(
      errorSpy.mock.calls.some(([event]) => event === "migration_failed"),
    ).toBe(true);
  } finally {
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
});
