# P0-003: Renderer 基础工程（tokens + AppShell/Resizer + PreferenceStore）

Status: pending

## Goal

按 `design/DESIGN_DECISIONS.md` 落地 Workbench 的 UI 地基：深色主题 tokens、AppShell 三栏布局、Resizer 拖拽与双击复位、PreferenceStore 同步持久化；并提供稳定的 `data-testid` 以支撑 Windows E2E 门禁。

## Dependencies

- Spec: `../spec.md#cnwb-req-010`
- Design: `../design/01-frontend-implementation.md`
- Design: `../../../design/DESIGN_DECISIONS.md`
- P0-002: `./P0-002-ipc-contract-ssot-and-codegen.md`（typed invoke）

## Expected File Changes

| 操作   | 文件路径                                                               |
| ------ | ---------------------------------------------------------------------- |
| Add    | `apps/desktop/renderer/src/styles/tokens.css`                          |
| Add    | `apps/desktop/renderer/src/styles/fonts.css`                           |
| Add    | `apps/desktop/renderer/src/styles/globals.css`                         |
| Add    | `apps/desktop/renderer/src/components/layout/AppShell.tsx`             |
| Add    | `apps/desktop/renderer/src/components/layout/IconBar.tsx`              |
| Add    | `apps/desktop/renderer/src/components/layout/Sidebar.tsx`              |
| Add    | `apps/desktop/renderer/src/components/layout/RightPanel.tsx`           |
| Add    | `apps/desktop/renderer/src/components/layout/StatusBar.tsx`            |
| Add    | `apps/desktop/renderer/src/components/layout/Resizer.tsx`              |
| Add    | `apps/desktop/renderer/src/lib/preferences.ts`（PreferenceStore 实现） |
| Add    | `apps/desktop/renderer/src/stores/layoutStore.ts`                      |
| Add    | `apps/desktop/tests/e2e/layout-panels.spec.ts`                         |
| Update | `apps/desktop/renderer/src/App.tsx`（使用 AppShell）                   |

## Acceptance Criteria

- [ ] 深色主题 tokens 落地：
  - [ ] 所有颜色使用 CSS Variables（禁止硬编码色值）
  - [ ] `<html data-theme="dark">` 生效
- [ ] AppShell 布局符合 MUST 尺寸：
  - [ ] IconBar=48px、StatusBar=28px
  - [ ] Sidebar/Panel 可拖拽且有 min/max（Sidebar 180–400；Panel 280–480）
  - [ ] 拖拽手柄 hit area=8px；分割线=1px；hover=2px 高亮；cursor 正确
  - [ ] 双击手柄恢复默认宽度
- [ ] PreferenceStore（同步接口）：
  - [ ] `get/set/remove/clear` 同步 API
  - [ ] key 命名符合 `creonow.layout.*` 与 `creonow.version`
  - [ ] 释放拖拽后必须持久化 sidebarWidth/panelWidth 等
- [ ] 稳定选择器（至少）：
  - [ ] `app-shell`, `layout-sidebar`, `layout-panel`, `layout-statusbar`
  - [ ] `resize-handle-sidebar`, `resize-handle-panel`
- [ ] 快捷键（最小，必须可测）：
  - [ ] `Cmd/Ctrl+P` 打开命令面板（可先空壳，但入口必须存在）
  - [ ] `Cmd/Ctrl+\\` 折叠左侧 sidebar
  - [ ] `Cmd/Ctrl+L` 打开/折叠右侧 AI panel（可先占位）
  - [ ] `F11` 进入/退出禅模式（隐藏 sidebar/panel）

## Tests

- [ ] E2E（Windows）`layout-panels.spec.ts`：
  - [ ] 拖拽 sidebar 宽度到边界 → clamp 生效
  - [ ] 双击复位 → 宽度回到默认值
  - [ ] 重启 app → 宽度持久化（PreferenceStore）

## Edge cases & Failure modes

- 低于最小窗口尺寸 → 必须 clamp 并保持主内容最小 400px
- PreferenceStore 数据损坏/版本不匹配 → 必须走迁移（不崩溃）

## Observability

- renderer 侧（可选）记录布局变更事件（不含敏感信息）
- E2E 必须断言 UI 证据（布局宽度/可见性）与持久化证据（重启后保持）
