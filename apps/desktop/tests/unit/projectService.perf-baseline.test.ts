import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createProjectService } from "../../main/src/services/projects/projectService";

import {
  createNoopLogger,
  createProjectTestDb,
} from "./projectService.test-helpers";

function percentile(values: number[], p: number): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

/**
 * PM1 baseline acceptance:
 * - project:create p95 < 500ms
 * - project:update p95 < 200ms
 */
async function main(): Promise<void> {
  const userDataDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "creonow-pm1-perf-"),
  );
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
  };

  const createdDurations: number[] = [];
  const projectIds: string[] = [];

  for (let i = 0; i < 30; i += 1) {
    const t0 = performance.now();
    const res = svc.create({ name: `Perf Create ${i}` });
    const t1 = performance.now();
    createdDurations.push(t1 - t0);

    if (!res.ok || !res.data) {
      throw new Error(`create failed: ${res.error?.code ?? "unknown"}`);
    }
    projectIds.push(res.data.projectId);
  }

  const updateDurations: number[] = [];

  for (let i = 0; i < 50; i += 1) {
    const target = projectIds[i % projectIds.length];
    const t0 = performance.now();
    const res = svc.update({
      projectId: target,
      patch: {
        stage: i % 2 === 0 ? "draft" : "revision",
      },
    });
    const t1 = performance.now();
    updateDurations.push(t1 - t0);

    if (!res.ok) {
      throw new Error(`update failed: ${res.error?.code ?? "unknown"}`);
    }
  }

  const createP95 = percentile(createdDurations, 95);
  const updateP95 = percentile(updateDurations, 95);

  assert.ok(createP95 < 500, `expected create p95 < 500ms, got ${createP95}`);
  assert.ok(updateP95 < 200, `expected update p95 < 200ms, got ${updateP95}`);

  db.close();
  await fs.rm(userDataDir, { recursive: true, force: true });
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
