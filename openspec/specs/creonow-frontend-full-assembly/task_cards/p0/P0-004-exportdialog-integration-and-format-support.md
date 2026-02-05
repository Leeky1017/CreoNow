# P0-004: ExportDialog 组装（入口统一 + UNSUPPORTED 语义）

Status: todo

## Goal

把 `Features/ExportDialog` 从 Storybook-only 组装进真实 App Surface，成为唯一导出 UI：

- 入口统一（CommandPalette / 可选 Toolbar）
- 导出走 typed IPC（`export:markdown/pdf/docx`）
- 对不支持格式（UNSUPPORTED）必须明确禁用或提示

## Dependencies

- Spec: `../spec.md#cnfa-req-007`
- Design: `../design/02-navigation-and-surface-registry.md`
- Design: `../design/03-ipc-reservations.md`
- P0-001: `./P0-001-surface-registry-and-zero-orphans-gate.md`
- P0-002: `./P0-002-command-palette-commands-and-shortcuts.md`
- P0-012: `./P0-012-aidialogs-systemdialog-and-confirm-unification.md`（确认/错误 UI 统一）

## Expected File Changes

| 操作 | 文件路径 |
| --- | --- |
| Update | `apps/desktop/renderer/src/features/export/ExportDialog.tsx`（接入真实 IPC、错误/UNSUPPORTED 展示、成功反馈） |
| Add/Update | `apps/desktop/renderer/src/stores/exportDialogStore.ts`（可选：open/options/result 状态；依赖显式注入） |
| Update | `apps/desktop/renderer/src/features/commandPalette/CommandPalette.tsx`（Export 命令改为“打开 ExportDialog”） |
| Update | `apps/desktop/renderer/src/features/editor/EditorToolbar.tsx`（可选：增加 Export 按钮打开对话框） |
| Update | `apps/desktop/tests/e2e/export-markdown.spec.ts`（从“命令直出”改为“对话框导出”） |
| Add | `apps/desktop/tests/e2e/export-dialog.spec.ts`（新增：格式禁用/错误态/成功态） |

## Acceptance Criteria

- [ ] 入口（必须）：
  - [ ] CommandPalette 有 “Export…” 命令，触发后打开 ExportDialog
  - [ ] ExportDialog 打开/关闭的焦点管理正确（可测）
- [ ] markdown 导出：
  - [ ] 选择 markdown → 导出成功（UI 显示 success view）
  - [ ] 错误时显示 `code: message`（可 dismiss）
- [ ] pdf/docx：
  - [ ] 若后端返回 `UNSUPPORTED`，UI 必须明确表现为不可用（推荐：禁用选项 + tooltip）
  - [ ] 禁止“可以选择但导出时报错且无解释”
- [ ] 不破坏现有 export IPC 语义：
  - [ ] `export:*` 返回 `relativePath` 与 `bytesWritten`，UI 可展示或用于复制

## Tests

- [ ] E2E `export-dialog.spec.ts`：
  - [ ] 打开 ExportDialog（CommandPalette）
  - [ ] markdown 导出成功：断言成功视图 + 结果字段存在
  - [ ] pdf/docx 在 UNSUPPORTED 时禁用（或触发提示）
- [ ] 复用/更新现有 `export-markdown.spec.ts`（不回归）

## Edge cases & Failure modes

- 没有 current project / document：
  - ExportDialog 必须提示原因，并禁止执行导出（不能无反应）
- 导出过程取消：
  - 取消后状态必须可恢复（再次打开可继续导出）

## Observability

- main.log 记录导出结果（可选）：格式、bytesWritten、relativePath（不得泄露绝对路径）
- renderer UI 错误必须可截取（用于 RUN_LOG 证据）

## Manual QA (Storybook WSL-IP)

- [ ] Storybook `Features/ExportDialog`：
  - [ ] 切换格式/选项的交互正确（尤其禁用态）
  - [ ] progress/success view 视觉正确（留证到 RUN_LOG）

## Completion

- Issue: TBD
- PR: TBD
- RUN_LOG: `openspec/_ops/task_runs/ISSUE-<N>.md`

