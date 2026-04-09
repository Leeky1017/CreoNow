import fs from "node:fs";
import path from "node:path";

import { afterEach, expect, it } from "vitest";

import { closeDb, getDb, initConnection } from "../connection";

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
