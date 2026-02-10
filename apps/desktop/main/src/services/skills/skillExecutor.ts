import type {
  IpcError,
  IpcErrorCode,
} from "../../../../../../packages/shared/types/ipc-generated";
import type { AiStreamEvent } from "../../../../../../packages/shared/types/ai";
import type { ContextAssembleResult } from "../context/layerAssemblyService";

type Ok<T> = { ok: true; data: T };
type Err = { ok: false; error: IpcError };
export type ServiceResult<T> = Ok<T> | Err;

type SkillPrompt = {
  system: string;
  user: string;
};

type SkillInputType = "selection" | "document";

export type ResolvedRunnableSkill = {
  id: string;
  prompt?: SkillPrompt;
  enabled: boolean;
  valid: boolean;
  inputType?: SkillInputType;
  error_code?: IpcErrorCode;
  error_message?: string;
};

export type SkillExecutorRunArgs = {
  skillId: string;
  systemPrompt?: string;
  input: string;
  mode: "agent" | "plan" | "ask";
  model: string;
  system?: string;
  context?: { projectId?: string; documentId?: string };
  stream: boolean;
  ts: number;
  emitEvent: (event: AiStreamEvent) => void;
};

export type SkillExecutor = {
  execute: (args: SkillExecutorRunArgs) => Promise<
    ServiceResult<{
      executionId: string;
      runId: string;
      outputText?: string;
      contextPrompt?: string;
    }>
  >;
};

type SkillExecutorDeps = {
  resolveSkill: (skillId: string) => ServiceResult<ResolvedRunnableSkill>;
  runSkill: (args: SkillExecutorRunArgs) => Promise<
    ServiceResult<{
      executionId: string;
      runId: string;
      outputText?: string;
    }>
  >;
  assembleContext?: (args: {
    projectId: string;
    documentId: string;
    cursorPosition: number;
    skillId: string;
    additionalInput?: string;
    provider?: string;
    model?: string;
  }) => Promise<ContextAssembleResult>;
};

/**
 * Build a stable IPC error payload.
 */
function ipcError(code: IpcErrorCode, message: string, details?: unknown): Err {
  return { ok: false, error: { code, message, details } };
}

/**
 * Normalize skill id into builtin leaf id.
 *
 * Why: runtime checks should support both `builtin:continue` and `continue`.
 */
function leafSkillId(skillId: string): string {
  const parts = skillId.split(":");
  return parts[parts.length - 1] ?? skillId;
}

/**
 * Whether the skill consumes editor selection text as primary input.
 */
function resolveInputType(args: {
  skillId: string;
  inputType?: SkillInputType;
}): SkillInputType {
  if (args.inputType === "selection" || args.inputType === "document") {
    return args.inputType;
  }
  return leafSkillId(args.skillId) === "continue" ? "document" : "selection";
}

function requiresSelectionInput(args: {
  skillId: string;
  inputType?: SkillInputType;
}): boolean {
  return resolveInputType(args) === "selection";
}

/**
 * Whether the skill requires document context from Context Engine.
 */
function requiresDocumentContext(args: {
  skillId: string;
  inputType?: SkillInputType;
}): boolean {
  return resolveInputType(args) === "document";
}

/**
 * Provide user-facing empty-input errors per builtin skill semantics.
 */
function emptyInputMessage(skillId: string): string {
  if (leafSkillId(skillId) === "polish") {
    return "请先选中需要润色的文本";
  }
  return "请先提供需要处理的文本";
}

/**
 * Render user prompt template with deterministic `{{input}}` injection.
 */
function renderUserPrompt(args: { template: string; input: string }): string {
  if (args.template.includes("{{input}}")) {
    return args.template.split("{{input}}").join(args.input);
  }
  if (args.template.trim().length === 0) {
    return args.input;
  }
  return `${args.template}\n\n${args.input}`;
}

/**
 * Assemble Context Engine prompt when project/document context exists.
 */
async function assembleContextPrompt(args: {
  assembleContext?: SkillExecutorDeps["assembleContext"];
  run: SkillExecutorRunArgs;
  additionalInput: string;
}): Promise<ContextAssembleResult | null> {
  if (!args.assembleContext) {
    return null;
  }

  const projectId = args.run.context?.projectId?.trim() ?? "";
  const documentId = args.run.context?.documentId?.trim() ?? "";
  if (projectId.length === 0 || documentId.length === 0) {
    return null;
  }

  return await args.assembleContext({
    projectId,
    documentId,
    cursorPosition: 0,
    skillId: args.run.skillId,
    additionalInput: args.additionalInput,
    provider: "ai-service",
    model: args.run.model,
  });
}

/**
 * Build SkillExecutor with explicit dependency injection.
 */
export function createSkillExecutor(deps: SkillExecutorDeps): SkillExecutor {
  return {
    execute: async (args) => {
      const resolved = deps.resolveSkill(args.skillId);
      if (!resolved.ok) {
        return resolved;
      }

      if (!resolved.data.enabled) {
        return ipcError("UNSUPPORTED", "Skill is disabled", {
          id: args.skillId,
        });
      }
      if (!resolved.data.valid) {
        return ipcError(
          resolved.data.error_code ?? "INVALID_ARGUMENT",
          resolved.data.error_message ?? "Skill is invalid",
          { id: args.skillId },
        );
      }

      const trimmedInput = args.input.trim();

      if (
        requiresSelectionInput({
          skillId: args.skillId,
          inputType: resolved.data.inputType,
        }) &&
        trimmedInput.length === 0
      ) {
        return ipcError("SKILL_INPUT_EMPTY", emptyInputMessage(args.skillId));
      }

      if (
        requiresDocumentContext({
          skillId: args.skillId,
          inputType: resolved.data.inputType,
        })
      ) {
        const projectId = args.context?.projectId?.trim() ?? "";
        const documentId = args.context?.documentId?.trim() ?? "";
        if (projectId.length === 0 || documentId.length === 0) {
          return ipcError("SKILL_INPUT_EMPTY", "请先打开需要续写的文档");
        }
      }

      const inputForPrompt =
        trimmedInput.length > 0
          ? args.input
          : requiresDocumentContext({
                skillId: args.skillId,
                inputType: resolved.data.inputType,
              })
            ? "请基于当前文档上下文继续写作。"
            : args.input;

      let contextPrompt: string | undefined;
      try {
        const assembled = await assembleContextPrompt({
          assembleContext: deps.assembleContext,
          run: args,
          additionalInput: inputForPrompt,
        });
        if (assembled && assembled.prompt.trim().length > 0) {
          contextPrompt = assembled.prompt;
        }
      } catch {
        // Context is best-effort in executor; upstream IPC context channel keeps strict errors.
      }

      const systemPrompt = resolved.data.prompt?.system ?? "";
      const userPrompt = renderUserPrompt({
        template: resolved.data.prompt?.user ?? "",
        input: inputForPrompt,
      });

      const run = await deps.runSkill({
        ...args,
        systemPrompt,
        input: userPrompt,
        ...(contextPrompt ? { system: contextPrompt } : {}),
      });

      if (!run.ok) {
        return run;
      }

      return {
        ok: true,
        data: {
          ...run.data,
          ...(contextPrompt ? { contextPrompt } : {}),
        },
      };
    },
  };
}
