import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";
import { afterEach, expect, it } from "vitest";

import { closeDb, getDb, initConnection, setDbInstance } from "../connection";

afterEach(() => {
  closeDb();
});

it("DB-CONN-1: initConnection is idempotent for same db path", () => {
  const testDir = path.join(import.meta.dirname, ".artifacts", "db-conn-same-path");
  fs.rmSync(testDir, { recursive: true, force: true });
  fs.mkdirSync(testDir, { recursive: true });

  const dbPath = path.join(testDir, "main.sqlite");

  try {
    const first = initConnection(dbPath);
    const second = initConnection(dbPath);
    expect(second).toBe(first);
    expect(getDb()).toBe(first);
    expect(fs.existsSync(dbPath)).toBe(true);
  } finally {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
});

it("DB-CONN-2: initConnection rejects reinitialisation with a different db path", () => {
  const testDir = path.join(
    import.meta.dirname,
    ".artifacts",
    "db-conn-path-mismatch",
  );
  fs.rmSync(testDir, { recursive: true, force: true });
  fs.mkdirSync(testDir, { recursive: true });

  const firstPath = path.join(testDir, "first.sqlite");
  const secondPath = path.join(testDir, "second.sqlite");

  try {
    const first = initConnection(firstPath);
    expect(() => initConnection(secondPath)).toThrow(
      /already initialised.*Refusing to reinitialise with different path/i,
    );
    expect(getDb()).toBe(first);
    expect(fs.existsSync(firstPath)).toBe(true);
    expect(fs.existsSync(secondPath)).toBe(false);
  } finally {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
});

it("DB-CONN-3: setDbInstance rejects replacing an existing singleton", () => {
  const first = new Database(":memory:");
  const second = new Database(":memory:");
  first.exec("CREATE TABLE keepalive (id TEXT PRIMARY KEY)");
  first.prepare("INSERT INTO keepalive (id) VALUES (?)").run("ok");

  try {
    setDbInstance(first);
    expect(() => setDbInstance(second)).toThrow(
      /singleton already registered.*Call closeDb\(\) first/i,
    );
    expect(getDb()).toBe(first);
    const row = first
      .prepare("SELECT id FROM keepalive WHERE id = ?")
      .get("ok") as { id: string } | undefined;
    expect(row?.id).toBe("ok");
  } finally {
    closeDb();
    second.close();
  }
});

it("DB-CONN-4: direct handle close cannot leave singleton pointing to dead connection", () => {
  const testDir = path.join(
    import.meta.dirname,
    ".artifacts",
    "db-conn-direct-close-recovery",
  );
  fs.rmSync(testDir, { recursive: true, force: true });
  fs.mkdirSync(testDir, { recursive: true });

  const dbPath = path.join(testDir, "main.sqlite");

  try {
    const first = initConnection(dbPath);
    first.close();

    expect(() => getDb()).toThrow(/not initialised/i);

    const reopened = initConnection(dbPath);
    expect(reopened).not.toBe(first);
    const row = reopened.prepare("SELECT 1 AS ok").get() as { ok: number };
    expect(row.ok).toBe(1);
    expect(getDb()).toBe(reopened);
  } finally {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
});
