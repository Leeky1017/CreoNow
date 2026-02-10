import fs from "node:fs";
import path from "node:path";

import type Database from "better-sqlite3";

import type {
  IpcError,
  IpcErrorCode,
} from "../../../../../../packages/shared/types/ipc-generated";
import type { Logger } from "../../logging/logger";
import { createProjectService } from "../projects/projectService";
import {
  loadSkillFile,
  loadSkills,
  type LoadedSkill,
  type SkillFileRef,
} from "./skillLoader";
import type { SkillScope } from "./skillValidator";

type Ok<T> = { ok: true; data: T };
type Err = { ok: false; error: IpcError };
export type ServiceResult<T> = Ok<T> | Err;

export type SkillListItem = {
  id: string;
  name: string;
  scope: SkillScope;
  packageId: string;
  version: string;
  enabled: boolean;
  valid: boolean;
  error_code?: IpcErrorCode;
  error_message?: string;
};

export type SkillReadResult = {
  id: string;
  content: string;
};

export type SkillWriteResult = {
  id: string;
  scope: SkillScope;
  written: true;
};

export type SkillToggleResult = {
  id: string;
  enabled: boolean;
};

export type SkillCustomUpdateResult = {
  id: string;
  scope: "global" | "project";
};

export type SkillService = {
  list: (args: { includeDisabled?: boolean }) => ServiceResult<{
    items: SkillListItem[];
  }>;
  read: (args: { id: string }) => ServiceResult<SkillReadResult>;
  write: (args: {
    id: string;
    content: string;
  }) => ServiceResult<SkillWriteResult>;
  toggle: (args: {
    id: string;
    enabled: boolean;
  }) => ServiceResult<SkillToggleResult>;
  updateCustom: (args: {
    id: string;
    scope: "global" | "project";
  }) => ServiceResult<SkillCustomUpdateResult>;
  resolveForRun: (args: { id: string }) => ServiceResult<{
    skill: LoadedSkill;
    enabled: boolean;
  }>;
};

type SkillDbRow = {
  skillId: string;
  enabled: number;
};

function nowTs(): number {
  return Date.now();
}

/**
 * Build a stable IPC error object.
 *
 * Why: skills must surface deterministic, UI-displayable failures without throwing.
 */
function ipcError(code: IpcErrorCode, message: string, details?: unknown): Err {
  return { ok: false, error: { code, message, details } };
}

/**
 * Resolve the current project rootPath, if set.
 */
function getCurrentProjectRootPath(args: {
  db: Database.Database;
  userDataDir: string;
  logger: Logger;
}): ServiceResult<string | null> {
  const projectSvc = createProjectService({
    db: args.db,
    userDataDir: args.userDataDir,
    logger: args.logger,
  });
  const current = projectSvc.getCurrent();
  if (!current.ok) {
    if (current.error.code === "NOT_FOUND") {
      return { ok: true, data: null };
    }
    return current;
  }
  return { ok: true, data: current.data.rootPath };
}

/**
 * Read enabled flags for known skills.
 */
function readEnabledMap(
  db: Database.Database,
): ServiceResult<Map<string, boolean>> {
  try {
    const rows = db
      .prepare<
        [],
        SkillDbRow
      >("SELECT skill_id as skillId, enabled FROM skills")
      .all();
    const map = new Map<string, boolean>();
    for (const r of rows) {
      map.set(r.skillId, r.enabled === 1);
    }
    return { ok: true, data: map };
  } catch (error) {
    return ipcError(
      "DB_ERROR",
      "Failed to read skill state",
      error instanceof Error ? { message: error.message } : { error },
    );
  }
}

/**
 * Upsert skill state rows (enabled + validation status).
 */
function upsertSkillRows(args: {
  db: Database.Database;
  skills: LoadedSkill[];
  enabledMap: Map<string, boolean>;
}): ServiceResult<true> {
  try {
    const ts = nowTs();
    const stmt = args.db.prepare(
      "INSERT INTO skills (skill_id, enabled, valid, error_code, error_message, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(skill_id) DO UPDATE SET enabled = excluded.enabled, valid = excluded.valid, error_code = excluded.error_code, error_message = excluded.error_message, updated_at = excluded.updated_at",
    );

    args.db.transaction(() => {
      for (const s of args.skills) {
        const enabled = args.enabledMap.get(s.id) ?? true;
        stmt.run(
          s.id,
          enabled ? 1 : 0,
          s.valid ? 1 : 0,
          s.valid ? null : (s.error_code ?? "INVALID_ARGUMENT"),
          s.valid ? null : (s.error_message ?? "Invalid skill"),
          ts,
        );
      }
    })();

    return { ok: true, data: true };
  } catch (error) {
    return ipcError(
      "DB_ERROR",
      "Failed to persist skill state",
      error instanceof Error ? { message: error.message } : { error },
    );
  }
}

