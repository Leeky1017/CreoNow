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
 * PM1-S2: should build project draft from ai-service mock response
 */
async function main(): Promise<void> {
  const userDataDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "creonow-pm1-ai-"),
  );
  const db = createProjectTestDb();
  const svc = createProjectService({
    db,
    userDataDir,
    logger: createNoopLogger(),
  }) as unknown as {
    createAiAssistDraft: (args: { prompt: string }) => {
      ok: boolean;
      data?: {
        name: string;
        type: "novel" | "screenplay" | "media";
        chapterOutlines: string[];
        characters: string[];
      };
    };
  };

  const result = svc.createAiAssistDraft({
    prompt: "帮我创建一部校园推理小说，主角是高中女生侦探",
  });

  assert.equal(result.ok, true);
  if (!result.ok || !result.data) {
    throw new Error("expected ai assist mock draft");
  }

  assert.equal(result.data.type, "novel");
  assert.equal(result.data.chapterOutlines.length, 5);
  assert.equal(result.data.characters.length, 3);

  db.close();
  await fs.rm(userDataDir, { recursive: true, force: true });
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
