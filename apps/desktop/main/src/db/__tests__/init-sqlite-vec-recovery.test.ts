import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";
import { afterEach, expect, it, vi } from "vitest";

import { closeDb } from "../connection";
import { initDb } from "../init";

afterEach(() => {
  closeDb();
  vi.restoreAllMocks();
});

it("DB-INIT-VEC-1: retries 0008_user_memory_vec on later boot when sqlite-vec becomes available", () => {
  const userDataDir = path.join(
    import.meta.dirname,
    ".artifacts",
    "init-sqlite-vec-recovery-test",
  );
  fs.rmSync(userDataDir, { recursive: true, force: true });
  fs.mkdirSync(userDataDir, { recursive: true });

  const originalLoadExtension = Database.prototype.loadExtension;
  const loadExtensionSpy = vi
    .spyOn(Database.prototype, "loadExtension")
    .mockImplementationOnce(() => {
      throw new Error("sqlite_vec unavailable on first boot");
    })
    .mockImplementation(function mockedLoadExtension(this: Database.Database, p: string) {
      return originalLoadExtension.call(this, p);
    });

  const logger = {
    logPath: path.join(userDataDir, "logs", "main.log"),
    info: vi.fn(),
    error: vi.fn(),
  };

  try {
    const first = initDb({ userDataDir, logger });
    expect(first.ok).toBe(true);
    if (!first.ok) {
      return;
    }
    const vecBefore = first.db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'user_memory_vec' LIMIT 1",
      )
      .get() as { name: string } | undefined;
    expect(vecBefore).toBeUndefined();
    const versionAfterFirstBoot = first.db
      .prepare("SELECT version FROM schema_version LIMIT 1")
      .get() as { version: number } | undefined;
    expect(versionAfterFirstBoot?.version).toBeGreaterThanOrEqual(28);

    closeDb();

    const second = initDb({ userDataDir, logger });
    expect(second.ok).toBe(true);
    if (!second.ok) {
      return;
    }
    const vecAfter = second.db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'user_memory_vec' LIMIT 1",
      )
      .get() as { name: string } | undefined;
    expect(vecAfter?.name).toBe("user_memory_vec");
    const versionAfterSecondBoot = second.db
      .prepare("SELECT version FROM schema_version LIMIT 1")
      .get() as { version: number } | undefined;
    expect(versionAfterSecondBoot?.version).toBeGreaterThanOrEqual(28);

    expect(loadExtensionSpy).toHaveBeenCalledTimes(2);
  } finally {
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
});
