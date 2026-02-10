# Proposal: issue-380-ai-service-p4-candidates-usage-stats

## Why
`openspec/changes/ai-service-p4-candidates-usage-stats` 已定义候选方案、重生成负反馈、token/费用统计的 P4 规范，但当前代码尚未提供可验证的候选选择应用链路，也未将“全部不满意”行为落盘为强负反馈，导致下游 `ai-service-p5` 的阈值/费用治理缺少稳定输入。

## What Changes

- 扩展 `ai:skill:run` 契约，支持候选数量 `1..5`、候选列表返回、usage metadata 返回。
- 在 AI 面板实现候选卡片展示、候选切换、Inline Diff 应用确认链路保持不变。
- 实现“全部不满意，重新生成”：同参重跑 + `ai:skill:feedback` + `memory:trace:feedback`（`feedback=strong_negative`）。
- 在面板展示 `promptTokens/completionTokens/sessionTotalTokens`，并在价格缺失时隐藏费用字段。

## Impact

- Affected specs:
  - `openspec/changes/ai-service-p4-candidates-usage-stats/specs/ai-service-delta.md`
  - `openspec/changes/ai-service-p4-candidates-usage-stats/tasks.md`
- Affected code:
  - `apps/desktop/main/src/ipc/ai.ts`
  - `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `packages/shared/types/ipc-generated.ts`
  - `apps/desktop/renderer/src/stores/aiStore.ts`
  - `apps/desktop/renderer/src/features/ai/AiPanel.tsx`
  - `apps/desktop/renderer/src/features/ai/__tests__/candidate-apply-flow.test.tsx`
  - `apps/desktop/renderer/src/features/ai/__tests__/usage-stats-render.test.tsx`
  - `apps/desktop/renderer/src/features/ai/__tests__/usage-stats-no-price.test.tsx`
  - `apps/desktop/tests/integration/ai-candidate-regenerate-feedback.test.ts`
- Breaking change: NO
- User benefit: 多候选选择更可控，拒绝-重生成闭环可学习，token/费用可见性更清晰。
