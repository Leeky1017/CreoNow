# P0-002: Command Palette（命令补齐 + 快捷键对齐）

Status: todo

## Goal

把 CommandPalette 从“半成品建议列表”补齐为真实可用的全局入口：

- 覆盖关键动作（Settings / Export / Toggle Panels / New Doc / New Project / Zen Mode 等）
- 快捷键严格对齐 `design/DESIGN_DECISIONS.md`（禁止冲突）
- 每条命令都必须可测试、可观察（失败有明确提示）

## Dependencies

- Spec: `../spec.md#cnfa-req-008`
- Spec: `../spec.md#cnfa-req-003`
- Design: `../design/02-navigation-and-surface-registry.md`
- Design: `../../../design/DESIGN_DECISIONS.md`
- P0-001: `./P0-001-surface-registry-and-zero-orphans-gate.md`

## Expected File Changes

| 操作 | 文件路径 |
| --- | --- |
| Update | `apps/desktop/renderer/src/features/commandPalette/CommandPalette.tsx`（实现 TODO 命令、错误提示、快捷键展示） |
| Update | `apps/desktop/renderer/src/components/layout/AppShell.tsx`（补齐全局快捷键：Settings/Export/New Project 等） |
| Add/Update | `apps/desktop/tests/e2e/command-palette.spec.ts`（新增：命令面板 E2E 门禁） |
| Update | `openspec/specs/creonow-frontend-full-assembly/design/02-navigation-and-surface-registry.md`（回填真实入口与 testid） |

## Acceptance Criteria

- [ ] 快捷键对齐（MUST）：
  - [ ] Cmd/Ctrl+P 打开 CommandPalette
  - [ ] Cmd/Ctrl+\\ 折叠/展开 Sidebar（不得使用 Cmd/Ctrl+B）
  - [ ] Cmd/Ctrl+L 折叠/展开 RightPanel
  - [ ] F11 进入/退出 Zen Mode
  - [ ] Cmd/Ctrl+, 打开 Settings
  - [ ] Cmd/Ctrl+N 新建文档（在当前 project 下）
  - [ ] Cmd/Ctrl+Shift+N 新建项目（打开 CreateProjectDialog）
- [ ] 命令补齐（至少）：
  - [ ] Open Settings（打开 SettingsDialog）
  - [ ] Export…（打开 ExportDialog）
  - [ ] Toggle Sidebar / Toggle Right Panel / Toggle Zen Mode
  - [ ] Create New Document / Create New Project
- [ ] 错误可观察：
  - [ ] 无 current project 时执行“新建文档/导出”必须提示可理解错误（而不是无反应）
  - [ ] IPC 失败时必须显示 `error.code: error.message`（并允许用户 dismiss）
- [ ] 与 Surface Registry 一致：
  - [ ] 所有命令必须调用统一 open/close（见 P0-001 的 openSurface），避免散落 setState

## Tests

- [ ] E2E `command-palette.spec.ts`（Windows gate）：
  - [ ] Cmd/Ctrl+P 打开面板
  - [ ] 搜索 “Settings” → Enter → SettingsDialog 可见
  - [ ] 搜索 “Export” → Enter → ExportDialog 可见
  - [ ] Cmd/Ctrl+\\ 可折叠/展开 Sidebar（断言 `layout-sidebar` 可见性）
  - [ ] Cmd/Ctrl+L 可折叠/展开 RightPanel（断言 `layout-panel` 可见性）
  - [ ] F11 Zen Mode 有可观察效果（断言某个 zen testid）

## Edge cases & Failure modes

- 编辑器输入聚焦时的快捷键冲突：
  - Cmd/Ctrl+B 必须仍是编辑器加粗（不能被全局绑定覆盖）
- 无项目/无文档时的命令执行：
  - 必须返回明确错误提示（不要 silent fail）

## Observability

- CommandPalette 内部错误提示区域必须可断言（`data-testid`）
- 关键命令执行记录（可选）：renderer log（不含敏感信息）

## Manual QA (Storybook WSL-IP)

- [ ] Storybook 打开 `Features/CommandPalette`：
  - [ ] 键盘上下选择/回车执行/ESC 关闭均正常
  - [ ] 错误态文案可理解（留证到 RUN_LOG）

## Completion

- Issue: TBD
- PR: TBD
- RUN_LOG: `openspec/_ops/task_runs/ISSUE-<N>.md`

