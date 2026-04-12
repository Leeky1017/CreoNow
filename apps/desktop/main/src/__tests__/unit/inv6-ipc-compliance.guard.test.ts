/**
 * INV-6 / INV-7 静态合规守卫
 *
 * 目的：防止开发者在 IPC handler 中重新引入直接的 aiService 调用，
 * 绕过 SkillOrchestrator 统一出口。
 *
 * 原理：扫描 ipc/ai.ts 源码，断言：
 *   1. AiIpcContext 类型中不存在裸 aiService / writingOrchestrator 字段。
 *   2. Handler 函数中不存在 ctx.aiService.* 或 ctx.writingOrchestrator.* 调用模式。
 *
 * 这是一个「永不应该失败，但一旦失败就说明 INV 被破坏了」的边界守护测试。
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const AI_IPC_SRC = path.resolve(
  import.meta.dirname,
  "../../ipc/ai.ts",
);

describe("INV-6/INV-7 IPC compliance guard: ipc/ai.ts", () => {
  const src = readFileSync(AI_IPC_SRC, "utf8");

  it("AiIpcContext type must NOT contain bare aiService field", () => {
    // Find the AiIpcContext type block
    const contextTypeBlock = extractTypeBlock(src, "AiIpcContext");
    expect(contextTypeBlock).toBeTruthy();

    // Should NOT have a standalone aiService property
    // (Allow "skillOrchestrator" but reject bare "aiService: ReturnType<...>")
    expect(contextTypeBlock).not.toMatch(/^\s+aiService\s*:/m);
  });

  it("AiIpcContext type must NOT contain bare writingOrchestrator field", () => {
    const contextTypeBlock = extractTypeBlock(src, "AiIpcContext");
    expect(contextTypeBlock).toBeTruthy();

    expect(contextTypeBlock).not.toMatch(/^\s+writingOrchestrator\s*:/m);
  });

  it("AiIpcContext type must contain skillOrchestrator field", () => {
    const contextTypeBlock = extractTypeBlock(src, "AiIpcContext");
    expect(contextTypeBlock).toBeTruthy();

    expect(contextTypeBlock).toMatch(/skillOrchestrator\s*:/);
  });

  it("IPC handlers must NOT call ctx.aiService directly", () => {
    // Guard: no ctx.aiService.anything pattern in handler functions
    const directAiServiceCalls = /ctx\.aiService\.[a-zA-Z]/g;
    const matches = src.match(directAiServiceCalls);
    expect(matches).toBeNull();
  });

  it("IPC handlers must NOT call ctx.writingOrchestrator directly", () => {
    const directOrchestratorCalls = /ctx\.writingOrchestrator\.[a-zA-Z]/g;
    const matches = src.match(directOrchestratorCalls);
    expect(matches).toBeNull();
  });

  it("skill:run handler must call ctx.skillOrchestrator.execute()", () => {
    expect(src).toContain("ctx.skillOrchestrator.execute(");
  });

  it("skill:cancel handler must call ctx.skillOrchestrator.cancel()", () => {
    expect(src).toContain("ctx.skillOrchestrator.cancel(");
  });

  it("skill:feedback handler must call ctx.skillOrchestrator.recordFeedback()", () => {
    expect(src).toContain("ctx.skillOrchestrator.recordFeedback(");
  });

  it("ai:models:list handler must call ctx.skillOrchestrator.listModels()", () => {
    expect(src).toContain("ctx.skillOrchestrator.listModels()");
  });
});

/**
 * 从 TypeScript 源码中提取命名类型块（type/interface）的内容。
 * 仅做简单的括号匹配，足够用于守护断言。
 */
function extractTypeBlock(src: string, typeName: string): string | null {
  // Match "type TypeName = {" or "type TypeName = {" patterns
  const startPattern = new RegExp(
    `(?:type|interface)\\s+${typeName}\\s*(?:=\\s*)?\\{`,
  );
  const startMatch = startPattern.exec(src);
  if (!startMatch) return null;

  const startIdx = startMatch.index + startMatch[0].length;
  let depth = 1;
  let i = startIdx;

  while (i < src.length && depth > 0) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") depth--;
    i++;
  }

  return src.slice(startIdx, i - 1);
}
