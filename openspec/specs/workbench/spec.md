# Workbench Specification

## Purpose

应用 UI 外壳：布局系统、Surface 注册与路由、命令面板、面板管理、设置对话框、主题切换。定义用户与 IDE 交互的整体框架。

### Scope

| Layer    | Path                                         |
| -------- | -------------------------------------------- |
| Frontend | `renderer/src/components/layout/`, `renderer/src/surfaces/`, `renderer/src/features/commandPalette/`, `renderer/src/features/rightpanel/`, `renderer/src/features/settings/`, `renderer/src/features/settings-dialog/`, `renderer/src/features/quality-gates/` |
| Store    | `renderer/src/stores/layoutStore.tsx`, `renderer/src/stores/themeStore.tsx` |
| Components | `renderer/src/components/primitives/` (72), `renderer/src/components/patterns/` (6) |

## Requirements

<!-- TODO: 由 Owner 定义具体 Requirements 和 Scenarios -->
