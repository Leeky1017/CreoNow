import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createProjectService } from "../../main/src/services/projects/projectService";

import { createNoopLogger, createProjectTestDb } from "./projectService.test-helpers";

/**
 * PM1-S5: should persist stage transition and expose dashboard tag update
 */
async function main(): Promise<void> {
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "creonow-pm1-stage-"));
  const db = createProjectTestDb();
  const svc = createProjectService({
    db,
    userDataDir,
    logger: createNoopLogger(),
  }) as unknown as {
    create: (args: { name?: string }) => {
      ok: boolean;
      data?: { projectId: string };
      error?: { code: string };
    };
    update: (args: {
      projectId: string;
      patch: { stage?: "outline" | "draft" | "revision" | "final" };
    }) => { ok: boolean; error?: { code: string } };
    list: (args?: { includeArchived?: boolean }) => {
      ok: boolean;
      data?: {
        items: Array<{ projectId: string; stage?: "outline" | "draft" | "revision" | "final" }>;
      };
      error?: { code: string };
    };
  };

  const created = svc.create({ name: "阶段测试" });
  if (!created.ok || !created.data) {
    throw new Error(`create failed: ${created.error?.code ?? "unknown"}`);
  }

  const updated = svc.update({
    projectId: created.data.projectId,
    patch: { stage: "revision" },
  });
  assert.equal(updated.ok, true);

  const listed = svc.list();
  assert.equal(listed.ok, true);
  if (!listed.ok || !listed.data) {
    throw new Error(`list failed: ${listed.error?.code ?? "unknown"}`);
  }

  const item = listed.data.items.find((x) => x.projectId === created.data?.projectId);
  assert.equal(item?.stage, "revision");

  db.close();
  await fs.rm(userDataDir, { recursive: true, force: true });
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
