# P1-003: Export（markdown/pdf/docx）

Status: pending

## Goal

提供导出能力：从文档 SSOT（TipTap JSON）生成 markdown/pdf/docx（最小：markdown），并通过 IPC 暴露给 UI（命令面板/菜单）。

## Dependencies

- Spec: `../spec.md#cnwb-req-020`
- P0-005: `../p0/P0-005-editor-ssot-autosave-versioning.md`（`content_md` 派生）
- P0-002: `../p0/P0-002-ipc-contract-ssot-and-codegen.md`（新增 export channels）

## Expected File Changes

| 操作   | 文件路径                                                                           |
| ------ | ---------------------------------------------------------------------------------- |
| Add    | `apps/desktop/main/src/ipc/export.ts`（`export:markdown/pdf/docx`）                |
| Add    | `apps/desktop/main/src/services/export/exportService.ts`                           |
| Update | `apps/desktop/renderer/src/features/commandPalette/commands.ts`（Export commands） |
| Add    | `apps/desktop/tests/e2e/export-markdown.spec.ts`                                   |

## Acceptance Criteria

- [ ] `export:markdown` 输出 deterministic（同内容同输出）
- [ ] 导出文件写入 project 内或 userData 内固定目录（路径语义写死；禁止绝对路径泄露）
- [ ] 导出失败返回稳定错误码（`IO_ERROR/ENCODING_FAILED`）

## Tests

- [ ] E2E（Windows）：
  - [ ] 创建文档并输入 → 执行 export markdown → 断言导出文件存在且包含预期文本

## Edge cases & Failure modes

- 无 current document → `INVALID_ARGUMENT`
- 导出目录不可写 → `IO_ERROR`

## Observability

- `main.log`：`export_started/export_succeeded/export_failed`（含 format + docId）
