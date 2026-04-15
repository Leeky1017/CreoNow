/**
 * P3 Skills — 一致性检查、对白生成、大纲展开
 * Spec: openspec/specs/skill-system/spec.md — P3
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseDocument } from "yaml";

// ─── Types ──────────────────────────────────────────────────────────

export interface SkillContextRequirement {
  requiresSelection: boolean;
  requiresDocumentContext: boolean;
  requiresProjectContext: boolean;
  minInputLength?: number;
}

export interface SkillContextRules {
  injectCharacterSettings: boolean;
  injectLocationSettings: boolean;
  injectMemory: boolean;
  injectSearchContext: boolean;
  contextWindowSize?: number;
}

export interface SkillManifest {
  id: string;
  name: string;
  description: string;
  category: string;
  scope: string;
  outputType: string;
  permissionLevel: string;
  contextRequirement: SkillContextRequirement;
  contextRules: SkillContextRules;
  systemPromptTemplate: string;
}

type JsonObject = Record<string, unknown>;

// L1: severity union type instead of string
export interface ConsistencyIssue {
  location: string;
  description: string;
  suggestion: string;
  severity: "error" | "warning" | "info";
  relatedEntityId?: string;
}

export interface ConsistencyCheckResult {
  passed: boolean;
  issues: ConsistencyIssue[];
}

export interface DialogueGenResult {
  dialogue: string;
  characterId?: string;
}

export interface OutlineExpandResult {
  expandedContent: string;
  paragraphCount?: number;
}

interface SkillInput {
  projectId: string;
  documentId: string;
  documentContent: string;
  selection?: { from: number; to: number; text: string };
}

// M5: Discriminated union with literal types
type Result<T = unknown> =
  | { success: true; data?: T; error?: undefined }
  | { success: false; data?: undefined; error: { code: string; message: string } };

export interface P3SkillExecutor {
  executeSkill(skillId: string, input: SkillInput): Promise<Result>;
  registerSkills(): void;
  dispose?(): void;
}

// C1: Typed deps interfaces
interface AiServiceLike {
  complete(params: Record<string, unknown>): Promise<{ content: string }>;
  stream(params: Record<string, unknown>): Promise<unknown>;
}

interface ContextEngineLike {
  assembleContext(params: Record<string, unknown>): Promise<{ success: boolean; data: Record<string, unknown> }>;
}

interface EventBusLike {
  emit(event: Record<string, unknown>): void;
  on(event: string, handler: (payload: Record<string, unknown>) => void): void;
  off(event: string, handler: (payload: Record<string, unknown>) => void): void;
}

interface ToolRegistryLike {
  register(tool: Record<string, unknown>): void;
  get(id: string): unknown;
  unregister?(id: string): void;
}

interface Deps {
  aiService: AiServiceLike;
  contextEngine: ContextEngineLike;
  eventBus: EventBusLike;
  toolRegistry: ToolRegistryLike;
  manifestRegistry?: SkillManifestRegistry;
}

// ─── Manifest Parsing ───────────────────────────────────────────────

function asObject(value: unknown): JsonObject | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  return value as JsonObject;
}

function requireString(
  frontmatter: JsonObject,
  field: string,
  options?: { allowInferred?: boolean; fallback?: () => string | undefined },
): string {
  const value = frontmatter[field];
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  if (options?.allowInferred) {
    const inferred = options.fallback?.();
    if (typeof inferred === "string" && inferred.trim().length > 0) {
      return inferred;
    }
  }

  throw new Error(`Invalid SKILL.md: missing required field '${field}'`);
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function inferCategory(frontmatter: JsonObject): string | undefined {
  const tags = Array.isArray(frontmatter.tags)
    ? frontmatter.tags.filter((tag): tag is string => typeof tag === "string")
    : [];
  if (tags.includes("analysis")) {
    return "analysis";
  }
  if (tags.includes("generation")) {
    return "generation";
  }

  const outputType = frontmatter.outputType;
  if (outputType === "annotation") {
    return "analysis";
  }

  return undefined;
}

function inferProjectContextRequirement(contextRules: JsonObject | null): boolean {
  if (!contextRules) {
    return false;
  }

  return (
    contextRules.characters === true ||
    contextRules.outline === true ||
    contextRules.knowledge_graph === true ||
    contextRules.style_guide === true ||
    contextRules.user_preferences === true ||
    optionalNumber(contextRules.recent_summary) !== undefined
  );
}

export function parseSkillManifest(content: string): SkillManifest {
  const normalized = content.replace(/\r\n/g, "\n");
  const frontmatterMatch = normalized.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    throw new Error("Invalid SKILL.md: missing frontmatter");
  }

  const doc = parseDocument(frontmatterMatch[1]);
  if (doc.errors.length > 0) {
    throw new Error(`Invalid SKILL.md: ${doc.errors[0]?.message ?? "invalid YAML frontmatter"}`);
  }

  const parsed = doc.toJSON();
  const frontmatter = asObject(parsed);
  if (!frontmatter) {
    throw new Error("Invalid SKILL.md: frontmatter must be an object");
  }

  const body = normalized.slice(frontmatterMatch[0].length).trim();
  const inputRequirement = asObject(frontmatter.inputRequirement);
  const legacyContextRules = asObject(frontmatter.contextRules);
  const runtimeContextRules = asObject(frontmatter.context_rules);
  const prompt = asObject(frontmatter.prompt);

  if (!inputRequirement && !frontmatter.inputType) {
    throw new Error("Invalid SKILL.md: missing inputRequirement or inputType");
  }

  if (!legacyContextRules && !runtimeContextRules) {
    throw new Error("Invalid SKILL.md: missing contextRules or context_rules");
  }

  const inferredInputType =
    frontmatter.inputType === "selection" || frontmatter.inputType === "document"
      ? frontmatter.inputType
      : undefined;

  return {
    id: requireString(frontmatter, "id"),
    name: requireString(frontmatter, "name"),
    description: requireString(frontmatter, "description"),
    category: requireString(frontmatter, "category", {
      allowInferred: true,
      fallback: () => inferCategory(frontmatter),
    }),
    scope: requireString(frontmatter, "scope"),
    outputType: requireString(frontmatter, "outputType"),
    permissionLevel: requireString(frontmatter, "permissionLevel"),
    contextRequirement: {
      requiresSelection:
        inputRequirement?.requiresSelection === true || inferredInputType === "selection",
      requiresDocumentContext:
        inputRequirement?.requiresDocumentContext === true ||
        inferredInputType === "selection" ||
        inferredInputType === "document",
      requiresProjectContext:
        inputRequirement?.requiresProjectContext === true ||
        (!inputRequirement && inferProjectContextRequirement(runtimeContextRules)),
      minInputLength: optionalNumber(inputRequirement?.minInputLength),
    },
    contextRules: {
      injectCharacterSettings:
        legacyContextRules?.injectCharacterSettings === true ||
        runtimeContextRules?.characters === true,
      injectLocationSettings:
        legacyContextRules?.injectLocationSettings === true ||
        runtimeContextRules?.knowledge_graph === true,
      injectMemory:
        legacyContextRules?.injectMemory === true ||
        runtimeContextRules?.outline === true ||
        (optionalNumber(runtimeContextRules?.recent_summary) ?? 0) > 0,
      injectSearchContext:
        legacyContextRules?.injectSearchContext === true ||
        runtimeContextRules?.knowledge_graph === true,
      contextWindowSize:
        optionalNumber(legacyContextRules?.contextWindowSize) ??
        optionalNumber(runtimeContextRules?.surrounding),
    },
    systemPromptTemplate:
      (typeof prompt?.system === "string" && prompt.system.trim().length > 0
        ? prompt.system
        : body),
  };
}

// ─── Skill Definitions ──────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const P3_SKILL_ROOT = path.resolve(
  __dirname,
  "../../../skills/packages/pkg.creonow.builtin/1.0.0/skills",
);

type SkillManifestRegistry = {
  manifests: Record<string, SkillManifest>;
  errors: Record<string, { code: "SKILL_PARSE_FAILED"; message: string }>;
};

function readP3SkillManifest(
  skillDir: string,
  readFile: (filePath: string) => string = (filePath) => readFileSync(filePath, "utf8"),
): SkillManifest {
  const filePath = path.join(P3_SKILL_ROOT, skillDir, "SKILL.md");
  const content = readFile(filePath);
  return parseSkillManifest(content);
}

export function loadP3SkillManifestRegistry(options?: {
  skillDirs?: string[];
  readFile?: (filePath: string) => string;
  onWarning?: (message: string) => void;
}): SkillManifestRegistry {
  const manifests: Record<string, SkillManifest> = {};
  const errors: SkillManifestRegistry["errors"] = {};
  const skillDirs = options?.skillDirs ?? [
    "consistency-check",
    "dialogue-gen",
    "outline-expand",
  ];

  for (const skillDir of skillDirs) {
    try {
      manifests[skillDir] = readP3SkillManifest(skillDir, options?.readFile);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors[skillDir] = {
        code: "SKILL_PARSE_FAILED",
        message,
      };
      options?.onWarning?.(`SKILL_PARSE_FAILED: ${skillDir}: ${message}`);
    }
  }

  return { manifests, errors };
}

const DEFAULT_MANIFEST_REGISTRY = loadP3SkillManifestRegistry();

// ─── Implementation ─────────────────────────────────────────────────

function extractJsonFromContent(content: string): Record<string, unknown> {
  try {
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    const fenced = content.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
    if (fenced) {
      return JSON.parse(fenced[1].trim()) as Record<string, unknown>;
    }
    throw new Error("Failed to parse JSON from AI response");
  }
}

export function createP3SkillExecutor(deps: Deps): P3SkillExecutor {
  const { aiService, contextEngine, eventBus, toolRegistry } = deps;
  const manifestRegistry = deps.manifestRegistry ?? DEFAULT_MANIFEST_REGISTRY;
  const skillManifests = manifestRegistry.manifests;
  const manifestErrors = manifestRegistry.errors;
  let disposed = false;

  const executor: P3SkillExecutor = {
    async executeSkill(skillId: string, input: SkillInput): Promise<Result> {
      if (disposed) {
        return { success: false, error: { code: "SKILL_DISPOSED", message: "技能执行器已销毁" } };
      }

      const manifest = skillManifests[skillId];
      if (!manifest) {
        const manifestError = manifestErrors[skillId];
        if (manifestError) {
          return {
            success: false,
            error: { code: "SKILL_MANIFEST_INVALID", message: manifestError.message },
          };
        }
        return { success: false, error: { code: "SKILL_NOT_FOUND", message: `技能 ${skillId} 不存在` } };
      }

      if (manifest.contextRequirement.requiresSelection && !input.selection) {
        return { success: false, error: { code: "SKILL_INPUT_INVALID", message: "需要选区" } };
      }

      if (manifest.contextRequirement.requiresSelection && input.selection && input.selection.text.trim() === "") {
        return { success: false, error: { code: "SKILL_INPUT_INVALID", message: "选区内容为空" } };
      }

      let contextData: Record<string, unknown> | null = null;
      if (manifest.contextRequirement.requiresProjectContext || manifest.contextRequirement.requiresDocumentContext) {
        const ctxResult = await contextEngine.assembleContext({
          projectId: input.projectId,
          documentId: input.documentId,
          injectCharacterSettings: manifest.contextRules.injectCharacterSettings,
          injectLocationSettings: manifest.contextRules.injectLocationSettings,
          injectMemory: manifest.contextRules.injectMemory,
        });
        contextData = ctxResult?.data ?? null;
      }

      if (manifest.contextRequirement.requiresProjectContext && contextData && manifest.category === "analysis") {
        if (!contextData.characterSettings && !contextData.locationSettings) {
          return { success: false, error: { code: "SKILL_CONTEXT_EMPTY", message: "请先添加角色/地点设定" } };
        }
      }

      let aiResponse: { content: string };
      try {
        aiResponse = await aiService.complete({
          skillId,
          systemPrompt: manifest.systemPromptTemplate,
          context: contextData,
          input: input.documentContent,
          selection: input.selection,
        });
      } catch (err) {
        // H9: Safe error extraction
        return { success: false, error: { code: "AI_SERVICE_ERROR", message: err instanceof Error ? err.message : String(err) } };
      }

      let parsed: Record<string, unknown>;
      try {
        parsed = extractJsonFromContent(aiResponse.content);
      } catch {
        return { success: false, error: { code: "SKILL_OUTPUT_INVALID", message: "AI 返回格式错误" } };
      }

      if (skillId === "consistency-check") {
        const rawIssues = (parsed.issues as Array<Record<string, unknown>>) || [];
        const result: ConsistencyCheckResult = {
          passed: (parsed.passed as boolean) ?? true,
          issues: rawIssues.map((i) => ({
            location: i.location as string,
            description: i.description as string,
            suggestion: i.suggestion as string,
            severity: i.severity as "error" | "warning" | "info",
            relatedEntityId: i.relatedEntityId as string | undefined,
          })),
        };

        eventBus.emit({
          type: "consistency-check-completed",
          projectId: input.projectId,
          passed: result.passed,
          issueCount: result.issues.length,
          timestamp: Date.now(),
        });

        return { success: true, data: result };
      }

      if (skillId === "dialogue-gen") {
        const result: DialogueGenResult = {
          dialogue: parsed.dialogue as string,
          characterId: parsed.characterId as string | undefined,
        };
        return { success: true, data: result };
      }

      if (skillId === "outline-expand") {
        const result: OutlineExpandResult = {
          expandedContent: parsed.expandedContent as string,
          paragraphCount: parsed.paragraphCount as number | undefined,
        };
        return { success: true, data: result };
      }

      return { success: true, data: parsed };
    },

    registerSkills(): void {
      for (const [id, manifest] of Object.entries(skillManifests)) {
        toolRegistry.register({
          id,
          name: id,
          description: manifest.description,
          category: manifest.category,
          execute: (input: SkillInput) => executor.executeSkill(id, input),
        });
      }
    },

    dispose(): void {
      disposed = true;
      for (const id of Object.keys(skillManifests)) {
        toolRegistry.unregister?.(id);
      }
    },
  };

  return executor;
}
