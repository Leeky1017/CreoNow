## 1. Implementation

- [x] 1.1 新增 `useConfirmDialog()`：SystemDialog 的 promise-based confirm（并写死并发策略）
- [x] 1.2 替换 destructive confirm：Files/KG（entity+relation）/Dashboard（project:delete）
- [x] 1.3 AiPanel 错误态统一为 `AiErrorCard`（保留 `ai-error-code` 选择器）

## 2. Testing

- [x] 2.1 `pnpm typecheck`
- [x] 2.2 `pnpm -C apps/desktop test:run`
- [x] 2.3 `pnpm -C apps/desktop test:e2e -- tests/e2e/system-dialog.spec.ts tests/e2e/documents-filetree.spec.ts tests/e2e/knowledge-graph.spec.ts`

## 3. Documentation

- [ ] 3.1 更新 P0-012 task card Completion（PR + RUN_LOG）
- [ ] 3.2 归档 rulebook task（merge 后）
