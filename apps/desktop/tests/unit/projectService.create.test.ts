import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createProjectService } from "../../main/src/services/projects/projectService";

import { createNoopLogger, createProjectTestDb } from "./projectService.test-helpers";

/**
 * PM1-S1: should create project and default chapter when valid manual input
 */
async function main(): Promise<void> {
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "creonow-pm1-create-"));
  const db = createProjectTestDb();
  const svc = createProjectService({
    db,
    userDataDir,
    logger: createNoopLogger(),
  });

  const created = svc.create({
    name: "暗流",
    type: "novel",
    description: "一部都市悬疑小说",
  } as unknown as { name?: string });

  if (!created.ok) {
    throw new Error(`create failed: ${created.error.code}`);
  }

  const chapterCount = db
    .prepare<[string], { count: number }>(
      "SELECT COUNT(*) as count FROM documents WHERE project_id = ?",
    )
    .get(created.data.projectId);
  assert.equal(
    chapterCount?.count,
    1,
    "should auto-create one default chapter document",
  );

  db.close();
  await fs.rm(userDataDir, { recursive: true, force: true });
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
