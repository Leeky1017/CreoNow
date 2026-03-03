# Proposal: issue-940-fe-visual-noise-reduction

更新时间：2026-03-03 16:00

## Why

用户反馈"到处都是框，为了分割而分割"。代码层面表现为多层嵌套 border/rounded/阴影叠加，信息层级被线条淹没。

## What Changes

- 逐区域审计并移除非功能性边框（AI 面板、Dashboard、Settings Dialog）
- 分隔线统一使用 `--color-separator`（而非 `--color-border-default`）
- 保留功能性边框（CodeBlock 容器、交互卡片 hover/focus）

## Impact

- Affected specs: `openspec/specs/workbench/spec.md`（视觉噪音场景）
- Affected code: AiPanel.tsx, ChatHistory.tsx, ModePicker.tsx, ModelPicker.tsx, DashboardPage.tsx, Settings 组件（5 个文件）