/**
 * Read a skill file from disk without leaking content to logs.
 */
function readSkillContent(filePath: string): ServiceResult<string> {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    return { ok: true, data: content };
  } catch (error) {
    return ipcError(
      "IO_ERROR",
      "Failed to read skill file",
      error instanceof Error ? { message: error.message } : { error },
    );
  }
}

/**
 * Write a skill file to disk, creating parent directories.
 */
function writeSkillContent(args: {
  filePath: string;
  content: string;
}): ServiceResult<true> {
  try {
    fs.mkdirSync(path.dirname(args.filePath), { recursive: true });
    fs.writeFileSync(args.filePath, args.content, "utf8");
    return { ok: true, data: true };
  } catch (error) {
    return ipcError(
      "IO_ERROR",
      "Failed to write skill file",
      error instanceof Error ? { message: error.message } : { error },
    );
  }
}

/**
 * Rewrite the YAML `scope` frontmatter field for scope promotion/demotion.
 *
 * Why: moved files must remain valid against directory scope validation.
 */
function rewriteFrontmatterScope(args: {
  content: string;
  scope: "global" | "project";
}): string {
  const normalized = args.content.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  if (lines[0]?.trim() !== "---") {
    return args.content;
  }

  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i]?.trim() === "---") {
      break;
    }
    if (lines[i]?.trim().startsWith("scope:")) {
      lines[i] = `scope: ${args.scope}`;
      return lines.join("\n");
    }
  }

  return args.content;
}

/**
 * Build a SkillFileRef from a loaded skill and a target scope root.
 */
function toScopeFileRef(args: {
  skill: LoadedSkill;
  scope: SkillScope;
  srcRoot: string;
  destRoot: string;
}): ServiceResult<SkillFileRef> {
  const rel = path.relative(args.srcRoot, args.skill.filePath);
  const isInside =
    rel.length > 0 && !rel.startsWith("..") && !path.isAbsolute(rel);
  if (!isInside) {
    return ipcError("INTERNAL", "Skill path is outside expected root");
  }

  const filePath = path.join(args.destRoot, rel);
  const skillDirName = path.basename(path.dirname(filePath));
  return {
    ok: true,
    data: {
      scope: args.scope,
      packageId: args.skill.packageId,
      version: args.skill.version,
      skillDirName,
      filePath,
    },
  };
}

/**
 * Resolve a root directory by scope from loaded roots.
 */
function scopeRoot(args: {
  scope: SkillScope;
  roots: {
    builtinSkillsDir: string;
    globalSkillsDir: string;
    projectSkillsDir: string | null;
  };
}): string | null {
  if (args.scope === "builtin") {
    return args.roots.builtinSkillsDir;
  }
  if (args.scope === "global") {
    return args.roots.globalSkillsDir;
  }
  return args.roots.projectSkillsDir;
}

/**
 * Remove a source skill file after a successful scope move.
 */
function removeSkillContent(filePath: string): ServiceResult<true> {
  try {
    fs.rmSync(filePath, { force: true });
    return { ok: true, data: true };
  } catch (error) {
    return ipcError(
      "IO_ERROR",
      "Failed to remove old skill file after scope update",
      error instanceof Error ? { message: error.message } : { error },
    );
  }
}

/**
 * Create the skills service.
 */
