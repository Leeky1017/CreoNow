import path from "node:path";
import { fileURLToPath } from "node:url";

import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";

import type { Logger } from "../../../logging/logger";
import { createSkillExecutor } from "../skillExecutor";
import { createSkillService } from "../skillService";

function createNoopLogger(): Logger {
  return {
    logPath: "<test>",
    info: () => {},
    error: () => {},
  };
}

function createSkillTestDb(): Database.Database {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE settings (
      scope TEXT NOT NULL,
      key TEXT NOT NULL,
      value_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (scope, key)
    );
    CREATE TABLE projects (
      project_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      root_path TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'novel',
      description TEXT NOT NULL DEFAULT '',
      stage TEXT NOT NULL DEFAULT 'outline',
      target_word_count INTEGER,
      target_chapter_count INTEGER,
      narrative_person TEXT NOT NULL DEFAULT 'first',
      language_style TEXT NOT NULL DEFAULT '',
      target_audience TEXT NOT NULL DEFAULT '',
      default_skill_set_id TEXT,
      knowledge_graph_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      archived_at INTEGER
    );
    CREATE TABLE documents (
      document_id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'chapter',
      title TEXT NOT NULL,
      content_json TEXT NOT NULL DEFAULT '{}',
      content_text TEXT NOT NULL DEFAULT '',
      content_md TEXT NOT NULL DEFAULT '',
      content_hash TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft',
      sort_order INTEGER NOT NULL DEFAULT 0,
      parent_id TEXT,
      created_at INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE skills (
      skill_id TEXT PRIMARY KEY,
      enabled INTEGER NOT NULL,
      valid INTEGER NOT NULL,
      error_code TEXT,
      error_message TEXT,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE custom_skills (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      prompt_template TEXT NOT NULL,
      input_type TEXT NOT NULL,
      context_rules TEXT NOT NULL,
      scope TEXT NOT NULL,
      project_id TEXT,
      enabled INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
  return db;
}

function builtinSkillsDir(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "../../../../skills");
}

describe("P3 runtime skill chain", () => {
  it("lists at least three required builtin skills with complete runtime schema", () => {
    const db = createSkillTestDb();
    try {
      const svc = createSkillService({
        db,
        userDataDir: builtinSkillsDir(),
        builtinSkillsDir: builtinSkillsDir(),
        logger: createNoopLogger(),
      });

      const listed = svc.list({ includeDisabled: true });
      expect(listed.ok).toBe(true);
      if (!listed.ok) {
        throw new Error("expected list() to succeed");
      }

      const requiredIds = ["builtin:polish", "builtin:chat", "builtin:continue"] as const;
      const builtinItems = listed.data.items.filter((item) => item.scope === "builtin");
      expect(builtinItems.length).toBeGreaterThanOrEqual(3);
      expect(builtinItems.map((item) => item.id)).toEqual(expect.arrayContaining(requiredIds));

      for (const skillId of requiredIds) {
        const resolved = svc.resolveForRun({ id: skillId });
        expect(resolved.ok).toBe(true);
        if (!resolved.ok) {
          throw new Error(`expected ${skillId} to resolve`);
        }

        expect(resolved.data.enabled).toBe(true);
        expect(resolved.data.skill.valid).toBe(true);
        expect(resolved.data.skill.scope).toBe("builtin");
        expect(resolved.data.skill.permissionLevel).toBeTruthy();
        expect(resolved.data.skill.prompt?.system?.trim().length).toBeGreaterThan(0);
        expect(resolved.data.skill.prompt?.user?.trim().length).toBeGreaterThan(0);
      }
    } finally {
      db.close();
    }
  });

  it("loads the three builtin P3 skills through the real loader", () => {
    const db = createSkillTestDb();
    try {
      const svc = createSkillService({
        db,
        userDataDir: builtinSkillsDir(),
        builtinSkillsDir: builtinSkillsDir(),
        logger: createNoopLogger(),
      });

      const listed = svc.list({ includeDisabled: true });
      expect(listed.ok).toBe(true);
      if (!listed.ok) {
        throw new Error("expected list() to succeed");
      }

      expect(listed.data.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: "consistency-check", valid: true }),
          expect.objectContaining({ id: "dialogue-gen", valid: true }),
          expect.objectContaining({ id: "outline-expand", valid: true }),
        ]),
      );

      const consistency = svc.resolveForRun({ id: "consistency-check" });
      const dialogue = svc.resolveForRun({ id: "dialogue-gen" });
      const outline = svc.resolveForRun({ id: "outline-expand" });

      expect(consistency.ok && consistency.data.inputType).toBe("document");
      expect(dialogue.ok && dialogue.data.inputType).toBe("selection");
      expect(outline.ok && outline.data.inputType).toBe("selection");
    } finally {
      db.close();
    }
  });

  it("executes P3 skills through the real resolveForRun -> executor chain", async () => {
    const db = createSkillTestDb();
    try {
      const svc = createSkillService({
        db,
        userDataDir: builtinSkillsDir(),
        builtinSkillsDir: builtinSkillsDir(),
        logger: createNoopLogger(),
      });

      const executor = createSkillExecutor({
        resolveSkill: (skillId) => {
          const resolved = svc.resolveForRun({ id: skillId });
          if (!resolved.ok) {
            return resolved;
          }
          return {
            ok: true,
            data: {
              id: resolved.data.skill.id,
              prompt: resolved.data.skill.prompt,
              output: resolved.data.skill.output,
              enabled: resolved.data.enabled,
              valid: resolved.data.skill.valid,
              inputType: resolved.data.inputType,
              dependsOn: resolved.data.skill.dependsOn,
              timeoutMs: resolved.data.skill.timeoutMs,
              error_code: resolved.data.skill.error_code,
              error_message: resolved.data.skill.error_message,
            },
          };
        },
        runSkill: async (args) => ({
          ok: true,
          data: {
            executionId: `exec-${args.skillId}`,
            runId: `run-${args.skillId}`,
            outputText:
              args.skillId === "consistency-check"
                ? '{"passed":true,"issues":[]}'
                : args.skillId === "dialogue-gen"
                  ? '{"dialogue":"他说：先别惊动任何人。","characterId":"char-1"}'
                  : '{"expandedContent":"夜色压低了巷口的声音。","paragraphCount":1}',
          },
        }),
      });

      const consistency = await executor.execute({
        skillId: "consistency-check",
        input: "",
        mode: "ask",
        model: "gpt-5.2",
        stream: false,
        ts: Date.now(),
        context: { projectId: "proj-1", documentId: "doc-1" },
        emitEvent: () => {},
      });
      const dialogue = await executor.execute({
        skillId: "dialogue-gen",
        input: "林远盯着门把手，迟迟没有推门。",
        mode: "ask",
        model: "gpt-5.2",
        stream: false,
        ts: Date.now(),
        context: { projectId: "proj-1", documentId: "doc-1" },
        emitEvent: () => {},
      });
      const outline = await executor.execute({
        skillId: "outline-expand",
        input: "主角雨夜回到旧宅，发现阁楼暗门。",
        mode: "ask",
        model: "gpt-5.2",
        stream: false,
        ts: Date.now(),
        context: { projectId: "proj-1", documentId: "doc-1" },
        emitEvent: () => {},
      });

      expect(consistency.ok).toBe(true);
      expect(dialogue.ok).toBe(true);
      expect(outline.ok).toBe(true);
    } finally {
      db.close();
    }
  });
});
