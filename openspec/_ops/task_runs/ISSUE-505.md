# ISSUE-505

- Issue: #505
- Branch: task/505-p1p2-integration-check
- PR: https://github.com/Leeky1017/CreoNow/pull/506

## Plan

- 创建 P1+P2 集成检查文档 `docs/plans/p1p2-integration-check.md`
- 对照实际代码验证文档中的关键断言并修正
- 通过交付流程合并回 main

## Runs

### 2026-02-13 12:51 文档创建与代码验证

- Command: 手动代码审查 + grep 验证
- Key output:
  - §7 确认：`assembleSystemPrompt` 和 `GLOBAL_IDENTITY_PROMPT` 是死代码，未在 aiService.ts 的 LLM 调用路径中使用
  - §7 确认：`combineSystemText` 是实际使用的函数（4 处调用：line 1386/1462/1533/1649）
  - §1.1 确认：P2 context/memory 注入已生效，通过 `skillExecutor → system param → combineSystemText` 正确流入 LLM
  - §1.1 确认：`createContextLayerAssemblyService(undefined, deps)` 第一个参数 undefined 不是风险点，`defaultFetchers(deps)` 正确构建全部 4 个 fetcher
  - §2.1 确认：`TextEncoder` 和 `Buffer.byteLength` 对 UTF-8 结果完全一致
  - §6.1 修正：p1-chat-skill 测试文件为 `skillRouter.test.ts` + `chatSkill.test.ts`
- Evidence: `docs/plans/p1p2-integration-check.md`（已修正版）

### 2026-02-13 13:40 集成复核 + 真实 LLM 抽检

- Command: `pnpm test:unit`
- Key output: 全量单测通过（exit code 0）

- Command: `pnpm test:integration`
- Key output: 全量集成测试通过（exit code 0）

- Command: `pnpm cross-module:check`
- Key output: `[CROSS_MODULE_GATE] PASS`

- Command: `pnpm contract:check`
- Key output: contract 生成与 `packages/shared/types/ipc-generated.ts` 一致（无 diff）

- Command:
  - `pnpm tsx apps/desktop/main/src/services/context/__tests__/settingsFetcher.test.ts`
  - `pnpm tsx apps/desktop/main/src/services/context/__tests__/retrievedFetcher.test.ts`
  - `pnpm tsx apps/desktop/main/src/services/kg/__tests__/kgService.aliases.test.ts`
  - `pnpm tsx apps/desktop/main/src/ipc/__tests__/ai-config-ipc.test.ts`
- Key output: 定向验证项均通过（exit code 0）

- Command: 真实 DeepSeek 连通性与流式验证（本地 `.env`，密钥脱敏）
- Key output:
  - non-stream: HTTP 200，`contentSample="OK"`
  - stream: HTTP 200，`chunks=13`，`sawDone=true`

- Command: 真实 runSkill 路径验证（`skillExecutor -> contextAssemblyService -> aiService`）
- Key output:
  - context 注入链路命中：`output="林小雨"`，`hasContextPrompt=true`
  - stream timeout 验证：`done.error.code="SKILL_TIMEOUT"`
  - missing api key 验证：返回 `AI_NOT_CONFIGURED`（非 crash）

- Command: `for ch in ...`（13 channel）、`for code in ...`（12 error code）grep 对照
- Key output:
  - 13/13 channel 可追踪（invoke + push）
  - 12/12 error code 可追踪（`ipc-contract.ts` + `ipc-generated.ts`）

- Evidence:
  - `docs/plans/p1p2-integration-check.md`
  - `apps/desktop/main/src/services/ai/aiService.ts`
  - `apps/desktop/preload/src/ipc.ts`
  - `apps/desktop/preload/src/aiStreamBridge.ts`
  - `apps/desktop/renderer/src/features/ai/useAiStream.ts`
