## 1. Implementation
- [ ] 1.1 入口统一：CommandPalette “Export…” 仅打开 ExportDialog；移除 `Export Markdown` 直出命令
- [ ] 1.2 导出闭环：ExportDialog 调用 typed IPC（markdown/pdf/docx），展示 progress/success/error
- [ ] 1.3 UNSUPPORTED：pdf/docx 必须明确不可用（禁用 + tooltip 或点击提示），不得 silent failure
- [ ] 1.4 无 project/document：对话框必须提示原因并禁止导出

## 2. Testing
- [ ] 2.1 更新 `apps/desktop/tests/e2e/export-markdown.spec.ts`：从命令直出改为 ExportDialog 流程
- [ ] 2.2 新增 `apps/desktop/tests/e2e/export-dialog.spec.ts`：UNSUPPORTED 禁用 + markdown success/error
- [ ] 2.3 运行：`pnpm typecheck`、`pnpm -C apps/desktop test:run`、`pnpm -C apps/desktop test:e2e -- tests/e2e/export-markdown.spec.ts tests/e2e/export-dialog.spec.ts`

## 3. Documentation
- [ ] 3.1 `openspec/_ops/task_runs/ISSUE-194.md` 记录关键命令与关键输出（只追加）
- [ ] 3.2 合并后回填 P0-004 task card Completion（PR + RUN_LOG）
- [ ] 3.3 合并后归档 rulebook task
