import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createProjectService } from "../../main/src/services/projects/projectService";

import {
  createNoopLogger,
  createProjectTestDb,
} from "./projectService.test-helpers";

/**
 * PM1-S9: should return PROJECT_CAPACITY_EXCEEDED when project count limit reached
 */
async function main(): Promise<void> {
  const userDataDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "creonow-pm1-capacity-"),
  );
  const db = createProjectTestDb();
  const svc = createProjectService({
    db,
    userDataDir,
    logger: createNoopLogger(),
  });

  const now = Date.now();
  const insert = db.prepare(
    "INSERT INTO projects (project_id, name, root_path, type, description, stage, target_word_count, target_chapter_count, narrative_person, language_style, target_audience, default_skill_set_id, knowledge_graph_id, created_at, updated_at, archived_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)",
  );

  for (let i = 0; i < 2000; i += 1) {
    insert.run(
      `p-${i}`,
      `Project ${i}`,
      `/tmp/p-${i}`,
      "novel",
      "",
      "outline",
      null,
      null,
      "first",
      "",
      "",
      null,
      null,
      now,
      now,
    );
  }

  const created = svc.create({ name: "Overflow" });
  assert.equal(created.ok, false);
  if (created.ok) {
    throw new Error("expected capacity exceeded error");
  }

  assert.equal(created.error.code, "PROJECT_CAPACITY_EXCEEDED");

  db.close();
  await fs.rm(userDataDir, { recursive: true, force: true });
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
