import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import Database from "better-sqlite3";

import type { Logger } from "../../../logging/logger";
import { createSkillService, type SkillService } from "../skillService";

function createNoopLogger(): Logger {
  return {
    logPath: "",
    info: vi.fn(),
    error: vi.fn(),
  };
}

function createTestDb(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  db.exec(`
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
      content_json TEXT NOT NULL,
      content_text TEXT NOT NULL,
      content_md TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      sort_order INTEGER NOT NULL DEFAULT 0,
      parent_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      cover_image_url TEXT,
      FOREIGN KEY(project_id) REFERENCES projects(project_id) ON DELETE CASCADE
    );

    CREATE TABLE settings (
      scope TEXT NOT NULL,
      key TEXT NOT NULL,
      value_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (scope, key)
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

function seedProject(args: {
  db: Database.Database;
  projectId: string;
  projectRoot: string;
}): void {
  const ts = Date.now();
  args.db
    .prepare(
      "INSERT INTO projects (project_id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    )
    .run(args.projectId, args.projectId, args.projectRoot, ts, ts);
}

function setCurrentProject(args: {
  db: Database.Database;
  projectId: string;
}): void {
  args.db
    .prepare(
      "INSERT OR REPLACE INTO settings (scope, key, value_json, updated_at) VALUES (?, ?, ?, ?)",
    )
    .run(
      "app",
      "creonow.project.currentId",
      JSON.stringify(args.projectId),
      Date.now(),
    );
}

function writeBuiltinSkill(args: {
  builtinSkillsDir: string;
  id: string;
  name: string;
}): void {
  const filePath = path.join(
    args.builtinSkillsDir,
    "packages",
    "pkg.creonow.builtin",
    "1.0.0",
    "skills",
    args.id.split(":").pop() ?? args.id,
    "SKILL.md",
  );
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    `---
id: ${args.id}
name: ${args.name}
description: test skill
version: "1.0.0"
tags: ["test"]
kind: single
scope: builtin
packageId: pkg.creonow.builtin
context_rules:
  surrounding: 100
  user_preferences: true
  style_guide: false
  characters: false
  outline: false
  recent_summary: 0
  knowledge_graph: false
prompt:
  system: |
    You are a test assistant.
  user: |
    {{input}}
---

# ${args.name}
`,
    "utf8",
  );
}

describe("createSkillService", () => {
  let tmpRoot: string;
  let userDataDir: string;
  let builtinSkillsDir: string;
  let projectRoot: string;
  let db: Database.Database;
  let svc: SkillService;
  let logger: Logger;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "creonow-skill-svc-"));
    userDataDir = path.join(tmpRoot, "user-data");
    builtinSkillsDir = path.join(tmpRoot, "builtin-skills");
    projectRoot = path.join(tmpRoot, "project-a");

    fs.mkdirSync(userDataDir, { recursive: true });
    fs.mkdirSync(builtinSkillsDir, { recursive: true });
    fs.mkdirSync(path.join(projectRoot, ".creonow", "skills", "packages"), {
      recursive: true,
    });

    writeBuiltinSkill({
      builtinSkillsDir,
      id: "builtin:rewrite",
      name: "改写",
    });

    db = createTestDb();
    seedProject({ db, projectId: "proj-1", projectRoot });
    setCurrentProject({ db, projectId: "proj-1" });

    logger = createNoopLogger();
    svc = createSkillService({
      db,
      userDataDir,
      builtinSkillsDir,
      logger,
    });
  });

  afterEach(() => {
    db.close();
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  describe("list", () => {
    it("should list builtin skills", () => {
      const result = svc.list({ includeDisabled: true });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.items.length).toBeGreaterThanOrEqual(1);
        const rewrite = result.data.items.find(
          (s) => s.id === "builtin:rewrite",
        );
        expect(rewrite).toBeDefined();
        expect(rewrite?.name).toBe("改写");
        expect(rewrite?.scope).toBe("builtin");
      }
    });

    it("should filter disabled skills when includeDisabled is false", () => {
      // Disable the builtin skill
      svc.toggle({ id: "builtin:rewrite", enabled: false });

      const result = svc.list({ includeDisabled: false });
      expect(result.ok).toBe(true);
      if (result.ok) {
        const rewrite = result.data.items.find(
          (s) => s.id === "builtin:rewrite",
        );
        expect(rewrite).toBeUndefined();
      }
    });

    it("should include disabled skills when includeDisabled is true", () => {
      svc.toggle({ id: "builtin:rewrite", enabled: false });

      const result = svc.list({ includeDisabled: true });
      expect(result.ok).toBe(true);
      if (result.ok) {
        const rewrite = result.data.items.find(
          (s) => s.id === "builtin:rewrite",
        );
        expect(rewrite).toBeDefined();
        expect(rewrite?.enabled).toBe(false);
      }
    });

    it("should include custom skills in listing", () => {
      svc.createCustom({
        name: "自定义技能",
        description: "test custom",
        promptTemplate: "do something",
        inputType: "selection",
        contextRules: {},
        scope: "global",
      });

      const result = svc.list({ includeDisabled: true });
      expect(result.ok).toBe(true);
      if (result.ok) {
        const custom = result.data.items.find((s) =>
          s.id.startsWith("custom:"),
        );
        expect(custom).toBeDefined();
        expect(custom?.name).toBe("自定义技能");
        expect(custom?.packageId).toBe("pkg.creonow.custom");
      }
    });
  });

  describe("read", () => {
    it("should read skill file content", async () => {
      const result = await svc.read({ id: "builtin:rewrite" });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.id).toBe("builtin:rewrite");
        expect(result.data.content).toContain("改写");
      }
    });

    it("should return NOT_FOUND for unknown skill", async () => {
      const result = await svc.read({ id: "nonexistent" });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("NOT_FOUND");
      }
    });

    it("should reject empty id", async () => {
      const result = await svc.read({ id: "  " });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
      }
    });
  });

  describe("toggle", () => {
    it("should toggle builtin skill off", () => {
      const result = svc.toggle({
        id: "builtin:rewrite",
        enabled: false,
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.id).toBe("builtin:rewrite");
        expect(result.data.enabled).toBe(false);
      }
    });

    it("should toggle builtin skill on", () => {
      svc.toggle({ id: "builtin:rewrite", enabled: false });
      const result = svc.toggle({
        id: "builtin:rewrite",
        enabled: true,
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.enabled).toBe(true);
      }
    });

    it("should reject empty id", () => {
      const result = svc.toggle({ id: "  ", enabled: true });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
      }
    });

    it("should return NOT_FOUND for unknown builtin skill", () => {
      const result = svc.toggle({
        id: "unknown:skill",
        enabled: true,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("NOT_FOUND");
      }
    });

    it("should toggle custom skill", () => {
      const created = svc.createCustom({
        name: "可切换",
        description: "toggleable",
        promptTemplate: "test",
        inputType: "selection",
        contextRules: {},
        scope: "global",
      });
      expect(created.ok).toBe(true);
      if (!created.ok) return;

      const result = svc.toggle({
        id: `custom:${created.data.skill.id}`,
        enabled: false,
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.enabled).toBe(false);
      }
    });
  });

  describe("createCustom", () => {
    it("should create a global custom skill", () => {
      const result = svc.createCustom({
        name: "自定义技能",
        description: "A custom skill",
        promptTemplate: "请改写以下内容",
        inputType: "selection",
        contextRules: { style_guide: true },
        scope: "global",
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.skill.name).toBe("自定义技能");
        expect(result.data.skill.scope).toBe("global");
        expect(result.data.skill.enabled).toBe(true);
        expect(result.data.skill.id).toBeTruthy();
      }
    });

    it("should create a project-scoped custom skill", () => {
      const result = svc.createCustom({
        name: "项目技能",
        description: "project skill",
        promptTemplate: "template",
        inputType: "document",
        contextRules: {},
        scope: "project",
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.skill.scope).toBe("project");
        expect(result.data.skill.inputType).toBe("document");
      }
    });

    it("should reject empty name", () => {
      const result = svc.createCustom({
        name: "  ",
        description: "desc",
        promptTemplate: "template",
        inputType: "selection",
        contextRules: {},
        scope: "global",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("VALIDATION_ERROR");
      }
    });

    it("should reject empty description", () => {
      const result = svc.createCustom({
        name: "valid",
        description: "",
        promptTemplate: "template",
        inputType: "selection",
        contextRules: {},
        scope: "global",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("VALIDATION_ERROR");
      }
    });

    it("should reject empty promptTemplate", () => {
      const result = svc.createCustom({
        name: "valid",
        description: "desc",
        promptTemplate: "  ",
        inputType: "selection",
        contextRules: {},
        scope: "global",
      });

      expect(result.ok).toBe(false);
    });

    it("should reject invalid inputType", () => {
      const result = svc.createCustom({
        name: "valid",
        description: "desc",
        promptTemplate: "template",
        inputType: "invalid" as "selection",
        contextRules: {},
        scope: "global",
      });

      expect(result.ok).toBe(false);
    });

    it("should reject invalid scope", () => {
      const result = svc.createCustom({
        name: "valid",
        description: "desc",
        promptTemplate: "template",
        inputType: "selection",
        contextRules: {},
        scope: "invalid" as "global",
      });

      expect(result.ok).toBe(false);
    });

    it("should reject array as contextRules", () => {
      const result = svc.createCustom({
        name: "valid",
        description: "desc",
        promptTemplate: "template",
        inputType: "selection",
        contextRules: [] as unknown as Record<string, unknown>,
        scope: "global",
      });

      expect(result.ok).toBe(false);
    });

    it("should create with enabled=false", () => {
      const result = svc.createCustom({
        name: "disabled",
        description: "desc",
        promptTemplate: "template",
        inputType: "selection",
        contextRules: {},
        scope: "global",
        enabled: false,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.skill.enabled).toBe(false);
      }
    });
  });

  describe("deleteCustom", () => {
    it("should delete an existing custom skill", () => {
      const created = svc.createCustom({
        name: "删除我",
        description: "to be deleted",
        promptTemplate: "template",
        inputType: "selection",
        contextRules: {},
        scope: "global",
      });
      expect(created.ok).toBe(true);
      if (!created.ok) return;

      const result = svc.deleteCustom({ id: created.data.skill.id });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.deleted).toBe(true);
      }
    });

    it("should return NOT_FOUND for unknown custom skill", () => {
      const result = svc.deleteCustom({ id: "nonexistent-id" });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("NOT_FOUND");
      }
    });

    it("should reject empty id", () => {
      const result = svc.deleteCustom({ id: "  " });
      expect(result.ok).toBe(false);
    });

    it("should handle custom: prefix in id", () => {
      const created = svc.createCustom({
        name: "前缀测试",
        description: "prefix test",
        promptTemplate: "template",
        inputType: "selection",
        contextRules: {},
        scope: "global",
      });
      expect(created.ok).toBe(true);
      if (!created.ok) return;

      const result = svc.deleteCustom({
        id: `custom:${created.data.skill.id}`,
      });
      expect(result.ok).toBe(true);
    });
  });

  describe("listCustom", () => {
    it("should return empty list initially", () => {
      const result = svc.listCustom();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.items).toEqual([]);
      }
    });

    it("should list created custom skills", () => {
      svc.createCustom({
        name: "技能一",
        description: "first",
        promptTemplate: "template",
        inputType: "selection",
        contextRules: {},
        scope: "global",
      });
      svc.createCustom({
        name: "技能二",
        description: "second",
        promptTemplate: "template",
        inputType: "document",
        contextRules: {},
        scope: "global",
      });

      const result = svc.listCustom();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.items).toHaveLength(2);
      }
    });

    it("should log when persisted context_rules JSON is invalid", () => {
      const ts = Date.now();
      db.prepare(
        "INSERT INTO custom_skills (id, name, description, prompt_template, input_type, context_rules, scope, project_id, enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      ).run(
        "custom-invalid-json",
        "坏数据技能",
        "bad payload",
        "template",
        "selection",
        "{invalid-json",
        "global",
        null,
        1,
        ts,
        ts,
      );

      const result = svc.listCustom();
      expect(result.ok).toBe(true);
      if (result.ok) {
        const target = result.data.items.find(
          (item) => item.id === "custom-invalid-json",
        );
        expect(target?.contextRules).toEqual({});
      }

      expect(logger.error).toHaveBeenCalledWith(
        "custom_skill_context_rules_parse_failed",
        expect.objectContaining({ skillId: "custom-invalid-json" }),
      );
    });
  });

  describe("resolveForRun", () => {
    it("should resolve builtin skill for execution", () => {
      const result = svc.resolveForRun({ id: "builtin:rewrite" });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.skill.id).toBe("builtin:rewrite");
        expect(result.data.enabled).toBe(true);
      }
    });

    it("should reject empty id", () => {
      const result = svc.resolveForRun({ id: "" });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
      }
    });

    it("should return NOT_FOUND for unknown skill", () => {
      const result = svc.resolveForRun({ id: "unknown:skill" });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("NOT_FOUND");
      }
    });

    it("should resolve custom skill for execution", () => {
      const created = svc.createCustom({
        name: "运行技能",
        description: "run me",
        promptTemplate: "生成内容",
        inputType: "selection",
        contextRules: { style_guide: true },
        scope: "global",
      });
      expect(created.ok).toBe(true);
      if (!created.ok) return;

      const result = svc.resolveForRun({
        id: `custom:${created.data.skill.id}`,
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.skill.name).toBe("运行技能");
        expect(result.data.skill.packageId).toBe("pkg.creonow.custom");
        expect(result.data.inputType).toBe("selection");
        expect(result.data.skill.prompt?.user).toBe("生成内容");
        expect(result.data.skill.prompt?.system).toContain("运行技能");
      }
    });
  });

  describe("isDependencyAvailable", () => {
    it("should return available=true for enabled builtin skill", () => {
      const result = svc.isDependencyAvailable({
        dependencyId: "builtin:rewrite",
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.available).toBe(true);
      }
    });

    it("should return available=false for disabled builtin skill", () => {
      svc.toggle({ id: "builtin:rewrite", enabled: false });
      const result = svc.isDependencyAvailable({
        dependencyId: "builtin:rewrite",
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.available).toBe(false);
      }
    });

    it("should return available=false for nonexistent skill", () => {
      const result = svc.isDependencyAvailable({
        dependencyId: "nonexistent",
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.available).toBe(false);
      }
    });

    it("should reject empty dependencyId", () => {
      const result = svc.isDependencyAvailable({ dependencyId: "  " });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
      }
    });

    it("should check custom skill availability with custom: prefix", () => {
      const created = svc.createCustom({
        name: "dep",
        description: "dep",
        promptTemplate: "template",
        inputType: "selection",
        contextRules: {},
        scope: "global",
      });
      expect(created.ok).toBe(true);
      if (!created.ok) return;

      const result = svc.isDependencyAvailable({
        dependencyId: `custom:${created.data.skill.id}`,
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.available).toBe(true);
      }
    });

    it("should match by leaf id", () => {
      const result = svc.isDependencyAvailable({
        dependencyId: "rewrite",
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.available).toBe(true);
      }
    });
  });

  describe("write", () => {
    it("should reject empty id", async () => {
      const result = await svc.write({ id: "  ", content: "content" });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
      }
    });

    it("should reject empty content", async () => {
      const result = await svc.write({
        id: "builtin:rewrite",
        content: "",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
      }
    });

    it("should return NOT_FOUND for unknown skill", async () => {
      const result = await svc.write({
        id: "nonexistent",
        content: "content",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("NOT_FOUND");
      }
    });

    it("should write skill content to project scope for builtin", async () => {
      const result = await svc.write({
        id: "builtin:rewrite",
        content: `---
id: builtin:rewrite
name: 改写
description: rewritten
version: "1.0.0"
tags: ["test"]
kind: single
scope: project
packageId: pkg.creonow.builtin
context_rules:
  surrounding: 100
  user_preferences: true
  style_guide: false
  characters: false
  outline: false
  recent_summary: 0
  knowledge_graph: false
prompt:
  system: |
    Updated system.
  user: |
    {{input}}
---

# Updated Skill
`,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.written).toBe(true);
      }
    });
  });

  describe("updateCustom", () => {
    it("should reject empty id", async () => {
      const result = await svc.updateCustom({ id: "  " });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
      }
    });

    it("should update custom skill name", async () => {
      const created = svc.createCustom({
        name: "原始名称",
        description: "desc",
        promptTemplate: "template",
        inputType: "selection",
        contextRules: {},
        scope: "global",
      });
      expect(created.ok).toBe(true);
      if (!created.ok) return;

      const result = await svc.updateCustom({
        id: created.data.skill.id,
        name: "更新名称",
      });
      expect(result.ok).toBe(true);
    });

    it("should reject updating with empty name", async () => {
      const created = svc.createCustom({
        name: "valid",
        description: "desc",
        promptTemplate: "template",
        inputType: "selection",
        contextRules: {},
        scope: "global",
      });
      expect(created.ok).toBe(true);
      if (!created.ok) return;

      const result = await svc.updateCustom({
        id: created.data.skill.id,
        name: "  ",
      });
      expect(result.ok).toBe(false);
    });
  });
});
