# P1-002: Export PDF/DOCX 真支持（非 UNSUPPORTED）

Status: todo

## Goal

把 `export:pdf` 与 `export:docx` 从 `UNSUPPORTED` 变为真实可用导出能力，并与 ExportDialog 的格式选择一致。

## Dependencies

- Design: `../design/03-ipc-reservations.md`（Export 错误语义）
- P0-004: `../p0/P0-004-exportdialog-integration-and-format-support.md`

## Expected File Changes

| 操作 | 文件路径 |
| --- | --- |
| Update | `apps/desktop/main/src/services/export/exportService.ts`（实现 pdf/docx） |
| Update | `apps/desktop/main/src/ipc/export.ts`（保持 IPC envelope 与错误码） |
| Update | `apps/desktop/renderer/src/features/export/ExportDialog.tsx`（启用格式选项；错误处理） |
| Add | `apps/desktop/tests/e2e/export-pdf-docx.spec.ts`（新增门禁） |

## Acceptance Criteria

- [ ] ExportDialog：
  - [ ] PDF/DOCX 选项可选择（不再禁用）
  - [ ] 导出成功后进入 success view
- [ ] 后端：
  - [ ] `export:pdf` 返回 `{ relativePath, bytesWritten }`
  - [ ] `export:docx` 返回 `{ relativePath, bytesWritten }`
  - [ ] 失败路径错误码稳定（INVALID_ARGUMENT/IO_ERROR/UNEXPECTED/DB_ERROR 等）

## Tests

- [ ] E2E `export-pdf-docx.spec.ts`：
  - [ ] PDF 导出成功（断言文件存在且 bytesWritten > 0）
  - [ ] DOCX 导出成功（同上）

## Edge cases & Failure modes

- 文档为空：
  - 仍应导出一个可打开的文件（或明确提示不可导出，语义写死）
- 导出路径不可写：
  - 必须返回可判定错误（IO_ERROR），UI 显示原因

## Manual QA (Storybook WSL-IP)

- [ ] Storybook `Features/ExportDialog`：PDF/DOCX 选项视觉与禁用/启用态正确（留证到 RUN_LOG）

## Completion

- Issue: TBD
- PR: TBD
- RUN_LOG: `openspec/_ops/task_runs/ISSUE-<N>.md`

