## 1. Implementation

- [x] 1.1 完成 Spec-first：新建 F499 OpenSpec change（proposal/tasks/spec delta）并更新 EXECUTION_ORDER
- [x] 1.2 完成 Dependency Sync Check：核对 C9 `p2-kg-aliases` 归档产物与 IPC contract，记录 `DRIFT_FOUND`
- [x] 1.3 先写并执行 Red 测试，复现 `knowledge:entity:list` 返回 `INTERNAL_ERROR`
- [x] 1.4 实施最小修复：补齐 `ipc-contract.ts` 与 `knowledgeGraph.ts` 的 aliases 契约/类型
- [x] 1.5 生成并提交契约产物 `packages/shared/types/ipc-generated.ts`

## 2. Verification

- [x] 2.1 目标测试：`pnpm tsx apps/desktop/tests/unit/kg/entity-list-runtime-contract-aliases.test.ts`
- [x] 2.2 关键回归：`pnpm tsx apps/desktop/tests/integration/kg/relation-delete.test.ts`
- [x] 2.3 契约与类型：`pnpm contract:check`、`pnpm -C apps/desktop typecheck`
- [ ] 2.4 执行 `scripts/agent_pr_automerge_and_sync.sh` 并等待 required checks 全绿

## 3. Documentation

- [x] 3.1 更新 `openspec/changes/archive/issue-499-fix-kg-aliases-ipc-contract/tasks.md`（勾选 + Red/Green 证据）
- [x] 3.2 新增 `openspec/_ops/task_runs/ISSUE-499.md` 并记录关键命令输出
- [x] 3.3 回填 RUN_LOG 真实 PR 链接并完成 Rulebook task 归档
