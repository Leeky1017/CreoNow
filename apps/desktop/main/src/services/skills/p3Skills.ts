/**
 * P3 Skills — 一致性检查、对白生成、大纲展开
 * Spec: openspec/specs/skill-system/spec.md — P3
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
}

// ─── Manifest Parsing ───────────────────────────────────────────────

export function parseSkillManifest(content: string): SkillManifest {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    throw new Error("Invalid SKILL.md: missing frontmatter");
  }

  const frontmatter = frontmatterMatch[1];
  const body = content.slice(frontmatterMatch[0].length).trim();

  const lines = frontmatter.split("\n");
  const data: Record<string, Record<string, unknown> | string | number | boolean> = {};
  let currentSection: string | null = null;

  // L4: Removed unused currentSubSection variable

  for (const line of lines) {
    if (line.trim() === "") continue;

    const indent = line.search(/\S/);

    if (indent === 0) {
      const match = line.match(/^(\w+):\s*(.*)/);
      if (match) {
        currentSection = match[1];
        const val = match[2].trim();
        if (val) {
          data[currentSection] = parseYamlValue(val);
        } else {
          data[currentSection] = {};
        }
      }
    } else if (indent >= 2 && currentSection) {
      const match = line.trim().match(/^(\w+):\s*(.*)/);
      if (match) {
        const key = match[1];
        const val = match[2].trim();
        const section = data[currentSection];
        if (typeof section === "object" && section !== null) {
          (section as Record<string, unknown>)[key] = parseYamlValue(val);
        }
      }
    }
  }

  const required = ["id", "name", "description", "category", "scope", "outputType", "permissionLevel"];
  for (const field of required) {
    if (!(field in data) || data[field] === undefined || data[field] === "") {
      throw new Error(`Invalid SKILL.md: missing required field '${field}'`);
    }
  }

  if (!data.inputRequirement || !data.contextRules) {
    throw new Error("Invalid SKILL.md: missing inputRequirement or contextRules");
  }

  const inputReq = data.inputRequirement as Record<string, unknown>;
  const ctxRules = data.contextRules as Record<string, unknown>;

  return {
    id: data.id as string,
    name: data.name as string,
    description: data.description as string,
    category: data.category as string,
    scope: data.scope as string,
    outputType: data.outputType as string,
    permissionLevel: data.permissionLevel as string,
    contextRequirement: {
      requiresSelection: inputReq.requiresSelection === true,
      requiresDocumentContext: inputReq.requiresDocumentContext === true,
      requiresProjectContext: inputReq.requiresProjectContext === true,
      minInputLength: inputReq.minInputLength as number | undefined,
    },
    contextRules: {
      injectCharacterSettings: ctxRules.injectCharacterSettings === true,
      injectLocationSettings: ctxRules.injectLocationSettings === true,
      injectMemory: ctxRules.injectMemory === true,
      injectSearchContext: ctxRules.injectSearchContext === true,
      contextWindowSize: ctxRules.contextWindowSize as number | undefined,
    },
    systemPromptTemplate: body,
  };
}

function parseYamlValue(val: string): string | number | boolean {
  if (val === "true") return true;
  if (val === "false") return false;
  if (/^\d+$/.test(val)) return parseInt(val, 10);
  if (/^\d+\.\d+$/.test(val)) return parseFloat(val);
  return val;
}

// ─── Skill Definitions ──────────────────────────────────────────────

const SKILL_MANIFESTS: Record<string, SkillManifest> = {};
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const P3_SKILL_ROOT = path.resolve(
  __dirname,
  "../../../skills/packages/pkg.creonow.builtin/1.0.0/skills",
);

function readP3SkillManifest(skillDir: string): SkillManifest {
  const filePath = path.join(P3_SKILL_ROOT, skillDir, "SKILL.md");
  const content = readFileSync(filePath, "utf8");
  return parseSkillManifest(content);
}

function initManifests(): void {
  SKILL_MANIFESTS["consistency-check"] = readP3SkillManifest("consistency-check");
  SKILL_MANIFESTS["dialogue-gen"] = readP3SkillManifest("dialogue-gen");
  SKILL_MANIFESTS["outline-expand"] = readP3SkillManifest("outline-expand");
}

initManifests();

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
  let disposed = false;

  const executor: P3SkillExecutor = {
    async executeSkill(skillId: string, input: SkillInput): Promise<Result> {
      if (disposed) {
        return { success: false, error: { code: "SKILL_DISPOSED", message: "技能执行器已销毁" } };
      }

      const manifest = SKILL_MANIFESTS[skillId];
      if (!manifest) {
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
      for (const [id, manifest] of Object.entries(SKILL_MANIFESTS)) {
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
      for (const id of Object.keys(SKILL_MANIFESTS)) {
        toolRegistry.unregister?.(id);
      }
    },
  };

  return executor;
}
