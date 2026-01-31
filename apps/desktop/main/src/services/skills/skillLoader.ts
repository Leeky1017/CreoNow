import fs from "node:fs";
import path from "node:path";

import { parseDocument } from "yaml";

import type {
  IpcError,
  IpcErrorCode,
} from "../../../../../../packages/shared/types/ipc-generated";
import type { Logger } from "../../logging/logger";
import {
  validateSkillFrontmatter,
  type SkillFrontmatter,
  type SkillPrompt,
  type SkillScope,
} from "./skillValidator";

type Ok<T> = { ok: true; data: T };
type Err = { ok: false; error: IpcError };
export type ServiceResult<T> = Ok<T> | Err;

export type SkillFileRef = {
  scope: SkillScope;
  packageId: string;
  version: string;
  skillDirName: string;
  filePath: string;
};

export type LoadedSkill = {
  id: string;
  name: string;
  scope: SkillScope;
  packageId: string;
  version: string;
  filePath: string;
  valid: boolean;
  error_code?: IpcErrorCode;
  error_message?: string;
  prompt?: SkillPrompt;
  bodyMd?: string;
};

type JsonObject = Record<string, unknown>;

/**
 * Build a stable IPC error wrapper.
 *
 * Why: skill loading must be diagnosable and must not throw across IPC boundaries.
 */
function ipcError(code: IpcErrorCode, message: string, details?: unknown): Err {
  return { ok: false, error: { code, message, details } };
}

/**
 * Narrow an unknown value to a JSON object.
 */
function asObject(x: unknown): JsonObject | null {
  if (typeof x !== "object" || x === null || Array.isArray(x)) {
    return null;
  }
  return x as JsonObject;
}

/**
 * Split a SKILL.md file into YAML frontmatter and Markdown body.
 */
function splitFrontmatter(content: string): ServiceResult<{
  frontmatterText: string;
  bodyMd: string;
}> {
  const normalized = content.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  if (lines.length === 0 || lines[0]?.trim() !== "---") {
    return ipcError("INVALID_ARGUMENT", "Missing YAML frontmatter", {
      fieldName: "frontmatter",
    });
  }

  let endIndex = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i]?.trim() === "---") {
      endIndex = i;
      break;
    }
  }
  if (endIndex === -1) {
    return ipcError("INVALID_ARGUMENT", "Unterminated YAML frontmatter", {
      fieldName: "frontmatter",
    });
  }

  const frontmatterText = lines.slice(1, endIndex).join("\n");
  const bodyMd = lines.slice(endIndex + 1).join("\n").trimStart();
  return { ok: true, data: { frontmatterText, bodyMd } };
}

/**
 * Parse YAML frontmatter into an unknown object.
 *
 * Why: parser errors must be surfaced as readable, stable IPC errors.
 */
function parseYamlFrontmatter(frontmatterText: string): ServiceResult<unknown> {
  const doc = parseDocument(frontmatterText);
  if (doc.errors.length > 0) {
    const first = doc.errors[0];
    return ipcError(
      "INVALID_ARGUMENT",
      `Invalid YAML frontmatter: ${first.message}`,
    );
  }
  const parsed: unknown = doc.toJSON();
  return { ok: true, data: parsed };
}

/**
 * Enumerate sub-directories at a path.
 */
