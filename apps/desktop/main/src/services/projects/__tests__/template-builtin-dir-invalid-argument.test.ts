import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createProjectService } from "../projectService";
import { resetBuiltInTemplateCacheForTests } from "../templateService";
import {
  createNoopLogger,
  createProjectTestDb,
} from "../../../../../tests/unit/projectService.test-helpers";

async function main(): Promise<void> {
  const userDataDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "creonow-s3-template-dir-invalid-"),
  );
  const db = createProjectTestDb();
  const previousTemplateDir = process.env.CREONOW_TEMPLATE_DIR;

  try {
    process.env.CREONOW_TEMPLATE_DIR = path.join(
      userDataDir,
      "missing-template-dir",
    );
    resetBuiltInTemplateCacheForTests();

    const svc = createProjectService({
      db,
      userDataDir,
      logger: createNoopLogger(),
    });

    const created = svc.create({
      name: "Invalid Builtin Template Directory",
      template: {
        kind: "builtin",
        id: "novel",
      },
    } as unknown as { name?: string });

    assert.equal(
      created.ok,
      false,
      "unavailable built-in template directory must reject create",
    );
    if (created.ok) {
      throw new Error(
        "expected unavailable built-in template directory to reject create",
      );
    }
    assert.equal(created.error.code, "INVALID_ARGUMENT");
    assert.match(
      created.error.message,
      /Configured built-in template directory/,
    );
    assert.equal(created.error.details?.field, "template.directory");
  } finally {
    process.env.CREONOW_TEMPLATE_DIR = previousTemplateDir;
    resetBuiltInTemplateCacheForTests();
    db.close();
    await fs.rm(userDataDir, { recursive: true, force: true });
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
