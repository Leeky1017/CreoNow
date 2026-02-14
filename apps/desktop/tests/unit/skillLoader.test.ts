import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { Logger } from "../../main/src/logging/logger";
import {
  discoverSkillFiles,
  loadSkills,
} from "../../main/src/services/skills/skillLoader";

{
  // SLE-S1: missing directory should expose ENOENT structured error.
  const missingDir = path.join(
    os.tmpdir(),
    `creonow-skill-loader-missing-${randomUUID()}`,
  );

  const discovered = discoverSkillFiles({
    scope: "builtin",
    packagesDir: missingDir,
  });

  assert.deepEqual(discovered.refs, []);
  assert.equal(discovered.errors.length, 1);
  assert.equal(discovered.errors[0]?.code, "ENOENT");
  assert.equal(discovered.errors[0]?.path, missingDir);
}

{
  // SLE-S2: permission denied should expose EACCES structured error.
  const blockedDir = path.join(
    os.tmpdir(),
    `creonow-skill-loader-eacces-${randomUUID()}`,
  );

  const originalReadDir = fs.readdirSync;
  const permissionDenied = Object.assign(new Error("permission denied"), {
    code: "EACCES",
    path: blockedDir,
  }) as NodeJS.ErrnoException;

  const mockedReadDir = ((...args: unknown[]) => {
    const [target] = args;
    if (String(target) === blockedDir) {
      throw permissionDenied;
    }
    return Reflect.apply(
      originalReadDir as unknown as (...callArgs: unknown[]) => unknown,
      fs,
      args,
    );
  }) as typeof fs.readdirSync;

  fs.readdirSync = mockedReadDir;
  try {
    const discovered = discoverSkillFiles({
      scope: "builtin",
      packagesDir: blockedDir,
    });

    assert.deepEqual(discovered.refs, []);
    assert.equal(discovered.errors.length, 1);
    assert.equal(discovered.errors[0]?.code, "EACCES");
    assert.equal(discovered.errors[0]?.path, blockedDir);
  } finally {
    fs.readdirSync = originalReadDir;
  }
}

{
  // SLE-S3: normal readable directory returns discovered dirs without error.
  const root = await fsp.mkdtemp(
    path.join(os.tmpdir(), `creonow-skill-loader-ok-${randomUUID()}-`),
  );
  const packagesDir = path.join(root, "packages");
  const skillFilePath = path.join(
    packagesDir,
    "pkg.creonow.sample",
    "1.0.0",
    "skills",
    "alpha",
    "SKILL.md",
  );

  await fsp.mkdir(path.dirname(skillFilePath), { recursive: true });
  await fsp.writeFile(skillFilePath, "# test", "utf8");

  const discovered = discoverSkillFiles({
    scope: "builtin",
    packagesDir,
  });

  assert.equal(discovered.errors.length, 0);
  assert.equal(discovered.refs.length, 1);
  assert.equal(discovered.refs[0]?.scope, "builtin");
  assert.equal(discovered.refs[0]?.packageId, "pkg.creonow.sample");
  assert.equal(discovered.refs[0]?.version, "1.0.0");
  assert.equal(discovered.refs[0]?.skillDirName, "alpha");
  assert.equal(discovered.refs[0]?.filePath, skillFilePath);
}

{
  // SLE-S4: load flow must distinguish empty directories from failed scans.
  const missingBuiltinRoot = path.join(
    os.tmpdir(),
    `creonow-skill-loader-builtin-missing-${randomUUID()}`,
  );

  const globalRoot = await fsp.mkdtemp(
    path.join(os.tmpdir(), `creonow-skill-loader-global-${randomUUID()}-`),
  );
  await fsp.mkdir(path.join(globalRoot, "packages"), { recursive: true });

  const logs: Array<{
    level: "info" | "error";
    event: string;
    data?: Record<string, unknown>;
  }> = [];

  const logger: Logger = {
    logPath: path.join(globalRoot, "main.log"),
    info: (event, data) => {
      logs.push({ level: "info", event, data });
    },
    error: (event, data) => {
      logs.push({ level: "error", event, data });
    },
  };

  const loaded = loadSkills({
    logger,
    roots: {
      builtinSkillsDir: missingBuiltinRoot,
      globalSkillsDir: globalRoot,
      projectSkillsDir: null,
    },
  });

  assert.equal(loaded.ok, true);
  if (!loaded.ok) {
    throw new Error("Expected loadSkills to return ok result");
  }

  assert.deepEqual(loaded.data.skills, []);
  assert.equal(loaded.data.scanErrors.length, 1);
  assert.equal(loaded.data.scanErrors[0]?.code, "ENOENT");
  assert.equal(
    loaded.data.scanErrors[0]?.path,
    path.join(missingBuiltinRoot, "packages"),
  );

  const hasScanFailureLog = logs.some(
    (entry) =>
      entry.level === "error" && entry.event === "skill_dir_scan_failed",
  );
  assert.equal(hasScanFailureLog, true);
}
