# 提案：ai-panel-model-mode-wiring

## 背景

Issue #264 指出 AI Chat Panel 的 `Mode` 与 `Model` 选择器当前仅为 UI 状态，未进入 `ai:skill:run` 请求链路。
这导致用户在面板中切换模式/模型后，后端调用行为不变，违背“可配置即生效”的交互预期。

## 变更内容

- 将 `Mode` / `Model` 纳入 `ai:skill:run` IPC 契约并贯通到主进程 AI 服务。
- 让渲染层发送的运行参数显式包含 `mode` 与 `model`。
- 在主进程中将 `model` 用作上游请求模型字段，并对 `mode` 提供确定性请求转换策略。
- 增加单元测试，覆盖“请求参数已传递且生效”的核心路径。

## 受影响模块

- AI Service：`openspec/specs/ai-service/spec.md`（delta）
- IPC：`openspec/specs/ipc/spec.md`（delta）
- Renderer：`apps/desktop/renderer/src/features/ai/`、`apps/desktop/renderer/src/stores/aiStore.ts`
- Main：`apps/desktop/main/src/ipc/ai.ts`、`apps/desktop/main/src/services/ai/aiService.ts`
- Contract：`apps/desktop/main/src/ipc/contract/ipc-contract.ts`、`packages/shared/types/ipc-generated.ts`

## 不做什么

- 不引入新的 Provider 切换 UI。
- 不修改主 spec（仅提交 delta spec）。
- 不改变既有默认模式（默认仍为 `ask`）与既有流式状态机。

## 审阅状态

- Owner 审阅：`APPROVED`
- Apply 状态：`DONE`（PR #275 已合并；change 已归档）
