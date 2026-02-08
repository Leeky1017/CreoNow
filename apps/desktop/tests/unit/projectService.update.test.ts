import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createProjectService } from "../../main/src/services/projects/projectService";

import { createNoopLogger, createProjectTestDb } from "./projectService.test-helpers";

/**
 * PM1-S4: should persist metadata changes without KG/Skill service calls
 */
async function main(): Promise<void> {
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "creonow-pm1-update-"));
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
      patch: {
        narrativePerson?: "first" | "third-limited" | "third-omniscient";
        targetWordCount?: number | null;
        targetAudience?: string;
        knowledgeGraphId?: string | null;
        defaultSkillSetId?: string | null;
      };
    }) => { ok: boolean; error?: { code: string } };
  };

  const created = svc.create({ name: "元数据测试" });
  if (!created.ok || !created.data) {
    throw new Error(`create failed: ${created.error?.code ?? "unknown"}`);
  }

  const updated = svc.update({
    projectId: created.data.projectId,
    patch: {
      narrativePerson: "third-limited",
      targetWordCount: 200000,
      targetAudience: "悬疑读者",
      knowledgeGraphId: "kg-pm1",
      defaultSkillSetId: "skill-pm1",
    },
  });

  assert.equal(updated.ok, true);

  const row = db
    .prepare<
      [string],
      {
        narrativePerson: string;
        targetWordCount: number | null;
        targetAudience: string;
        knowledgeGraphId: string | null;
        defaultSkillSetId: string | null;
      }
    >(
      "SELECT narrative_person as narrativePerson, target_word_count as targetWordCount, target_audience as targetAudience, knowledge_graph_id as knowledgeGraphId, default_skill_set_id as defaultSkillSetId FROM projects WHERE project_id = ?",
    )
    .get(created.data.projectId);

  assert.equal(row?.narrativePerson, "third-limited");
  assert.equal(row?.targetWordCount, 200000);
  assert.equal(row?.targetAudience, "悬疑读者");
  assert.equal(row?.knowledgeGraphId, "kg-pm1");
  assert.equal(row?.defaultSkillSetId, "skill-pm1");

  db.close();
  await fs.rm(userDataDir, { recursive: true, force: true });
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
