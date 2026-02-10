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

    registerSkillIpcHandlers({
      ipcMain,
      db: fixture.db,
      userDataDir: fixture.userDataDir,
      builtinSkillsDir: fixture.builtinSkillsDir,
      logger: createNoopLogger(),
    });

    assert.ok(handlers.has("skill:registry:toggle"));
    assert.ok(handlers.has("skill:custom:update"));

    const toggleHandler = handlers.get("skill:registry:toggle");
    assert.ok(toggleHandler, "missing handler: skill:registry:toggle");

    const toggled = (await toggleHandler(
      {},
      {
        skillId: "builtin:rewrite",
        enabled: false,
      },
    )) as {
      ok: boolean;
      data?: { id: string; enabled: boolean };
    };

    assert.equal(toggled.ok, true);
    assert.equal(toggled.data?.id, "builtin:rewrite");
    assert.equal(toggled.data?.enabled, false);

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
