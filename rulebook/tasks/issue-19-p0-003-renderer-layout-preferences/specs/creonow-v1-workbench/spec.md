# Spec Delta: creonow-v1-workbench (ISSUE-19)

本任务实现 `P0-003`（Renderer tokens + AppShell/Resizer + PreferenceStore），把 `CNWB-REQ-010` 的 UI 规范落成可执行的布局与 E2E 门禁。

## Changes

- Add: 深色主题 tokens（CSS Variables）与基础全局样式（禁止硬编码色值）。
- Add: AppShell 三栏布局（IconBar/Sidebar/Editor/RightPanel/StatusBar）与 Resizer 拖拽/双击复位语义。
- Add: PreferenceStore（同步 API）持久化布局偏好（sidebar/panel 宽度与折叠状态）。
- Add: 关键路径稳定 `data-testid` 与 Windows Playwright E2E 门禁（拖拽 clamp + 复位 + 重启持久化）。

## Acceptance

- `IconBar=48px`、`StatusBar=28px`、Sidebar/Panel min/max clamp 与双击复位符合 `design/DESIGN_DECISIONS.md`。
- 布局偏好在重启后保持（E2E 断言）。
- 使用稳定 `data-testid`，E2E 不依赖易变 class/文本。
