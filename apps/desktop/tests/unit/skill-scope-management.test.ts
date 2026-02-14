import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import type { IpcMain } from "electron";

import { registerSkillIpcHandlers } from "../../main/src/ipc/skills";
import { createSkillService } from "../../main/src/services/skills/skillService";
import {
  createNoopLogger,
  createProjectTestDb,
} from "./projectService.test-helpers";

type Handler = (event: unknown, payload: unknown) => Promise<unknown>;

type SkillScope = "builtin" | "global" | "project";

function ensureSkillsTable(db: ReturnType<typeof createProjectTestDb>): void {
  db.exec(`
    CREATE TABLE skills (
      skill_id TEXT PRIMARY KEY,
      enabled INTEGER NOT NULL,
      valid INTEGER NOT NULL,
      error_code TEXT,
      error_message TEXT,
      updated_at INTEGER NOT NULL
    )
  `);
}

function ensureCustomSkillsTable(
  db: ReturnType<typeof createProjectTestDb>,
): void {
  db.exec(`
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
    )
  `);
}

function seedCurrentProject(args: {
  db: ReturnType<typeof createProjectTestDb>;
  projectId: string;
  projectRoot: string;
}): void {
  const ts = Date.now();
  args.db
    .prepare(
      "INSERT INTO projects (project_id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    )
    .run(args.projectId, "Scope Test Project", args.projectRoot, ts, ts);

  args.db
    .prepare(
      "INSERT INTO settings (scope, key, value_json, updated_at) VALUES (?, ?, ?, ?)",
    )
    .run(
      "app",
      "creonow.project.currentId",
      JSON.stringify(args.projectId),
      ts,
    );
}

function toScopeRoot(args: {
  scope: SkillScope;
  builtinSkillsDir: string;
  userDataDir: string;
  projectRoot: string;
}): string {
  if (args.scope === "builtin") {
    return path.join(args.builtinSkillsDir, "packages");
  }
  if (args.scope === "global") {
    return path.join(args.userDataDir, "skills", "packages");
  }
  return path.join(args.projectRoot, ".creonow", "skills", "packages");
}

function renderSkillMarkdown(args: {
  id: string;
  name: string;
  scope: SkillScope;
  packageId: string;
  version: string;
}): string {
  return `---
id: ${args.id}
name: ${args.name}
description: scope test
version: "${args.version}"
tags: ["scope-test"]
kind: single
scope: ${args.scope}
packageId: ${args.packageId}
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
    You are scope test assistant.
  user: |
    {{input}}
---

# ${args.id}
`;
}

function writeSkillFile(args: {
  scope: SkillScope;
  builtinSkillsDir: string;
  userDataDir: string;
  projectRoot: string;
  packageId: string;
  version: string;
  skillDir: string;
  id: string;
  name: string;
}): string {
  const scopeRoot = toScopeRoot({
    scope: args.scope,
    builtinSkillsDir: args.builtinSkillsDir,
    userDataDir: args.userDataDir,
    projectRoot: args.projectRoot,
  });

  const filePath = path.join(
    scopeRoot,
    args.packageId,
    args.version,
    "skills",
    args.skillDir,
    "SKILL.md",
  );
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    renderSkillMarkdown({
      id: args.id,
      name: args.name,
      scope: args.scope,
      packageId: args.packageId,
      version: args.version,
    }),
    "utf8",
  );

  return filePath;
}

