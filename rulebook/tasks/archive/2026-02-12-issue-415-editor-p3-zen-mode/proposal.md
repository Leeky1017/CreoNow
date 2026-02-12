# Proposal: issue-415-editor-p3-zen-mode

## Why

`openspec/changes/editor-p3-zen-mode` 已定义 Zen Mode 的三类核心行为（进入退出、去干扰、空文档边界），但当前实现仍存在关键偏差：空文档不显示末尾闪烁光标、Zen 模式下仍可通过快捷键触发 AI/面板入口、以及 Zen 样式存在硬编码值未通过 design token 收敛。若不完成该 change，会导致 Editor P3 规范与真实行为持续漂移，并阻塞下游 `editor-p4-a11y-hardening` 的稳定基线。

## What Changes

- 按 TDD 完成交付 `editor-p3-zen-mode` 三个 Scenario 的测试与实现闭环。
- 补齐空文档边界：无段落时仍显示正文占位光标，字数维持 `0`。
- 在 Zen 模式下屏蔽非退出类快捷键入口（如 `Ctrl/Cmd+P`、`Ctrl/Cmd+L`），以满足“禁用 AI 辅助”的行为约束。
- 将 Zen 视觉样式中的硬编码值收敛为 design token 引用，保持与 `design/system/01-tokens.css` 对齐。
- 更新 OpenSpec change tasks、RUN_LOG、Rulebook task，并完成 PR auto-merge + main 收口 + 归档。

## Impact

- Affected specs:
  - `openspec/changes/editor-p3-zen-mode/specs/editor-delta.md`
  - `openspec/changes/editor-p3-zen-mode/tasks.md`
- Affected code:
  - `apps/desktop/renderer/src/features/zen-mode/ZenMode.tsx`
  - `apps/desktop/renderer/src/components/layout/AppShell.tsx`
  - `apps/desktop/renderer/src/styles/tokens.css`
  - `apps/desktop/renderer/src/features/zen-mode/ZenMode.test.tsx`
  - `apps/desktop/renderer/src/components/layout/AppShell.test.tsx`
- Breaking change: NO
- User benefit: 禅模式进入后界面更可预期、更沉浸，空文档与退出路径行为符合规格，避免误触 AI/面板干扰写作流。
