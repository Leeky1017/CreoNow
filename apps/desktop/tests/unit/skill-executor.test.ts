import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createSkillExecutor } from "../../main/src/services/skills/skillExecutor";
import type { AiStreamEvent } from "@shared/types/ai";
import type { IpcErrorCode } from "@shared/types/ipc-generated";

type SkillRunResult =
  | {
      ok: true;
      data: { executionId: string; runId: string; outputText?: string };
    }
  | { ok: false; error: { code: IpcErrorCode; message: string } };

function repoRoot(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "../../../..");
}

function builtinSkillNames(): string[] {
  const dir = path.join(
    repoRoot(),
    "apps/desktop/main/skills/packages/pkg.creonow.builtin/1.0.0/skills",
  );
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

function createNoopEmitter(): (event: AiStreamEvent) => void {
  return () => {};
}

/**
 * S0: 内置技能清单完整 [ADDED]
 * should expose current builtin skills in package directory
 */
{
  assert.deepEqual(builtinSkillNames(), [
    "brainstorm",
    "chat",
    "condense",
    "continue",
    "critique",
    "describe",
    "dialogue",
    "expand",
    "polish",
    "rewrite",
    "roleplay",
    "shrink",
    "style-transfer",
    "summarize",
    "synopsis",
    "translate",
    "write",
  ]);
}

/**
 * S1: 输入校验失败阻断 LLM [ADDED]
 * should return SKILL_INPUT_EMPTY and never call LLM when polish input is empty
 */
{
  let llmCallCount = 0;

  const executor = createSkillExecutor({
    resolveSkill: (skillId: string) => ({
      ok: true,
      data: {
        id: skillId,
        enabled: true,
        valid: true,
        prompt: {
          system: "sys",
          user: "Polish:\n{{input}}",
        },
      },
    }),
    runSkill: async () => {
      llmCallCount += 1;
      return {
        ok: true,
        data: { executionId: "ex-1", runId: "run-1", outputText: "ok" },
      } satisfies SkillRunResult;
    },
  });

  const result = await executor.execute({
    skillId: "builtin:polish",
    input: "   ",
    mode: "ask",
    model: "gpt-5.2",
    stream: false,
    ts: Date.now(),
    emitEvent: createNoopEmitter(),
  });

  assert.equal(result.ok, false);
  if (result.ok) {
    throw new Error("expected execute to fail on empty polish input");
  }
  assert.equal(result.error.code, "SKILL_INPUT_EMPTY");
  assert.equal(llmCallCount, 0);
}

/**
 * S2: 续写技能使用上下文 [ADDED]
 * should assemble context and pass it into LLM execution for continue skill
 */
{
  let assembleCalls = 0;
  let receivedSystem = "";

  const executor = createSkillExecutor({
    resolveSkill: (skillId: string) => ({
      ok: true,
      data: {
        id: skillId,
        enabled: true,
        valid: true,
        prompt: {
          system: "continue-system",
          user: "Continue:\n{{input}}",
        },
      },
    }),
    assembleContext: async () => {
      assembleCalls += 1;
      return {
        prompt: "# CreoNow Context\n\n## Immediate\nchapter-10-tail",
        tokenCount: 123,
        stablePrefixHash: "hash-1",
        stablePrefixUnchanged: false,
        warnings: [],
        assemblyOrder: ["rules", "settings", "retrieved", "immediate"],
        layers: {
          rules: { source: [], tokenCount: 0, truncated: false },
          settings: { source: [], tokenCount: 0, truncated: false },
          retrieved: { source: [], tokenCount: 0, truncated: false },
          immediate: {
            source: ["editor:cursor-window"],
            tokenCount: 10,
            truncated: false,
          },
        },
      };
    },
    runSkill: async (args) => {
      receivedSystem = args.system ?? "";
      return {
        ok: true,
        data: {
          executionId: "ex-2",
          runId: "run-2",
          outputText: "chapter-10-tail + next paragraph",
        },
      } satisfies SkillRunResult;
    },
  });

  const result = await executor.execute({
    skillId: "builtin:continue",
    input: "",
    mode: "ask",
    model: "gpt-5.2",
    stream: false,
    ts: Date.now(),
    context: { projectId: "project-1", documentId: "doc-1" },
    emitEvent: createNoopEmitter(),
  });

  assert.equal(result.ok, true);
  assert.equal(assembleCalls, 1);
  assert.equal(
    receivedSystem.includes("# CreoNow Context"),
    true,
    "continue execution must include assembled context in system prompt",
  );
}

/**
 * S3: 上游错误结构化透传 [ADDED]
 * should preserve LLM_API_ERROR from execution layer
 */
{
  const executor = createSkillExecutor({
    resolveSkill: (skillId: string) => ({
      ok: true,
      data: {
        id: skillId,
        enabled: true,
        valid: true,
        prompt: {
          system: "sys",
          user: "{{input}}",
        },
      },
    }),
    runSkill: async () =>
      ({
        ok: false,
        error: { code: "LLM_API_ERROR", message: "upstream failed" },
      }) satisfies SkillRunResult,
  });

  const result = await executor.execute({
    skillId: "builtin:rewrite",
    input: "rewrite this",
    mode: "ask",
    model: "gpt-5.2",
    stream: false,
    ts: Date.now(),
    emitEvent: createNoopEmitter(),
  });

  assert.equal(result.ok, false);
  if (result.ok) {
    throw new Error("expected execute to fail");
  }
  assert.equal(result.error.code, "LLM_API_ERROR");
}

/**
 * S4: 技能依赖缺失阻断执行 [ADDED]
 * should return SKILL_DEPENDENCY_MISSING and skip LLM call when dependency is disabled/missing
 */
{
  let llmCallCount = 0;

  const executor = createSkillExecutor({
    resolveSkill: (skillId: string) => ({
      ok: true,
      data: {
        id: skillId,
        enabled: true,
        valid: true,
        prompt: {
          system: "sys",
          user: "{{input}}",
        },
        dependsOn: ["summarize"],
      },
    }),
    checkDependencies: () => ({
      ok: false,
      error: {
        code: "SKILL_DEPENDENCY_MISSING",
        message: "Missing dependency",
        details: ["summarize"],
      },
    }),
    runSkill: async () => {
      llmCallCount += 1;
      return {
        ok: true,
        data: { executionId: "ex-3", runId: "run-3", outputText: "ok" },
      } satisfies SkillRunResult;
    },
  });

  const result = await executor.execute({
    skillId: "custom:chapter-outline-refine",
    input: "outline text",
    mode: "ask",
    model: "gpt-5.2",
    stream: false,
    ts: Date.now(),
    emitEvent: createNoopEmitter(),
  });

  assert.equal(result.ok, false);
  if (result.ok) {
    throw new Error("expected dependency-missing execution to fail");
  }
  assert.equal(result.error.code, "SKILL_DEPENDENCY_MISSING");
  assert.equal(llmCallCount, 0);
}

/**
 * S5: context 组装失败降级但可观测 [ADDED]
 * should emit context_assembly_degraded warning with executionId/skillId/error and continue execution
 */
{
  const warnings: Array<{
    event: string;
    data: Record<string, unknown> | undefined;
  }> = [];

  const executor = createSkillExecutor({
    resolveSkill: (skillId: string) => ({
      ok: true,
      data: {
        id: skillId,
        enabled: true,
        valid: true,
        inputType: "document",
        prompt: {
          system: "continue-system",
          user: "Continue:\n{{input}}",
        },
      },
    }),
    assembleContext: async () => {
      throw new Error("KG_UNAVAILABLE");
    },
    runSkill: async () =>
      ({
        ok: true,
        data: { executionId: "ex-ctx-1", runId: "run-ctx-1", outputText: "ok" },
      }) satisfies SkillRunResult,
    logger: {
      warn: (event: string, data?: Record<string, unknown>) => {
        warnings.push({ event, data });
      },
    },
  });

  const result = await executor.execute({
    skillId: "builtin:continue",
    input: "",
    mode: "ask",
    model: "gpt-5.2",
    stream: false,
    ts: Date.now(),
    context: { projectId: "project-ctx", documentId: "doc-ctx" },
    emitEvent: createNoopEmitter(),
  });

  assert.equal(result.ok, true);
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0]?.event, "context_assembly_degraded");
  assert.equal(typeof warnings[0]?.data?.executionId, "string");
  assert.equal(warnings[0]?.data?.skillId, "builtin:continue");
  assert.equal(warnings[0]?.data?.error, "KG_UNAVAILABLE");
}

