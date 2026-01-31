# Proposal: issue-19-p0-003-renderer-layout-preferences

## Why

落地 CN Workbench 的 renderer UI 地基：设计 tokens、三栏 AppShell 布局、Resizer 拖拽与双击复位、以及同步 PreferenceStore 持久化。该地基是后续 editor/files/ai 面板等所有 P0 交付的承载面，也直接决定 Windows E2E 的稳定性（通过 data-testid + 可回归交互门禁）。

## What Changes

- 新增深色主题 tokens（CSS variables）与基础 globals/fonts 样式；禁止硬编码色值。
- 实现 AppShell（IconBar + Sidebar + Editor + RightPanel + StatusBar）与两侧 Resizer（拖拽 clamp、双击复位、hover/active 反馈）。
- 实现 PreferenceStore（同步 API）与 layoutStore：持久化 sidebar/panel 宽度与折叠状态。
- 增加关键快捷键入口（Cmd/Ctrl+P 命令面板、Cmd/Ctrl+\ 侧栏折叠、Cmd/Ctrl+L 右侧面板、F11 禅模式）。
- 新增 Windows Playwright E2E 覆盖拖拽边界、双击复位与重启持久化。

## Impact

- Affected specs:
  - `openspec/specs/creonow-v1-workbench/spec.md#cnwb-req-010`
  - `openspec/specs/creonow-v1-workbench/task_cards/p0/P0-003-renderer-design-tokens-appshell-resizer-preferences.md`
- Affected code:
  - `apps/desktop/renderer/src/styles/**`
  - `apps/desktop/renderer/src/components/layout/**`
  - `apps/desktop/renderer/src/lib/preferences.ts`
  - `apps/desktop/renderer/src/stores/layoutStore.tsx`
  - `apps/desktop/tests/e2e/layout-panels.spec.ts`
- Breaking change: NO
- User benefit: UI 布局与交互符合设计规范且可持久化；Windows E2E 有稳定选择器与可回归验证，为后续 P0 功能提供稳定承载。
