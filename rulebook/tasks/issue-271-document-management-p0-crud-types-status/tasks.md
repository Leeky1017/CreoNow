## 1. Implementation
- [x] 1.1 完成 OpenSpec P0 拆分文档（proposal/tasks/delta spec）并保持 requirement 数量为 3
- [x] 1.2 完成 IPC 合同/主进程 handler/文档服务/数据库迁移实现
- [x] 1.3 完成渲染层文件树类型与状态展示、定稿编辑确认与 store 同步

## 2. Testing
- [x] 2.1 补齐并运行新增测试：`document-ipc-contract.test.ts`、`documentService.lifecycle.test.ts`、`FileTreePanel.types-status.test.tsx`、`final-document-edit-guard.test.ts`
- [x] 2.2 运行回归验证：`pnpm test:unit`、`pnpm -C apps/desktop test:run`、`pnpm test:integration`、`pnpm typecheck`、`pnpm lint`

## 3. Documentation
- [x] 3.1 更新 `openspec/_ops/task_runs/ISSUE-271.md` 记录失败与修复证据
- [x] 3.2 更新本 Rulebook 任务文档并通过 `rulebook task validate`