/**
 * S6: context 组装成功不发降级 warning [ADDED]
 * should not emit context_assembly_degraded warning when context assembly succeeds
 */
{
  const warnings: Array<{
    event: string;
    data: Record<string, unknown> | undefined;
  }> = [];

  const executor = createSkillExecutor({
    resolveSkill: (skillId: string) => ({
      ok: true,
      data: {
        id: skillId,
        enabled: true,
        valid: true,
        inputType: "document",
        prompt: {
          system: "continue-system",
          user: "Continue:\n{{input}}",
        },
      },
    }),
    assembleContext: async () => ({
      prompt: "# CreoNow Context\nok",
      tokenCount: 64,
      stablePrefixHash: "ctx-hash",
      stablePrefixUnchanged: true,
      warnings: [],
      assemblyOrder: ["rules", "settings", "retrieved", "immediate"],
      layers: {
        rules: { source: [], tokenCount: 0, truncated: false },
        settings: { source: [], tokenCount: 0, truncated: false },
        retrieved: { source: [], tokenCount: 0, truncated: false },
        immediate: { source: [], tokenCount: 4, truncated: false },
      },
    }),
    runSkill: async () =>
      ({
        ok: true,
        data: { executionId: "ex-ctx-2", runId: "run-ctx-2", outputText: "ok" },
      }) satisfies SkillRunResult,
    logger: {
      warn: (event: string, data?: Record<string, unknown>) => {
        warnings.push({ event, data });
      },
    },
  } as unknown as Parameters<typeof createSkillExecutor>[0]);

  const result = await executor.execute({
    skillId: "builtin:continue",
    input: "",
    mode: "ask",
    model: "gpt-5.2",
    stream: false,
    ts: Date.now(),
    context: { projectId: "project-ctx", documentId: "doc-ctx" },
    emitEvent: createNoopEmitter(),
  });

  assert.equal(result.ok, true);
  assert.equal(warnings.length, 0);
}