function listSubdirs(dirPath: string): string[] {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .filter((name) => !name.startsWith("."))
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

/**
 * Scan a scope packages directory and return discovered SKILL.md files.
 */
export function discoverSkillFiles(args: {
  scope: SkillScope;
  packagesDir: string;
}): SkillFileRef[] {
  const refs: SkillFileRef[] = [];

  const packageIds = listSubdirs(args.packagesDir);
  for (const packageId of packageIds) {
    const pkgDir = path.join(args.packagesDir, packageId);
    const versions = listSubdirs(pkgDir);
    for (const version of versions) {
      const skillsDir = path.join(pkgDir, version, "skills");
      const skillNames = listSubdirs(skillsDir);
      for (const skillDirName of skillNames) {
        const filePath = path.join(skillsDir, skillDirName, "SKILL.md");
        if (!fs.existsSync(filePath)) {
          continue;
        }
        refs.push({
          scope: args.scope,
          packageId,
          version,
          skillDirName,
          filePath,
        });
      }
    }
  }

  return refs;
}

/**
 * Load and validate a single SKILL.md file.
 */
export function loadSkillFile(args: {
  ref: SkillFileRef;
}): LoadedSkill {
  const inferredId = `${args.ref.scope}:${args.ref.skillDirName}`;

  let raw: string;
  try {
    raw = fs.readFileSync(args.ref.filePath, "utf8");
  } catch (error) {
    return {
      id: inferredId,
      name: inferredId,
      scope: args.ref.scope,
      packageId: args.ref.packageId,
      version: args.ref.version,
      filePath: args.ref.filePath,
      valid: false,
      error_code: "IO_ERROR",
      error_message:
        error instanceof Error ? error.message : "Failed to read skill file",
    };
  }

  const split = splitFrontmatter(raw);
  if (!split.ok) {
    return {
      id: inferredId,
      name: inferredId,
      scope: args.ref.scope,
      packageId: args.ref.packageId,
      version: args.ref.version,
      filePath: args.ref.filePath,
      valid: false,
      error_code: split.error.code,
      error_message: split.error.message,
    };
  }

  const parsedYaml = parseYamlFrontmatter(split.data.frontmatterText);
  if (!parsedYaml.ok) {
    return {
      id: inferredId,
      name: inferredId,
      scope: args.ref.scope,
      packageId: args.ref.packageId,
      version: args.ref.version,
      filePath: args.ref.filePath,
      valid: false,
      error_code: parsedYaml.error.code,
      error_message: parsedYaml.error.message,
    };
  }

  const validated = validateSkillFrontmatter({
    frontmatter: parsedYaml.data,
    inferred: {
      scope: args.ref.scope,
      packageId: args.ref.packageId,
      version: args.ref.version,
    },
  });

  const frontmatterObj = asObject(parsedYaml.data);
  const idFromYaml =
    frontmatterObj && typeof frontmatterObj.id === "string"
      ? frontmatterObj.id
      : inferredId;
  const nameFromYaml =
    frontmatterObj && typeof frontmatterObj.name === "string"
      ? frontmatterObj.name
      : idFromYaml;

  if (!validated.ok) {
    return {
      id: idFromYaml,
      name: nameFromYaml,
      scope: args.ref.scope,
      packageId: args.ref.packageId,
      version: args.ref.version,
      filePath: args.ref.filePath,
      valid: false,
      error_code: validated.error.code,
      error_message: validated.error.message,
    };
  }

  return toLoadedSkill({
    frontmatter: validated.data,
    filePath: args.ref.filePath,
    bodyMd: split.data.bodyMd,
  });
}

/**
 * Convert validated frontmatter into a LoadedSkill.
 */
function toLoadedSkill(args: {
  frontmatter: SkillFrontmatter;
  filePath: string;
  bodyMd: string;
}): LoadedSkill {
  return {
    id: args.frontmatter.id,
    name: args.frontmatter.name,
    scope: args.frontmatter.scope,
    packageId: args.frontmatter.packageId,
    version: args.frontmatter.version,
    filePath: args.filePath,
    valid: true,
    prompt: args.frontmatter.prompt,
    bodyMd: args.bodyMd,
  };
}

/**
 * Merge multiple skills into an id->SSOT set using scope precedence.
 *
 * Why: "single chain" — each final id must have exactly one source of truth.
 */
export function selectSkillSsot(skills: LoadedSkill[]): LoadedSkill[] {
  const priority: Record<SkillScope, number> = {
    builtin: 1,
    global: 2,
    project: 3,
  };

  const byId = new Map<string, LoadedSkill>();
  for (const s of skills) {
    const existing = byId.get(s.id);
    if (!existing) {
      byId.set(s.id, s);
      continue;
    }

    const nextWins = priority[s.scope] > priority[existing.scope];
    if (nextWins) {
      byId.set(s.id, s);
      continue;
    }

    const samePriority = priority[s.scope] === priority[existing.scope];
    if (samePriority) {
      const keep = existing.filePath.localeCompare(s.filePath) <= 0;
      byId.set(s.id, keep ? existing : s);
    }
  }

  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Load skills from builtin/global/project roots and emit observability logs.
 */
export function loadSkills(deps: {
  logger: Logger;
  roots: {
    builtinSkillsDir: string;
    globalSkillsDir: string;
    projectSkillsDir: string | null;
  };
}): ServiceResult<{ skills: LoadedSkill[] }> {
  try {
    const builtinRefs = discoverSkillFiles({
      scope: "builtin",
      packagesDir: path.join(deps.roots.builtinSkillsDir, "packages"),
    });
    const globalRefs = discoverSkillFiles({
      scope: "global",
      packagesDir: path.join(deps.roots.globalSkillsDir, "packages"),
    });
    const projectRefs =
      deps.roots.projectSkillsDir === null
        ? []
        : discoverSkillFiles({
            scope: "project",
            packagesDir: path.join(deps.roots.projectSkillsDir, "packages"),
          });

    const loaded = [...builtinRefs, ...globalRefs, ...projectRefs].map((ref) =>
      loadSkillFile({ ref }),
    );

    const ssot = selectSkillSsot(loaded);
    deps.logger.info("skill_loaded", { count: ssot.length });
    for (const s of ssot) {
      if (!s.valid) {
        deps.logger.info("skill_invalid", {
          id: s.id,
          error_code: s.error_code,
        });
      }
    }

    return { ok: true, data: { skills: ssot } };
  } catch (error) {
    deps.logger.error("skill_load_failed", {
      code: "IO_ERROR",
      message: error instanceof Error ? error.message : String(error),
    });
    return ipcError("IO_ERROR", "Failed to load skills");
  }
}