function createFixture(): {
  tmpRoot: string;
  userDataDir: string;
  builtinSkillsDir: string;
  projectRoot: string;
  db: ReturnType<typeof createProjectTestDb>;
} {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "creonow-skill-p1-"));
  const userDataDir = path.join(tmpRoot, "user-data");
  const builtinSkillsDir = path.join(tmpRoot, "builtin-skills");
  const projectRoot = path.join(tmpRoot, "project-root");

  fs.mkdirSync(userDataDir, { recursive: true });
  fs.mkdirSync(builtinSkillsDir, { recursive: true });
  fs.mkdirSync(projectRoot, { recursive: true });

  const db = createProjectTestDb();
  ensureSkillsTable(db);
  ensureCustomSkillsTable(db);
  seedCurrentProject({ db, projectId: "project-1", projectRoot });

  writeSkillFile({
    scope: "builtin",
    builtinSkillsDir,
    userDataDir,
    projectRoot,
    packageId: "pkg.creonow.builtin",
    version: "1.0.0",
    skillDir: "rewrite",
    id: "builtin:rewrite",
    name: "改写",
  });

  writeSkillFile({
    scope: "global",
    builtinSkillsDir,
    userDataDir,
    projectRoot,
    packageId: "pkg.creonow.user.global",
    version: "1.0.0",
    skillDir: "formal-rewrite",
    id: "global:formal-rewrite",
    name: "正式风格改写",
  });

  writeSkillFile({
    scope: "project",
    builtinSkillsDir,
    userDataDir,
    projectRoot,
    packageId: "pkg.creonow.user.project",
    version: "1.0.0",
    skillDir: "formal-rewrite",
    id: "project:formal-rewrite",
    name: "正式风格改写",
  });

  return {
    tmpRoot,
    userDataDir,
    builtinSkillsDir,
    projectRoot,
    db,
  };
}

