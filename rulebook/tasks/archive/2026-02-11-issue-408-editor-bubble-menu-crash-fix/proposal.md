# Proposal: issue-408-editor-bubble-menu-crash-fix

## Why

`#406` 合并后，`ai-apply` 相关 windows-e2e 仍存在渲染崩溃风险。问题定位到 `EditorBubbleMenu` 生命周期策略，在选区频繁变化时触发 DOM 卸载竞态，导致 `removeChild` 异常并中断用户编辑流程。该问题属于稳定性阻断项，必须以独立 issue 收口。

## What Changes

- 调整 `EditorBubbleMenu`：保持 `BubbleMenu` 挂载，改用 `shouldShow` 控制显隐。
- 保持既有 UI 契约不变（显示条件、按钮能力、Code Block 抑制规则不变）。
- 通过 e2e 回归验证 `ai-apply` success/conflict 流程。
- 记录 OpenSpec RUN_LOG、PR 与 main 收口证据。

## Impact

- Affected specs: `openspec/changes/editor-bubble-menu-crash-fix/specs/editor/spec.md`
- Affected code: `apps/desktop/renderer/src/features/editor/EditorBubbleMenu.tsx`
- Breaking change: NO
- User benefit: 消除 AI apply 期间编辑器崩溃，保证应用与冲突保护流程稳定。
