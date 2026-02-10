# Proposal: issue-374-ai-service-p3-judge-quality-pipeline

## Why

`openspec/changes/ai-service-p3-judge-quality-pipeline` 要求将 Judge 质量评估链路从“规范描述”落地为可执行契约：主进程可评估、渲染层可消费、降级路径可判定。当前代码仅有 `judge:model:*` 就绪状态能力，缺少质量评估入口和标签推送，因此无法满足 p3 交付场景。

## What Changes

- 新增 `judge:quality:evaluate` IPC 契约与 handler（输入校验 + 可判定输出）。
- 新增主进程 `JudgeQualityService`：规则引擎基础检查 + 高级检查失败降级（`partialChecksSkipped=true`）。
- 新增 `judge:quality:result` 推送事件，preload 桥接到 renderer。
- AI 面板消费 Judge 结果并显示严重度、标签、摘要和“部分校验已跳过”提示。
- 按 TDD 增加三条场景测试并纳入 `test:unit`、`test:integration` 回归链。

## Impact

- Affected specs:
  - `openspec/changes/ai-service-p3-judge-quality-pipeline/proposal.md`
  - `openspec/changes/ai-service-p3-judge-quality-pipeline/specs/ai-service-delta.md`
  - `openspec/changes/ai-service-p3-judge-quality-pipeline/tasks.md`
- Affected code:
  - `apps/desktop/main/src/services/ai/judgeQualityService.ts`
  - `apps/desktop/main/src/ipc/judge.ts`
  - `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `apps/desktop/preload/src/aiStreamBridge.ts`
  - `apps/desktop/renderer/src/features/ai/AiPanel.tsx`
  - `packages/shared/types/judge.ts`
  - `packages/shared/types/ipc-generated.ts`
  - `apps/desktop/tests/integration/judge-result-labels.test.ts`
  - `apps/desktop/main/src/services/ai/__tests__/judge-pass-state.test.ts`
  - `apps/desktop/main/src/services/ai/__tests__/judge-fallback-partial-check.test.ts`
  - `package.json`
- Breaking change: NO
- User benefit: AI 输出可获得非阻塞质量标签反馈，且高级判定不可用时仍有可见、可判定的降级结果。
