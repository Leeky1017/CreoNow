# Proposal: issue-264-ai-panel-model-mode-wiring

## Why

Issue #264 反馈 AI Panel 的 `Mode` / `Model` 选择器未进入请求链路，用户切换后对后端无实际影响。
这会造成“配置可见但不生效”的体验偏差，也让 AI 运行行为难以回溯。

## What Changes

- 扩展 `ai:skill:run` IPC 契约，新增 `mode` / `model` 请求字段。
- 贯通渲染层 `AiPanel -> aiStore` 到主进程 `ipc/ai -> aiService` 的参数链路。
- 使 `aiService` 上游请求使用面板选择模型，并为 `plan` 模式注入稳定策略提示。
- 增加 Red→Green 单测，覆盖契约、store 请求参数、service 上游生效三类场景。

## Impact

- Affected specs:
  - `openspec/changes/ai-panel-model-mode-wiring/specs/ipc/spec.md`
  - `openspec/changes/ai-panel-model-mode-wiring/specs/ai-service/spec.md`
  - `openspec/changes/ai-panel-model-mode-wiring/tasks.md`
- Affected code:
  - `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `packages/shared/types/ipc-generated.ts`
  - `apps/desktop/renderer/src/stores/aiStore.ts`
  - `apps/desktop/renderer/src/features/ai/AiPanel.tsx`
  - `apps/desktop/main/src/ipc/ai.ts`
  - `apps/desktop/main/src/services/ai/aiService.ts`
  - `apps/desktop/tests/unit/*.test.ts`
- Breaking change: NO（新增字段在当前调用方同时升级）
- User benefit: 面板选择的 mode/model 与实际 LLM 调用一致，可预期且可验证。
