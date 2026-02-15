import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createProjectService } from "../projectService";
import {
  createNoopLogger,
  createProjectTestDb,
} from "../../../../../tests/unit/projectService.test-helpers";

/**
 * S3-PROJECT-TPL-S1: built-in template should seed structured initial docs.
 */
async function main(): Promise<void> {
  const userDataDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "creonow-s3-template-apply-"),
  );
  const db = createProjectTestDb();
  const svc = createProjectService({
    db,
    userDataDir,
    logger: createNoopLogger(),
  });

  const created = svc.create({
    name: "Template Project",
    template: {
      kind: "builtin",
      id: "screenplay",
    },
  } as unknown as { name?: string });

  if (!created.ok) {
    throw new Error(`create failed: ${created.error.code}`);
  }

  const docs = db
    .prepare<
      [string],
      { title: string }
    >("SELECT title FROM documents WHERE project_id = ? ORDER BY rowid ASC")
    .all(created.data.projectId);

  assert.ok(
    docs.length >= 2,
    "screenplay template should create at least two initial documents",
  );
  assert.equal(docs[0]?.title, "Scene 1");
  assert.equal(
    docs.some((doc) => doc.title === "Characters"),
    true,
    "screenplay template should include Characters document",
  );

  db.close();
  await fs.rm(userDataDir, { recursive: true, force: true });
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
