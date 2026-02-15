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
 * S3-PROJECT-TPL-S3: invalid custom template schema should fail fast.
 */
async function main(): Promise<void> {
  const userDataDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "creonow-s3-template-schema-"),
  );
  const db = createProjectTestDb();
  const svc = createProjectService({
    db,
    userDataDir,
    logger: createNoopLogger(),
  });

  const created = svc.create({
    name: "Invalid Custom Template",
    template: {
      kind: "custom",
      structure: {
        folders: ["drafts"],
        files: [{ path: "", content: "# Invalid" }],
      },
    },
  } as unknown as { name?: string });

  assert.equal(created.ok, false, "invalid custom template must be rejected");
  if (created.ok) {
    throw new Error("expected invalid custom template to fail");
  }

  assert.equal(created.error.code, "INVALID_ARGUMENT");
  assert.match(created.error.message, /template\.structure\.files\[0\]\.path/);

  db.close();
  await fs.rm(userDataDir, { recursive: true, force: true });
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
