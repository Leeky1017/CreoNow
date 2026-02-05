# Proposal: issue-194-p0-004-exportdialog-integration

## Why
Export 目前存在“命令直出 markdown”与“ExportDialog（storybook-only + simulate）”两条路径，违反单链路收敛，并导致 UNSUPPORTED 语义在 UI 侧不可见/不可断言。需要把导出统一到 ExportDialog，接入 typed IPC，并把不支持格式明确表现为不可用。

## What Changes
- CommandPalette “Export…” / 相关入口统一为“打开 ExportDialog”（移除 direct export command）
- ExportDialog 接入 typed IPC：`export:markdown/pdf/docx`，并展示 success/error 结果
- 对 `UNSUPPORTED`（pdf/docx）明确禁用或提示，避免误导
- 更新/新增 Playwright E2E 覆盖：导出成功 + UNSUPPORTED 禁用

## Impact
- Affected specs:
  - `openspec/specs/creonow-frontend-full-assembly/spec.md`（P0-004 delta）
  - `openspec/specs/creonow-frontend-full-assembly/task_cards/p0/P0-004-exportdialog-integration-and-format-support.md`
- Affected code:
  - `apps/desktop/renderer/src/features/export/ExportDialog.tsx`
  - `apps/desktop/renderer/src/features/commandPalette/CommandPalette.tsx`
  - `apps/desktop/tests/e2e/export-markdown.spec.ts`
  - `apps/desktop/tests/e2e/export-dialog.spec.ts`
- Breaking change: NO (导出能力保留，仅入口/呈现收敛到对话框)
- User benefit: 单一路径导出、错误与 UNSUPPORTED 语义清晰、E2E 可验收
