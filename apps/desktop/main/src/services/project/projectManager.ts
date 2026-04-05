/**
 * ProjectManager — 项目 CRUD 与多文档管理
 * Spec: openspec/specs/project-management/spec.md — P3
 */

import { access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import path from "node:path";

// ─── Types ──────────────────────────────────────────────────────────

export interface ProjectStyleConfig {
  narrativePerson: "first" | "third-limited" | "third-omniscient";
  genre: string;
  languageStyle: string;
  tone: string;
  targetAudience: string;
}

export interface ProjectGoals {
  targetWordCount: number;
  targetChapterCount: number;
}

export interface ProjectConfig {
  id: string;
  name: string;
  type: string;
  description: string;
  stage: string;
  lifecycleStatus: "active" | "archived" | "deleted";
  style: ProjectStyleConfig;
  goals: ProjectGoals;
  defaultSkillSetId: string | null;
  knowledgeGraphId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectDocument {
  id: string;
  projectId: string;
  title: string;
  type: string;
  order: number;
  parentId: string | null;
  status: string;
  wordCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectOverview {
  projectId: string;
  totalWordCount: number;
  documentCount: number;
  chapterCount: number;
  characterCount: number;
  locationCount: number;
  lastEditedAt: number;
}

type Result<T> =
  | { success: true; data?: T; error?: undefined }
  | { success: false; data?: undefined; error: { code: string; message: string } };

export interface ProjectManager {
  createProject(config: ProjectConfig): Promise<Result<ProjectConfig>>;
  getProject(id: string): Promise<Result<ProjectConfig>>;
  updateProject(id: string, updates: Partial<ProjectConfig>): Promise<Result<ProjectConfig>>;
  deleteProject(id: string): Promise<Result<void>>;
  archiveProject(id: string): Promise<Result<void>>;
  restoreProject(id: string): Promise<Result<void>>;
  purgeProject(id: string, opts: { outputPath: string }): Promise<Result<void>>;
  switchProject(id: string): Promise<Result<void>>;

  addDocument(doc: ProjectDocument): Promise<Result<ProjectDocument>>;
  listDocuments(projectId: string, filter?: { type?: string }): Promise<Result<ProjectDocument[]>>;
  removeDocument(projectId: string, docId: string): Promise<Result<void>>;
  reorderDocuments(projectId: string, orders: Array<{ id: string; order: number }>): Promise<Result<void>>;

  getStyleConfig(projectId: string): Promise<Result<ProjectStyleConfig>>;
  getOverview(projectId: string): Promise<Result<ProjectOverview>>;

  dispose(): void;
}

interface DbStatement {
  run(...args: unknown[]): unknown;
  get(...args: unknown[]): Record<string, unknown> | undefined;
  all(...args: unknown[]): Record<string, unknown>[];
}

interface DbLike {
  prepare(sql: string): DbStatement;
  exec(sql: string): void;
  transaction(fn: () => void): () => void;
}

interface EventBusLike {
  emit(event: Record<string, unknown>): void;
  on(event: string, handler: (payload: Record<string, unknown>) => void): void;
  off(event: string, handler: (payload: Record<string, unknown>) => void): void;
}

export interface ProjectSwitchParticipant {
  name: string;
  timeoutMs?: number;
  unbind?: (projectId: string) => Promise<void> | void;
  bind?: (projectId: string) => Promise<void> | void;
}

interface Deps {
  db: DbLike;
  eventBus: EventBusLike;
  initialProjects?: ProjectConfig[];
  initialDocuments?: ProjectDocument[];
  switchParticipants?: ProjectSwitchParticipant[];
  flushPendingAutosave?: (projectId: string) => Promise<void> | void;
  persistActiveProjectId?: (projectId: string) => Promise<void> | void;
  permissionProbe?: (outputPath: string) => Promise<void>;
  now?: () => number;
}

// ─── Constants ──────────────────────────────────────────────────────

const MAX_PROJECTS = 2000;
const DEFAULT_SWITCH_TIMEOUT_MS = 1000;
const PROJECT_CONFIG_SETTINGS_KEY = "creonow.project.config";

// ─── Helpers ────────────────────────────────────────────────────────

function cloneProject(project: ProjectConfig): ProjectConfig {
  return {
    ...project,
    style: { ...project.style },
    goals: { ...project.goals },
  };
}

function cloneDocument(doc: ProjectDocument): ProjectDocument {
  return { ...doc };
}

function defaultPermissionProbe(outputPath: string): Promise<void> {
  const targetDir = path.dirname(outputPath);
  return access(targetDir, fsConstants.W_OK);
}

function countWordsFromText(text: string): number {
  let count = 0;
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if ((code >= 0x4E00 && code <= 0x9FFF) || (code >= 0x3400 && code <= 0x4DBF)) {
      count += 1;
    }
  }
  const asciiWords = text
    .replace(/[\u4E00-\u9FFF\u3400-\u4DBF]/g, "")
    .split(/\s+/u)
    .filter((word) => word.length > 0);
  return count + asciiWords.length;
}

async function withTimeout<T>(
  task: Promise<T>,
  timeoutMs: number,
  onTimeoutMessage: string,
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      task,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(onTimeoutMessage)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

// ─── Implementation ─────────────────────────────────────────────────

export function createProjectManager(deps: Deps): ProjectManager {
  const { db, eventBus } = deps;
  const now = deps.now ?? (() => Date.now());

  let disposed = false;
  let currentProjectId: string | null = deps.initialProjects?.[0]?.id ?? null;
  let switchQueue: Promise<void> = Promise.resolve();

  const projects = new Map<string, ProjectConfig>();
  const documents = new Map<string, ProjectDocument[]>();

  for (const project of deps.initialProjects ?? []) {
    projects.set(project.id, cloneProject(project));
  }
  for (const doc of deps.initialDocuments ?? []) {
    const list = documents.get(doc.projectId) ?? [];
    list.push(cloneDocument(doc));
    documents.set(doc.projectId, list);
  }

  try {
    db.exec(
      "CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, name TEXT, type TEXT, description TEXT, stage TEXT, lifecycleStatus TEXT, style TEXT, goals TEXT, defaultSkillSetId TEXT, knowledgeGraphId TEXT, createdAt INTEGER, updatedAt INTEGER)",
    );
    db.exec(
      "CREATE TABLE IF NOT EXISTS documents (id TEXT PRIMARY KEY, projectId TEXT, title TEXT, type TEXT, order_ INTEGER, parentId TEXT, status TEXT, wordCount INTEGER, createdAt INTEGER, updatedAt INTEGER)",
    );
  } catch {
    // mock db
  }

  function throwIfDisposed(): void {
    if (disposed) {
      throw new Error("ProjectManager is disposed");
    }
  }

  function getProjectOrNull(id: string): ProjectConfig | null {
    const project = projects.get(id);
    return project ? cloneProject(project) : null;
  }

  function getMutableProject(id: string): ProjectConfig | undefined {
    return projects.get(id);
  }

  function readProjectSnapshot(projectId: string): Partial<ProjectConfig> | null {
    try {
      const row = db
        .prepare(
          "SELECT value_json as valueJson FROM settings WHERE scope = ? AND key = ?",
        )
        .get(`project:${projectId}`, PROJECT_CONFIG_SETTINGS_KEY);
      if (!row || typeof row.valueJson !== "string") {
        return null;
      }
      const parsed: unknown = JSON.parse(row.valueJson);
      return typeof parsed === "object" && parsed !== null
        ? (parsed as Partial<ProjectConfig>)
        : null;
    } catch {
      return null;
    }
  }

  function writeProjectSnapshot(project: ProjectConfig): void {
    try {
      db.prepare(
        "INSERT INTO settings (scope, key, value_json, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(scope, key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at",
      ).run(
        `project:${project.id}`,
        PROJECT_CONFIG_SETTINGS_KEY,
        JSON.stringify(project),
        project.updatedAt,
      );
    } catch {
      // mock db / legacy schema
    }
  }

  function rowToPersistentProjectConfig(
    row: Record<string, unknown> | undefined,
  ): ProjectConfig | null {
    if (!row) {
      return null;
    }
    const projectId =
      typeof row.projectId === "string"
        ? row.projectId
        : typeof row.id === "string"
          ? row.id
          : null;
    if (!projectId) {
      return null;
    }

    const snapshot = readProjectSnapshot(projectId);
    const lifecycleStatus =
      typeof row.lifecycleStatus === "string"
        ? (row.lifecycleStatus as ProjectConfig["lifecycleStatus"])
        : row.archivedAt === null || row.archivedAt === undefined
          ? "active"
          : "archived";
    const parsedStyle =
      typeof row.style === "string"
        ? (JSON.parse(row.style) as Partial<ProjectStyleConfig>)
        : {};
    const parsedGoals =
      typeof row.goals === "string"
        ? (JSON.parse(row.goals) as Partial<ProjectGoals>)
        : {};

    return {
      id: projectId,
      name: typeof row.name === "string" ? row.name : snapshot?.name ?? "",
      type: typeof row.type === "string" ? row.type : snapshot?.type ?? "novel",
      description:
        typeof row.description === "string"
          ? row.description
          : snapshot?.description ?? "",
      stage: typeof row.stage === "string" ? row.stage : snapshot?.stage ?? "draft",
      lifecycleStatus:
        (snapshot?.lifecycleStatus as ProjectConfig["lifecycleStatus"] | undefined) ??
        lifecycleStatus,
      style: {
        narrativePerson:
        (typeof row.narrativePerson === "string"
            ? (row.narrativePerson as ProjectStyleConfig["narrativePerson"])
            : parsedStyle.narrativePerson) ??
          snapshot?.style?.narrativePerson ??
          "first",
        genre:
          parsedStyle.genre ?? snapshot?.style?.genre ?? "",
        languageStyle:
          (typeof row.languageStyle === "string"
            ? row.languageStyle
            : parsedStyle.languageStyle) ??
          snapshot?.style?.languageStyle ??
          "",
        tone:
          parsedStyle.tone ?? snapshot?.style?.tone ?? "",
        targetAudience:
          (typeof row.targetAudience === "string"
            ? row.targetAudience
            : parsedStyle.targetAudience) ??
          snapshot?.style?.targetAudience ??
          "",
      },
      goals: {
        targetWordCount:
          (typeof row.targetWordCount === "number"
            ? row.targetWordCount
            : parsedGoals.targetWordCount) ??
          snapshot?.goals?.targetWordCount ??
          0,
        targetChapterCount:
          (typeof row.targetChapterCount === "number"
            ? row.targetChapterCount
            : parsedGoals.targetChapterCount) ??
          snapshot?.goals?.targetChapterCount ??
          0,
      },
      defaultSkillSetId:
        (typeof row.defaultSkillSetId === "string" || row.defaultSkillSetId === null
          ? (row.defaultSkillSetId as string | null)
          : snapshot?.defaultSkillSetId) ?? null,
      knowledgeGraphId:
        (typeof row.knowledgeGraphId === "string" || row.knowledgeGraphId === null
          ? (row.knowledgeGraphId as string | null)
          : snapshot?.knowledgeGraphId) ?? null,
      createdAt:
        (typeof row.createdAt === "number" ? row.createdAt : snapshot?.createdAt) ?? 0,
      updatedAt:
        (typeof row.updatedAt === "number" ? row.updatedAt : snapshot?.updatedAt) ?? 0,
    };
  }

  function loadProjectFromDb(id: string): ProjectConfig | null {
    try {
      const persistentRow = db
        .prepare(
          "SELECT project_id as projectId, name, type, description, stage, target_word_count as targetWordCount, target_chapter_count as targetChapterCount, narrative_person as narrativePerson, language_style as languageStyle, target_audience as targetAudience, default_skill_set_id as defaultSkillSetId, knowledge_graph_id as knowledgeGraphId, created_at as createdAt, updated_at as updatedAt, archived_at as archivedAt FROM projects WHERE project_id = ?",
        )
        .get(id);
      const persistentProject = rowToPersistentProjectConfig(persistentRow);
      if (persistentProject) {
        return persistentProject;
      }
    } catch {
      // fallback to legacy schema below
    }

    try {
      const legacyRow = db
        .prepare(
          "SELECT id, name, type, description, stage, lifecycleStatus, style, goals, defaultSkillSetId, knowledgeGraphId, createdAt, updatedAt FROM projects WHERE id = ?",
        )
        .get(id);
      return rowToPersistentProjectConfig(legacyRow);
    } catch {
      return null;
    }
  }

  function ensureProjectLoaded(id: string): ProjectConfig | null {
    const existing = getProjectOrNull(id);
    if (existing) {
      return existing;
    }
    const loaded = loadProjectFromDb(id);
    if (loaded) {
      projects.set(id, cloneProject(loaded));
      return cloneProject(loaded);
    }
    return null;
  }

  function loadDocumentsFromDb(projectId: string): ProjectDocument[] {
    try {
      const rows = db
        .prepare(
          "SELECT document_id as id, project_id as projectId, title, content_text as contentText, created_at as createdAt, updated_at as updatedAt FROM documents WHERE project_id = ? ORDER BY updated_at DESC, document_id ASC",
        )
        .all(projectId);
      if (rows.length > 0) {
        return rows.map((row, index) => ({
          id: String(row.id ?? ""),
          projectId: String(row.projectId ?? projectId),
          title: String(row.title ?? ""),
          type: "chapter",
          order: index + 1,
          parentId: null,
          status: "draft",
          wordCount: countWordsFromText(
            typeof row.contentText === "string" ? row.contentText : "",
          ),
          createdAt: typeof row.createdAt === "number" ? row.createdAt : 0,
          updatedAt: typeof row.updatedAt === "number" ? row.updatedAt : 0,
        }));
      }
    } catch {
      // fallback to legacy schema below
    }

    try {
      const rows = db
        .prepare(
          "SELECT id, projectId, title, type, order_ as orderValue, parentId, status, wordCount, createdAt, updatedAt FROM documents WHERE projectId = ? ORDER BY order_ ASC, id ASC",
        )
        .all(projectId);
      return rows.map((row) => ({
        id: String(row.id ?? ""),
        projectId: String(row.projectId ?? projectId),
        title: String(row.title ?? ""),
        type: String(row.type ?? "chapter"),
        order: typeof row.orderValue === "number" ? row.orderValue : 0,
        parentId:
          typeof row.parentId === "string" || row.parentId === null
            ? (row.parentId as string | null)
            : null,
        status: String(row.status ?? "draft"),
        wordCount: typeof row.wordCount === "number" ? row.wordCount : 0,
        createdAt: typeof row.createdAt === "number" ? row.createdAt : 0,
        updatedAt: typeof row.updatedAt === "number" ? row.updatedAt : 0,
      }));
    } catch {
      return [];
    }
  }

  function ensureDocumentsLoaded(projectId: string): ProjectDocument[] {
    const existing = documents.get(projectId);
    if (existing && existing.length > 0) {
      return sortDocuments(existing);
    }
    const loaded = loadDocumentsFromDb(projectId);
    if (loaded.length > 0) {
      documents.set(projectId, loaded.map(cloneDocument));
      return sortDocuments(loaded);
    }
    return sortDocuments(existing ?? []);
  }

  function sortDocuments(list: ProjectDocument[]): ProjectDocument[] {
    return [...list].sort((left, right) => left.order - right.order);
  }

  function emitProjectConfigUpdated(projectId: string, changedFields: string[]): void {
    eventBus.emit({
      type: "project-config-updated",
      projectId,
      changedFields,
      timestamp: now(),
    });
  }

  async function createDefaultChapter(projectId: string): Promise<void> {
    const timestamp = now();
    const defaultDoc: ProjectDocument = {
      id: `${projectId}-chapter-1`,
      projectId,
      title: "未命名章节",
      type: "chapter",
      order: 1,
      parentId: null,
      status: "draft",
      wordCount: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const list = documents.get(projectId) ?? [];
    if (list.some((doc) => doc.id === defaultDoc.id)) {
      return;
    }

    list.push(defaultDoc);
    documents.set(projectId, list);

    try {
      db.prepare(
        "INSERT INTO documents (id, projectId, title, type, order_, parentId, status, wordCount, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?)",
      ).run(
        defaultDoc.id,
        defaultDoc.projectId,
        defaultDoc.title,
        defaultDoc.type,
        defaultDoc.order,
        defaultDoc.parentId,
        defaultDoc.status,
        defaultDoc.wordCount,
        defaultDoc.createdAt,
        defaultDoc.updatedAt,
      );
    } catch {
      // mock db
    }
  }

  async function runParticipants(
    phase: "bind" | "unbind",
    projectId: string,
  ): Promise<void> {
    for (const participant of deps.switchParticipants ?? []) {
      const hook = phase === "bind" ? participant.bind : participant.unbind;
      if (!hook) {
        continue;
      }
      await withTimeout(
        Promise.resolve(hook(projectId)),
        participant.timeoutMs ?? DEFAULT_SWITCH_TIMEOUT_MS,
        `Project switch ${phase} timeout: ${participant.name}`,
      );
    }
  }

  async function persistActiveProjectId(projectId: string): Promise<void> {
    try {
      db.prepare("UPDATE projects SET updatedAt = updatedAt WHERE id = ?").run(projectId);
    } catch {
      // mock db
    }
    if (deps.persistActiveProjectId) {
      await Promise.resolve(deps.persistActiveProjectId(projectId));
    }
    currentProjectId = projectId;
  }

  function countProjects(): number {
    let total = projects.size;
    try {
      const row = db.prepare("SELECT COUNT(*) as count FROM projects").get();
      if (row && typeof row.count === "number") {
        total = Math.max(total, row.count);
      }
    } catch {
      // mock db
    }
    return total;
  }

  const manager: ProjectManager = {
    async createProject(config: ProjectConfig): Promise<Result<ProjectConfig>> {
      throwIfDisposed();

      if (config.name.trim().length === 0) {
        return {
          success: false,
          error: { code: "PROJECT_CONFIG_INVALID", message: "项目名称不能为空" },
        };
      }

      if (config.style.genre.trim().length === 0) {
        return {
          success: false,
          error: { code: "PROJECT_GENRE_REQUIRED", message: "项目类型不能为空" },
        };
      }

      for (const project of projects.values()) {
        if (project.name === config.name) {
          return {
            success: false,
            error: { code: "PROJECT_NAME_CONFLICT", message: "项目名称已存在" },
          };
        }
      }

      if (countProjects() >= MAX_PROJECTS) {
        return {
          success: false,
          error: { code: "PROJECT_CAPACITY_EXCEEDED", message: "项目数量已达上限" },
        };
      }

      const persisted = cloneProject(config);
      projects.set(config.id, persisted);

      try {
        db.prepare(
          "INSERT INTO projects (id, name, type, description, stage, lifecycleStatus, style, goals, defaultSkillSetId, knowledgeGraphId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        ).run(
          persisted.id,
          persisted.name,
          persisted.type,
          persisted.description,
          persisted.stage,
          persisted.lifecycleStatus,
          JSON.stringify(persisted.style),
          JSON.stringify(persisted.goals),
          persisted.defaultSkillSetId,
          persisted.knowledgeGraphId,
          persisted.createdAt,
          persisted.updatedAt,
        );
      } catch {
        // mock db
      }
      writeProjectSnapshot(persisted);

      await createDefaultChapter(config.id);

      if (currentProjectId === null) {
        currentProjectId = config.id;
      }

      emitProjectConfigUpdated(config.id, ["name", "style", "goals"]);
      return { success: true, data: cloneProject(persisted) };
    },

    async getProject(id: string): Promise<Result<ProjectConfig>> {
      throwIfDisposed();

      const project = ensureProjectLoaded(id);
      if (!project) {
        return { success: false, error: { code: "PROJECT_NOT_FOUND", message: "项目不存在" } };
      }

      return { success: true, data: project };
    },

    async updateProject(id: string, updates: Partial<ProjectConfig>): Promise<Result<ProjectConfig>> {
      throwIfDisposed();

      const loaded = ensureProjectLoaded(id);
      const existing = loaded ? getMutableProject(id) : undefined;
      if (!existing) {
        return { success: false, error: { code: "PROJECT_NOT_FOUND", message: "项目不存在" } };
      }

      const updated: ProjectConfig = {
        ...existing,
        ...updates,
        style: updates.style
          ? { ...existing.style, ...updates.style }
          : { ...existing.style },
        goals: updates.goals
          ? { ...existing.goals, ...updates.goals }
          : { ...existing.goals },
        updatedAt: now(),
      };
      projects.set(id, updated);

      let wrotePersistentSchema = false;
      try {
        db.prepare(
          "UPDATE projects SET name = ?, type = ?, description = ?, stage = ?, target_word_count = ?, target_chapter_count = ?, narrative_person = ?, language_style = ?, target_audience = ?, default_skill_set_id = ?, knowledge_graph_id = ?, archived_at = ?, updated_at = ? WHERE project_id = ?",
        ).run(
          updated.name,
          updated.type,
          updated.description,
          updated.stage,
          updated.goals.targetWordCount,
          updated.goals.targetChapterCount,
          updated.style.narrativePerson,
          updated.style.languageStyle,
          updated.style.targetAudience,
          updated.defaultSkillSetId,
          updated.knowledgeGraphId,
          updated.lifecycleStatus === "archived" ? updated.updatedAt : null,
          updated.updatedAt,
          id,
        );
        wrotePersistentSchema = true;
      } catch {
        // fallback to legacy schema below
      }
      if (!wrotePersistentSchema) {
        try {
          db.prepare(
            "UPDATE projects SET name=?, type=?, description=?, stage=?, lifecycleStatus=?, style=?, goals=?, defaultSkillSetId=?, knowledgeGraphId=?, updatedAt=? WHERE id=?",
          ).run(
            updated.name,
            updated.type,
            updated.description,
            updated.stage,
            updated.lifecycleStatus,
            JSON.stringify(updated.style),
            JSON.stringify(updated.goals),
            updated.defaultSkillSetId,
            updated.knowledgeGraphId,
            updated.updatedAt,
            id,
          );
        } catch {
          // mock db
        }
      }
      writeProjectSnapshot(updated);

      emitProjectConfigUpdated(id, Object.keys(updates));
      return { success: true, data: cloneProject(updated) };
    },

    async deleteProject(id: string): Promise<Result<void>> {
      throwIfDisposed();

      const project = getMutableProject(id);
      if (!project) {
        return { success: false, error: { code: "NOT_FOUND", message: "项目已删除" } };
      }

      if (project.lifecycleStatus !== "archived") {
        return {
          success: false,
          error: { code: "PROJECT_DELETE_REQUIRES_ARCHIVE", message: "请先归档项目再删除" },
        };
      }

      try {
        const txn = db.transaction(() => {
          db.prepare("DELETE FROM settings WHERE projectId = ?").run(id);
          db.prepare("DELETE FROM settings WHERE scope = ? AND key = ?").run(
            `project:${id}`,
            PROJECT_CONFIG_SETTINGS_KEY,
          );
          db.prepare("DELETE FROM memory WHERE projectId = ?").run(id);
          db.prepare("DELETE FROM search_fts WHERE projectId = ?").run(id);
          db.prepare("DELETE FROM search_index WHERE projectId = ?").run(id);
          db.prepare("DELETE FROM versions WHERE projectId = ?").run(id);
          db.prepare("DELETE FROM documents WHERE projectId = ?").run(id);
          db.prepare("DELETE FROM projects WHERE id = ?").run(id);
        });
        txn();
      } catch (error) {
        return {
          success: false,
          error: {
            code: "PROJECT_LIFECYCLE_WRITE_FAILED",
            message: error instanceof Error ? error.message : String(error),
          },
        };
      }

      projects.delete(id);
      documents.delete(id);
      if (currentProjectId === id) {
        currentProjectId = null;
      }

      return { success: true };
    },

    async archiveProject(id: string): Promise<Result<void>> {
      throwIfDisposed();

      const project = getMutableProject(id);
      if (!project) {
        return { success: false, error: { code: "PROJECT_NOT_FOUND", message: "项目不存在" } };
      }
      if (project.lifecycleStatus !== "active") {
        return {
          success: false,
          error: {
            code: "PROJECT_LIFECYCLE_WRITE_FAILED",
            message: "只有 active 状态的项目可以归档",
          },
        };
      }

      try {
        db.prepare("UPDATE projects SET lifecycleStatus = 'archived' WHERE id = ?").run(id);
      } catch (error) {
        return {
          success: false,
          error: {
            code: "PROJECT_LIFECYCLE_WRITE_FAILED",
            message: error instanceof Error ? error.message : String(error),
          },
        };
      }

      project.lifecycleStatus = "archived";
      project.updatedAt = now();
      return { success: true };
    },

    async restoreProject(id: string): Promise<Result<void>> {
      throwIfDisposed();

      const project = getMutableProject(id);
      if (!project) {
        return { success: false, error: { code: "PROJECT_NOT_FOUND", message: "项目不存在" } };
      }
      if (project.lifecycleStatus !== "archived") {
        return {
          success: false,
          error: {
            code: "PROJECT_LIFECYCLE_WRITE_FAILED",
            message: "只有 archived 状态的项目可以恢复",
          },
        };
      }

      try {
        db.prepare("UPDATE projects SET lifecycleStatus = 'active' WHERE id = ?").run(id);
      } catch (error) {
        return {
          success: false,
          error: {
            code: "PROJECT_LIFECYCLE_WRITE_FAILED",
            message: error instanceof Error ? error.message : String(error),
          },
        };
      }

      project.lifecycleStatus = "active";
      project.updatedAt = now();
      return { success: true };
    },

    async purgeProject(id: string, opts: { outputPath: string }): Promise<Result<void>> {
      throwIfDisposed();

      const project = getMutableProject(id);
      if (!project) {
        return { success: false, error: { code: "NOT_FOUND", message: "项目已删除" } };
      }
      if (project.lifecycleStatus !== "archived") {
        return {
          success: false,
          error: { code: "PROJECT_DELETE_REQUIRES_ARCHIVE", message: "请先归档项目再删除" },
        };
      }

      try {
        await (deps.permissionProbe ?? defaultPermissionProbe)(opts.outputPath);
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          (error.code === "EACCES" || error.code === "EPERM")
        ) {
          return {
            success: false,
            error: {
              code: "PROJECT_PURGE_PERMISSION_DENIED",
              message: "删除失败，路径无写权限",
            },
          };
        }
      }

      return manager.deleteProject(id);
    },

    async switchProject(id: string): Promise<Result<void>> {
      throwIfDisposed();

      const runSwitch = async (): Promise<Result<void>> => {
        const target = getMutableProject(id);
        if (!target) {
          return { success: false, error: { code: "PROJECT_NOT_FOUND", message: "项目不存在" } };
        }

        if (currentProjectId === id) {
          return { success: true };
        }

        const fromProjectId = currentProjectId;

        try {
          if (fromProjectId && deps.flushPendingAutosave) {
            await withTimeout(
              Promise.resolve(deps.flushPendingAutosave(fromProjectId)),
              DEFAULT_SWITCH_TIMEOUT_MS,
              "Project autosave flush timeout",
            );
          }
          if (fromProjectId) {
            await runParticipants("unbind", fromProjectId);
          }
          await withTimeout(
            persistActiveProjectId(id),
            DEFAULT_SWITCH_TIMEOUT_MS,
            "Project switch persist timeout",
          );
          await runParticipants("bind", id);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          const code = /timeout/i.test(message)
            ? "PROJECT_SWITCH_TIMEOUT"
            : "PROJECT_LIFECYCLE_WRITE_FAILED";
          return { success: false, error: { code, message } };
        }

        eventBus.emit({
          type: "project-switched",
          fromProjectId: fromProjectId ?? "",
          toProjectId: id,
          timestamp: now(),
        });
        return { success: true };
      };

      const resultPromise = switchQueue.then(runSwitch, runSwitch);
      switchQueue = resultPromise.then(() => undefined, () => undefined);
      return resultPromise;
    },

    async addDocument(doc: ProjectDocument): Promise<Result<ProjectDocument>> {
      throwIfDisposed();

      const list = documents.get(doc.projectId) ?? [];
      const index = list.findIndex((item) => item.id === doc.id);
      if (index >= 0) {
        list[index] = cloneDocument(doc);
      } else {
        list.push(cloneDocument(doc));
      }
      documents.set(doc.projectId, list);

      try {
        db.prepare(
          "INSERT OR REPLACE INTO documents (id, projectId, title, type, order_, parentId, status, wordCount, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?)",
        ).run(
          doc.id,
          doc.projectId,
          doc.title,
          doc.type,
          doc.order,
          doc.parentId,
          doc.status,
          doc.wordCount,
          doc.createdAt,
          doc.updatedAt,
        );
      } catch {
        // mock db
      }

      return { success: true, data: cloneDocument(doc) };
    },

    async listDocuments(projectId: string, filter?: { type?: string }): Promise<Result<ProjectDocument[]>> {
      throwIfDisposed();

      if (!ensureProjectLoaded(projectId)) {
        return {
          success: false,
          error: { code: "PROJECT_NOT_FOUND", message: "项目不存在" },
        };
      }

      const list = ensureDocumentsLoaded(projectId);
      const filtered = filter?.type ? list.filter((doc) => doc.type === filter.type) : list;
      return { success: true, data: filtered.map(cloneDocument) };
    },

    async removeDocument(projectId: string, docId: string): Promise<Result<void>> {
      throwIfDisposed();

      const list = documents.get(projectId) ?? [];
      documents.set(
        projectId,
        list.filter((doc) => doc.id !== docId),
      );

      try {
        db.prepare("DELETE FROM documents WHERE projectId = ? AND id = ?").run(projectId, docId);
      } catch {
        // mock db
      }

      return { success: true };
    },

    async reorderDocuments(projectId: string, orders: Array<{ id: string; order: number }>): Promise<Result<void>> {
      throwIfDisposed();

      const orderMap = new Map(orders.map((entry) => [entry.id, entry.order]));
      const list = documents.get(projectId) ?? [];
      documents.set(
        projectId,
        list.map((doc) => {
          const nextOrder = orderMap.get(doc.id);
          if (nextOrder === undefined) {
            return doc;
          }
          try {
            db.prepare("UPDATE documents SET order_ = ? WHERE projectId = ? AND id = ?").run(nextOrder, projectId, doc.id);
          } catch {
            // mock db
          }
          return { ...doc, order: nextOrder };
        }),
      );

      return { success: true };
    },

    async getStyleConfig(projectId: string): Promise<Result<ProjectStyleConfig>> {
      throwIfDisposed();

      const project = ensureProjectLoaded(projectId);
      if (!project) {
        return { success: false, error: { code: "PROJECT_NOT_FOUND", message: "项目不存在" } };
      }

      return { success: true, data: { ...project.style } };
    },

    async getOverview(projectId: string): Promise<Result<ProjectOverview>> {
      throwIfDisposed();

      if (!ensureProjectLoaded(projectId)) {
        return {
          success: false,
          error: { code: "PROJECT_NOT_FOUND", message: "项目不存在" },
        };
      }

      const docs = ensureDocumentsLoaded(projectId);
      let characterCount = 0;
      let locationCount = 0;
      try {
        const charRow = db.prepare("SELECT COUNT(*) as count FROM settings WHERE projectId = ? AND type = 'character'").get(projectId);
        const locRow = db.prepare("SELECT COUNT(*) as count FROM settings WHERE projectId = ? AND type = 'location'").get(projectId);
        characterCount = typeof charRow?.count === "number" ? charRow.count : 0;
        locationCount = typeof locRow?.count === "number" ? locRow.count : 0;
      } catch {
        try {
          const charRow = db.prepare(
            "SELECT COUNT(*) as count FROM settings WHERE scope = ? AND key LIKE 'character:%'",
          ).get(`project:${projectId}`);
          const locRow = db.prepare(
            "SELECT COUNT(*) as count FROM settings WHERE scope = ? AND key LIKE 'location:%'",
          ).get(`project:${projectId}`);
          characterCount = typeof charRow?.count === "number" ? charRow.count : 0;
          locationCount = typeof locRow?.count === "number" ? locRow.count : 0;
        } catch {
          // mock db
        }
      }

      return {
        success: true,
        data: {
          projectId,
          totalWordCount: docs.reduce((sum, doc) => sum + doc.wordCount, 0),
          documentCount: docs.length,
          chapterCount: docs.filter((doc) => doc.type === "chapter").length,
          characterCount,
          locationCount,
          lastEditedAt: docs.reduce((latest, doc) => Math.max(latest, doc.updatedAt), 0),
        },
      };
    },

    dispose(): void {
      disposed = true;
    },
  };

  return manager;
}
