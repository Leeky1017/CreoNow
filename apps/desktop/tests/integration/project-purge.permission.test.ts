import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createProjectService } from "../../main/src/services/projects/projectService";
import {
  createNoopLogger,
  createProjectTestDb,
} from "../unit/projectService.test-helpers";

/**
 * PM2-S8
 * should keep archived status when purge path has no write permission
 */
async function main(): Promise<void> {
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "creonow-pm2-"));
  const db = createProjectTestDb();

  const svc = createProjectService({
    db,
    userDataDir,
    logger: createNoopLogger(),
    removeProjectRoot: () => {
      const error = new Error("permission denied");
      (error as NodeJS.ErrnoException).code = "EACCES";
      throw error;
    },
  });

  const created = svc.create({ name: "Permission Purge" });
  assert.equal(created.ok, true);
  if (!created.ok) {
    throw new Error("failed to create project");
  }

  const archived = svc.archive({
    projectId: created.data.projectId,
    archived: true,
  });
  assert.equal(archived.ok, true);

  const purged = svc.lifecyclePurge({
    projectId: created.data.projectId,
    traceId: "trace-purge-permission",
  });

  assert.equal(purged.ok, false);
  if (purged.ok || !purged.error) {
    throw new Error("expected purge permission error");
  }
  assert.equal(purged.error.code, "PROJECT_PURGE_PERMISSION_DENIED");

  const row = db
    .prepare<
      [string],
      { archivedAt: number | null }
    >("SELECT archived_at as archivedAt FROM projects WHERE project_id = ?")
    .get(created.data.projectId);
  assert.equal(typeof row?.archivedAt, "number");

  db.close();
  await fs.rm(userDataDir, { recursive: true, force: true });
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