export function createSkillService(deps: {
  db: Database.Database;
  userDataDir: string;
  builtinSkillsDir: string;
  logger: Logger;
}): SkillService {
  const globalSkillsDir = path.join(deps.userDataDir, "skills");

  const resolveLoaded = (): ServiceResult<{
    skills: LoadedSkill[];
    enabledMap: Map<string, boolean>;
    roots: {
      builtinSkillsDir: string;
      globalSkillsDir: string;
      projectSkillsDir: string | null;
    };
  }> => {
    const projectRoot = getCurrentProjectRootPath({
      db: deps.db,
      userDataDir: deps.userDataDir,
      logger: deps.logger,
    });
    if (!projectRoot.ok) {
      return projectRoot;
    }

    const projectSkillsDir =
      projectRoot.data === null
        ? null
        : path.join(projectRoot.data, ".creonow", "skills");

    const loaded = loadSkills({
      logger: deps.logger,
      roots: {
        builtinSkillsDir: deps.builtinSkillsDir,
        globalSkillsDir,
        projectSkillsDir,
      },
    });
    if (!loaded.ok) {
      return loaded;
    }

    const enabledMapRes = readEnabledMap(deps.db);
    if (!enabledMapRes.ok) {
      return enabledMapRes;
    }

    const upserted = upsertSkillRows({
      db: deps.db,
      skills: loaded.data.skills,
      enabledMap: enabledMapRes.data,
    });
    if (!upserted.ok) {
      return upserted;
    }

    return {
      ok: true,
      data: {
        skills: loaded.data.skills,
        enabledMap: enabledMapRes.data,
        roots: {
          builtinSkillsDir: deps.builtinSkillsDir,
          globalSkillsDir,
          projectSkillsDir,
        },
      },
    };
  };

  return {
    list: ({ includeDisabled }) => {
      const loaded = resolveLoaded();
      if (!loaded.ok) {
        return loaded;
      }

      const items = loaded.data.skills
        .map((s): SkillListItem => {
          const enabled = loaded.data.enabledMap.get(s.id) ?? true;
          return {
            id: s.id,
            name: s.name,
            scope: s.scope,
            packageId: s.packageId,
            version: s.version,
            enabled,
            valid: s.valid,
            error_code: s.error_code,
            error_message: s.error_message,
          };
        })
        .filter((s) => (includeDisabled ? true : s.enabled));

      return { ok: true, data: { items } };
    },

    read: ({ id }) => {
      if (id.trim().length === 0) {
        return ipcError("INVALID_ARGUMENT", "id is required", {
          fieldName: "id",
        });
      }

      const loaded = resolveLoaded();
      if (!loaded.ok) {
        return loaded;
      }

      const skill = loaded.data.skills.find((s) => s.id === id) ?? null;
      if (!skill) {
        return ipcError("NOT_FOUND", "Skill not found", { id });
      }

      const content = readSkillContent(skill.filePath);
      if (!content.ok) {
        return content;
      }
      return { ok: true, data: { id, content: content.data } };
    },

    write: ({ id, content }) => {
      if (id.trim().length === 0) {
        return ipcError("INVALID_ARGUMENT", "id is required", {
          fieldName: "id",
        });
      }
      if (content.length === 0) {
        return ipcError("INVALID_ARGUMENT", "content is required", {
          fieldName: "content",
        });
      }

      const loaded = resolveLoaded();
      if (!loaded.ok) {
        return loaded;
      }

      const skill = loaded.data.skills.find((s) => s.id === id) ?? null;
      if (!skill) {
        return ipcError("NOT_FOUND", "Skill not found", { id });
      }

      const projectAvailable = loaded.data.roots.projectSkillsDir !== null;
      const targetScope: SkillScope =
        skill.scope === "project" || skill.scope === "global"
          ? skill.scope
          : projectAvailable
            ? "project"
            : "global";

      const targetRoot =
        targetScope === "project"
          ? loaded.data.roots.projectSkillsDir
          : loaded.data.roots.globalSkillsDir;
      if (targetRoot === null) {
        return ipcError(
          "NOT_FOUND",
          "No current project for project skill write",
        );
      }

      const srcRoot =
        skill.scope === "project"
          ? loaded.data.roots.projectSkillsDir
          : skill.scope === "global"
            ? loaded.data.roots.globalSkillsDir
            : loaded.data.roots.builtinSkillsDir;
      if (srcRoot === null) {
        return ipcError("INTERNAL", "Missing source root for skill");
      }

      const ref = toScopeFileRef({
        skill,
        scope: targetScope,
        srcRoot,
        destRoot: targetRoot,
      });
      if (!ref.ok) {
        return ref;
      }

      const written = writeSkillContent({
        filePath: ref.data.filePath,
        content,
      });
      if (!written.ok) {
        return written;
      }

      const reloaded = loadSkillFile({ ref: ref.data });
      const enabledMapRes = readEnabledMap(deps.db);
      if (!enabledMapRes.ok) {
        return enabledMapRes;
      }
      const upserted = upsertSkillRows({
        db: deps.db,
        skills: [reloaded],
        enabledMap: enabledMapRes.data,
      });
      if (!upserted.ok) {
        return upserted;
      }

      return { ok: true, data: { id, scope: targetScope, written: true } };
    },

    toggle: ({ id, enabled }) => {
      if (id.trim().length === 0) {
        return ipcError("INVALID_ARGUMENT", "id is required", {
          fieldName: "id",
        });
      }

      const loaded = resolveLoaded();
      if (!loaded.ok) {
        return loaded;
      }

      const skill = loaded.data.skills.find((s) => s.id === id) ?? null;
      if (!skill) {
        return ipcError("NOT_FOUND", "Skill not found", { id });
      }

      try {
        const ts = nowTs();
        deps.db
          .prepare(
            "INSERT INTO skills (skill_id, enabled, valid, error_code, error_message, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(skill_id) DO UPDATE SET enabled = excluded.enabled, updated_at = excluded.updated_at",
          )
          .run(
            id,
            enabled ? 1 : 0,
            skill.valid ? 1 : 0,
            skill.valid ? null : (skill.error_code ?? "INVALID_ARGUMENT"),
            skill.valid ? null : (skill.error_message ?? "Invalid skill"),
            ts,
          );

        deps.logger.info("skill_toggled", { id, enabled });
        return { ok: true, data: { id, enabled } };
      } catch (error) {
        deps.logger.error("skill_toggle_failed", {
          code: "DB_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return ipcError("DB_ERROR", "Failed to toggle skill");
      }
    },

    updateCustom: ({ id, scope }) => {
      if (id.trim().length === 0) {
        return ipcError("INVALID_ARGUMENT", "id is required", {
          fieldName: "id",
        });
      }
      if (scope !== "global" && scope !== "project") {
        return ipcError("INVALID_ARGUMENT", "scope must be global or project", {
          fieldName: "scope",
        });
      }

      const loaded = resolveLoaded();
      if (!loaded.ok) {
        return loaded;
      }

      const skill = loaded.data.skills.find((s) => s.id === id) ?? null;
      if (!skill) {
        return ipcError("NOT_FOUND", "Skill not found", { id });
      }

      if (skill.scope === "builtin") {
        return ipcError("UNSUPPORTED", "Builtin skills cannot change scope", {
          id,
        });
      }

      if (skill.scope === scope) {
        return { ok: true, data: { id, scope } };
      }

      const srcRoot = scopeRoot({
        scope: skill.scope,
        roots: loaded.data.roots,
      });
      const destRoot = scopeRoot({
        scope,
        roots: loaded.data.roots,
      });
      if (!srcRoot || !destRoot) {
        return ipcError("NOT_FOUND", "Project scope is unavailable", { scope });
      }

      const targetRef = toScopeFileRef({
        skill,
        scope,
        srcRoot,
        destRoot,
      });
      if (!targetRef.ok) {
        return targetRef;
      }

      const content = readSkillContent(skill.filePath);
      if (!content.ok) {
        return content;
      }

      const rewrittenContent = rewriteFrontmatterScope({
        content: content.data,
        scope,
      });

      const written = writeSkillContent({
        filePath: targetRef.data.filePath,
        content: rewrittenContent,
      });
      if (!written.ok) {
        return written;
      }

      if (targetRef.data.filePath !== skill.filePath) {
        const removed = removeSkillContent(skill.filePath);
        if (!removed.ok) {
          return removed;
        }
      }

      const reloaded = loadSkillFile({ ref: targetRef.data });
      const enabledMapRes = readEnabledMap(deps.db);
      if (!enabledMapRes.ok) {
        return enabledMapRes;
      }
      const upserted = upsertSkillRows({
        db: deps.db,
        skills: [reloaded],
        enabledMap: enabledMapRes.data,
      });
      if (!upserted.ok) {
        return upserted;
      }

      deps.logger.info("skill_scope_updated", {
        id,
        from: skill.scope,
        to: scope,
      });
      return { ok: true, data: { id, scope } };
    },

    resolveForRun: ({ id }) => {
      if (id.trim().length === 0) {
        return ipcError("INVALID_ARGUMENT", "id is required", {
          fieldName: "id",
        });
      }

      const loaded = resolveLoaded();
      if (!loaded.ok) {
        return loaded;
      }

      const skill = loaded.data.skills.find((s) => s.id === id) ?? null;
      if (!skill) {
        return ipcError("NOT_FOUND", "Skill not found", { id });
      }

      const enabled = loaded.data.enabledMap.get(id) ?? true;
      return { ok: true, data: { skill, enabled } };
    },
  };
}
