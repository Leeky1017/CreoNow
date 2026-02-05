# Proposal: issue-192-p0-003-settingsdialog-single-path

## Why
Settings 目前存在两条用户可达路径（Sidebar `SettingsPanel` vs `SettingsDialog`），违反“单链路收敛”约束，并导致入口/焦点/持久化与 E2E 断言口径分裂。需要把 Settings 收敛为唯一可验收的 SettingsDialog，并确保 IPC 失败路径可观察。

## What Changes
- IconBar Settings 不再切换左侧面板，而是打开 SettingsDialog
- Sidebar 移除 SettingsPanel 的可达入口（避免双栈）
- SettingsDialog 吸收 SettingsPanel 能力（Appearance / Proxy / Judge / Analytics）
- 更新/新增 Playwright E2E：从 SettingsDialog 路径验证打开与持久化

## Impact
- Affected specs:
  - `openspec/specs/creonow-frontend-full-assembly/spec.md`（P0-003 delta）
  - `openspec/specs/creonow-frontend-full-assembly/task_cards/p0/P0-003-settingsdialog-as-single-settings-surface.md`
- Affected code:
  - `apps/desktop/renderer/src/features/settings-dialog/SettingsDialog.tsx`
  - `apps/desktop/renderer/src/components/layout/IconBar.tsx`
  - `apps/desktop/renderer/src/components/layout/Sidebar.tsx`
  - `apps/desktop/renderer/src/features/settings/SettingsPanel.tsx`（删除/内部化）
  - `apps/desktop/tests/e2e/theme.spec.ts`、`apps/desktop/tests/e2e/settings-dialog.spec.ts`
- Breaking change: NO (UI 入口变化；同一能力单一路径)
- User benefit: 统一入口、可持久化、错误可观察、E2E 可断言的 Settings 体验
