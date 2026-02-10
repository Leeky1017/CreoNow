import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createSkillExecutor } from "../../main/src/services/skills/skillExecutor";
import type { AiStreamEvent } from "../../../../packages/shared/types/ai";
import type { IpcErrorCode } from "../../../../packages/shared/types/ipc-generated";

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
 * should expose exactly 8 builtin skills in package directory
 */
{
  assert.deepEqual(builtinSkillNames(), [
    "condense",
    "continue",
    "expand",
    "polish",
    "rewrite",
    "style-transfer",
    "summarize",
    "translate",
  ]);
}

/**
 * S1: 输入校验失败阻断 LLM [ADDED]
 * should return SKILL_INPUT_EMPTY and never call LLM when polish input is empty
 */
{
  let llmCallCount = 0;

  const executor = createSkillExecutor({
    resolveSkill: (skillId) => ({
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
    resolveSkill: (skillId) => ({
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
    resolveSkill: (skillId) => ({
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
