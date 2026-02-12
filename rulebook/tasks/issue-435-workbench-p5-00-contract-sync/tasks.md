## 1. Implementation

- [x] 1.1 准入：创建 OPEN issue #435 + `task/435-workbench-p5-00-contract-sync` worktree
- [x] 1.2 Rulebook task 完整化并 `validate` 通过
- [x] 1.3 完成 `workbench-p5-00-contract-sync/tasks.md` 全部任务勾选与 Dependency Sync Check 结论
- [x] 1.4 完成 `workbench-p5-00-contract-sync` 归档并同步 `openspec/changes/EXECUTION_ORDER.md`

## 2. Testing

- [x] 2.1 运行 `pnpm install --frozen-lockfile`（worktree 环境基线）
- [x] 2.2 运行 `pnpm exec tsx apps/desktop/tests/unit/cross-module-drift-zero.spec.ts`
- [ ] 2.3 运行 `scripts/agent_pr_preflight.sh`（PR 链接回填后）

## 3. Documentation

- [x] 3.1 维护 `openspec/_ops/task_runs/ISSUE-435.md`（关键命令、输出、结论）
- [ ] 3.2 完成 PR + auto-merge + main 收口后归档 `rulebook/tasks/issue-435-workbench-p5-00-contract-sync`