function insertCustomSkillRows(args: {
  db: ReturnType<typeof createProjectTestDb>;
  count: number;
  scope: "global" | "project";
  projectId: string | null;
  prefix: string;
}): void {
  const stmt = args.db.prepare(
    `
      INSERT INTO custom_skills (
        id,
        name,
        description,
        prompt_template,
        input_type,
        context_rules,
        scope,
        project_id,
        enabled,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
  );
  const ts = Date.now();
  for (let i = 0; i < args.count; i += 1) {
    const id = `${args.prefix}-${i}`;
    stmt.run(
      id,
      `Skill ${i}`,
      "seeded",
      "rewrite {{input}}",
      "selection",
      "{}",
      args.scope,
      args.projectId,
      1,
      ts,
      ts,
    );
  }
}

function insertProject(args: {
  db: ReturnType<typeof createProjectTestDb>;
  projectId: string;
  projectRoot: string;
}): void {
  const ts = Date.now();
  args.db
    .prepare(
      "INSERT INTO projects (project_id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    )
    .run(args.projectId, `Project ${args.projectId}`, args.projectRoot, ts, ts);
}

function switchCurrentProject(args: {
  db: ReturnType<typeof createProjectTestDb>;
  projectId: string;
}): void {
  args.db
    .prepare(
      "UPDATE settings SET value_json = ?, updated_at = ? WHERE scope = 'app' AND key = 'creonow.project.currentId'",
    )
    .run(JSON.stringify(args.projectId), Date.now());
}

/**
 * S4: 项目级技能覆盖全局技能 [ADDED]
 * should keep only the project-scoped version when names collide
 */
{
  const fixture = createFixture();
  try {
    const svc = createSkillService({
      db: fixture.db,
      userDataDir: fixture.userDataDir,
      builtinSkillsDir: fixture.builtinSkillsDir,
      logger: createNoopLogger(),
    });

    const listed = svc.list({ includeDisabled: true });
    assert.equal(listed.ok, true);
    if (!listed.ok) {
      throw new Error("expected skill list to succeed");
    }

    const formalRewriteRows = listed.data.items.filter(
      (item) => item.name === "正式风格改写",
    );

    assert.equal(formalRewriteRows.length, 1);
    assert.equal(formalRewriteRows[0]?.scope, "project");
  } finally {
    fixture.db.close();
    fs.rmSync(fixture.tmpRoot, { recursive: true, force: true });
  }
}

/**
 * S-P4: 自定义技能容量超限（全局 1000） [ADDED]
 * should return SKILL_CAPACITY_EXCEEDED when global custom skill count exceeds 1000
 */
{
  const fixture = createFixture();
  try {
    insertCustomSkillRows({
      db: fixture.db,
      count: 1000,
      scope: "global",
      projectId: null,
      prefix: "global-cap",
    });

    const svc = createSkillService({
      db: fixture.db,
      userDataDir: fixture.userDataDir,
      builtinSkillsDir: fixture.builtinSkillsDir,
      logger: createNoopLogger(),
    });

    const created = svc.createCustom({
      name: "overflow-global",
      description: "overflow",
      promptTemplate: "{{input}}",
      inputType: "selection",
      contextRules: {},
      scope: "global",
      enabled: true,
    });

    assert.equal(created.ok, false);
    if (created.ok) {
      throw new Error("expected global capacity guard to reject creation");
    }
    assert.equal(created.error.code, "SKILL_CAPACITY_EXCEEDED");
  } finally {
    fixture.db.close();
    fs.rmSync(fixture.tmpRoot, { recursive: true, force: true });
  }
}

/**
 * S-P4: 自定义技能容量超限（项目 500） [ADDED]
 * should return SKILL_CAPACITY_EXCEEDED when project custom skill count exceeds 500
 */
{
  const fixture = createFixture();
  try {
    insertCustomSkillRows({
      db: fixture.db,
      count: 500,
      scope: "project",
      projectId: "project-1",
      prefix: "project-cap",
    });

    const svc = createSkillService({
      db: fixture.db,
      userDataDir: fixture.userDataDir,
      builtinSkillsDir: fixture.builtinSkillsDir,
      logger: createNoopLogger(),
    });

    const created = svc.createCustom({
      name: "overflow-project",
      description: "overflow",
      promptTemplate: "{{input}}",
      inputType: "selection",
      contextRules: {},
      scope: "project",
      enabled: true,
    });

    assert.equal(created.ok, false);
    if (created.ok) {
      throw new Error("expected project capacity guard to reject creation");
    }
    assert.equal(created.error.code, "SKILL_CAPACITY_EXCEEDED");
  } finally {
    fixture.db.close();
    fs.rmSync(fixture.tmpRoot, { recursive: true, force: true });
  }
}

/**
 * S-P4: 跨项目技能越权访问阻断 [ADDED]
 * should return SKILL_SCOPE_VIOLATION and emit audit log for cross-project custom skill access
 */
{
  const fixture = createFixture();
  try {
    const securityLogs: Array<{ event: string; data?: Record<string, unknown> }> =
      [];
    const logger = {
      logPath: "<test>",
      info: (event: string, data?: Record<string, unknown>) => {
        securityLogs.push({ event, data });
      },
      error: () => {},
    };

    insertProject({
      db: fixture.db,
      projectId: "project-2",
      projectRoot: path.join(fixture.tmpRoot, "project-root-2"),
    });
    switchCurrentProject({ db: fixture.db, projectId: "project-2" });

    insertCustomSkillRows({
      db: fixture.db,
      count: 1,
      scope: "project",
      projectId: "project-1",
      prefix: "foreign-project-skill",
    });

    const svc = createSkillService({
      db: fixture.db,
      userDataDir: fixture.userDataDir,
      builtinSkillsDir: fixture.builtinSkillsDir,
      logger,
    });

    const resolved = svc.resolveForRun({ id: "foreign-project-skill-0" });
    assert.equal(resolved.ok, false);
    if (resolved.ok) {
      throw new Error("expected cross-project access to be blocked");
    }
    assert.equal(resolved.error.code, "SKILL_SCOPE_VIOLATION");
    assert.equal(
      securityLogs.some((item) => item.event === "skill_scope_violation"),
      true,
    );
  } finally {
    fixture.db.close();
    fs.rmSync(fixture.tmpRoot, { recursive: true, force: true });
  }
}

/**
 * S1/S2: custom skill manual create + AI flow persistence contract [ADDED]
 * should create/list custom skills and expose them to skill picker registry
 */
{
  const fixture = createFixture();
  try {
    const handlers = new Map<string, Handler>();
    const ipcMain = {
      handle(channel: string, handler: Handler): void {
        handlers.set(channel, handler);
      },
    } as unknown as IpcMain;

    registerSkillIpcHandlers({
      ipcMain,
      db: fixture.db,
      userDataDir: fixture.userDataDir,
      builtinSkillsDir: fixture.builtinSkillsDir,
      logger: createNoopLogger(),
    });

    const createHandler = handlers.get("skill:custom:create");
    assert.ok(createHandler, "missing handler: skill:custom:create");

    const created = (await createHandler(
      {},
      {
        name: "文言文转白话",
        description: "将文言文改写成现代白话文",
        promptTemplate: "请把下面内容转成白话文：\\n\\n{{input}}",
        inputType: "selection",
        contextRules: { style_guide: true },
        scope: "project",
        enabled: true,
      },
    )) as {
      ok: boolean;
      data?: {
        skill: { id: string; name: string; scope: "global" | "project" };
      };
    };

    assert.equal(created.ok, true);
    assert.equal(created.data?.skill.name, "文言文转白话");
    assert.equal(created.data?.skill.scope, "project");
    assert.ok(created.data?.skill.id);

    const listCustomHandler = handlers.get("skill:custom:list");
    assert.ok(listCustomHandler, "missing handler: skill:custom:list");

    const listedCustom = (await listCustomHandler({}, {})) as {
      ok: boolean;
      data?: { items: Array<{ id: string; name: string }> };
    };

    assert.equal(listedCustom.ok, true);
    assert.equal(listedCustom.data?.items.length, 1);
    assert.equal(listedCustom.data?.items[0]?.name, "文言文转白话");

    const listRegistryHandler = handlers.get("skill:registry:list");
    assert.ok(listRegistryHandler, "missing handler: skill:registry:list");

    const listedRegistry = (await listRegistryHandler(
      {},
      {
        includeDisabled: true,
      },
    )) as {
      ok: boolean;
      data?: { items: Array<{ id: string; name: string }> };
    };

    assert.equal(listedRegistry.ok, true);
    const customInPicker = listedRegistry.data?.items.find(
      (item) => item.name === "文言文转白话",
    );
    assert.ok(customInPicker);
    assert.match(customInPicker?.id ?? "", /^custom:/);
  } finally {
    fixture.db.close();
    fs.rmSync(fixture.tmpRoot, { recursive: true, force: true });
  }
}

/**
 * S4: zod-like runtime validation envelope for empty promptTemplate [ADDED]
 * should return VALIDATION_ERROR when promptTemplate is empty
 */
{
  const fixture = createFixture();
  try {
    const handlers = new Map<string, Handler>();
    const ipcMain = {
      handle(channel: string, handler: Handler): void {
        handlers.set(channel, handler);
      },
    } as unknown as IpcMain;

    registerSkillIpcHandlers({
      ipcMain,
      db: fixture.db,
      userDataDir: fixture.userDataDir,
      builtinSkillsDir: fixture.builtinSkillsDir,
      logger: createNoopLogger(),
    });

    const createHandler = handlers.get("skill:custom:create");
    assert.ok(createHandler, "missing handler: skill:custom:create");

    const invalid = (await createHandler(
      {},
      {
        name: "空模板技能",
        description: "invalid",
        promptTemplate: "   ",
        inputType: "selection",
        contextRules: {},
        scope: "project",
        enabled: true,
      },
    )) as {
      ok: boolean;
      error?: { code: string; message: string };
    };

    assert.equal(invalid.ok, false);
    assert.equal(invalid.error?.code, "VALIDATION_ERROR");
    assert.match(invalid.error?.message ?? "", /promptTemplate/);
  } finally {
    fixture.db.close();
    fs.rmSync(fixture.tmpRoot, { recursive: true, force: true });
  }
}

/**
 * S3/S5: toggle + scope-update IPC contracts [ADDED]
 * should support builtin toggle and project->global scope promotion
 */
{
  const fixture = createFixture();
  try {
    fs.rmSync(
      path.join(
        fixture.userDataDir,
        "skills",
        "packages",
        "pkg.creonow.user.global",
      ),
      { recursive: true, force: true },
    );

    const handlers = new Map<string, Handler>();

    const ipcMain = {
      handle(channel: string, handler: Handler): void {
        handlers.set(channel, handler);
      },
    } as unknown as IpcMain;

    const deprecatedWarnings: Array<{
      event: string;
      data?: Record<string, unknown>;
    }> = [];

    registerSkillIpcHandlers({
      ipcMain,
      db: fixture.db,
      userDataDir: fixture.userDataDir,
      builtinSkillsDir: fixture.builtinSkillsDir,
      logger: {
        logPath: "<test>",
        info: (event, data) => {
          if (event === "deprecated_field") {
            deprecatedWarnings.push({ event, data });
          }
        },
        error: () => undefined,
      },
    });

    assert.ok(handlers.has("skill:registry:toggle"));
    assert.ok(handlers.has("skill:custom:update"));

    const toggleHandler = handlers.get("skill:registry:toggle");
    assert.ok(toggleHandler, "missing handler: skill:registry:toggle");

    const toggledWithId = (await toggleHandler(
      {},
      {
        id: "builtin:rewrite",
        enabled: false,
      },
    )) as {
      ok: boolean;
      data?: { id: string; enabled: boolean };
    };

    assert.equal(toggledWithId.ok, true);
    assert.equal(toggledWithId.data?.id, "builtin:rewrite");
    assert.equal(toggledWithId.data?.enabled, false);
    assert.equal(deprecatedWarnings.length, 0);

    const toggledWithSkillId = (await toggleHandler(
      {},
      {
        skillId: "builtin:rewrite",
        enabled: true,
      },
    )) as {
      ok: boolean;
      data?: { id: string; enabled: boolean };
    };

    assert.equal(toggledWithSkillId.ok, true);
    assert.equal(toggledWithSkillId.data?.id, "builtin:rewrite");
    assert.equal(toggledWithSkillId.data?.enabled, true);
    assert.equal(deprecatedWarnings.length, 1);
    assert.equal(deprecatedWarnings[0]?.event, "deprecated_field");
    assert.equal(deprecatedWarnings[0]?.data?.field, "skillId");

    const toggledWithBoth = (await toggleHandler(
      {},
      {
        id: "builtin:rewrite",
        skillId: "builtin:continue",
        enabled: false,
      },
    )) as {
      ok: boolean;
      data?: { id: string; enabled: boolean };
    };

    assert.equal(toggledWithBoth.ok, true);
    assert.equal(toggledWithBoth.data?.id, "builtin:rewrite");
    assert.equal(toggledWithBoth.data?.enabled, false);
    assert.equal(deprecatedWarnings.length, 1);

    const promoteHandler = handlers.get("skill:custom:update");
    assert.ok(promoteHandler, "missing handler: skill:custom:update");

    const promoted = (await promoteHandler(
      {},
      {
        id: "project:formal-rewrite",
        scope: "global",
      },
    )) as {
      ok: boolean;
      data?: { id: string; scope: "global" | "project" };
    };

    assert.equal(promoted.ok, true);
    assert.equal(promoted.data?.id, "project:formal-rewrite");
    assert.equal(promoted.data?.scope, "global");

    const listHandler = handlers.get("skill:registry:list");
    assert.ok(listHandler, "missing handler: skill:registry:list");

    const listed = (await listHandler({}, { includeDisabled: true })) as {
      ok: boolean;
      data?: {
        items: Array<{ id: string; scope: "builtin" | "global" | "project" }>;
      };
    };

    assert.equal(listed.ok, true);
    const promotedRow = listed.data?.items.find(
      (item) => item.id === "project:formal-rewrite",
    );
    assert.equal(promotedRow?.scope, "global");
  } finally {
    fixture.db.close();
    fs.rmSync(fixture.tmpRoot, { recursive: true, force: true });
  }
}
