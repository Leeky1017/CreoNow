## 1. Implementation

- [x] 1.1 准入：创建 OPEN issue #493 + `task/493-p2-entity-matcher` worktree
- [x] 1.2 Rulebook task 创建并 `validate` 通过
- [x] 1.3 Specification：核对主 spec + change delta + Dependency Sync Check（C8 已归档、C9 active）结论 `NO_DRIFT`
- [x] 1.4 Red：完成 S1-S6 失败测试证据（无实现模块时 FAIL）
- [x] 1.5 Green：落地 `entityMatcher.ts` 纯函数与导出类型并转绿
- [x] 1.6 Refactor：确认纯函数、去重策略与性能约束，保持绿灯

## 2. Testing

- [x] 2.1 运行目标测试：`pnpm exec tsx apps/desktop/main/src/services/kg/__tests__/entityMatcher.test.ts`
- [x] 2.2 运行 `pnpm typecheck`
- [x] 2.3 运行 `pnpm lint`
- [x] 2.4 运行 `pnpm contract:check`
- [x] 2.5 运行 `pnpm cross-module:check`
- [x] 2.6 运行 `pnpm test:unit`
- [x] 2.7 运行 `scripts/agent_pr_preflight.sh`（PR 链接回填后）

## 3. Documentation

- [x] 3.1 更新 `openspec/_ops/task_runs/ISSUE-493.md`（准入、Dependency Sync、Red/Green、门禁、合并证据）
- [x] 3.2 完成并归档 `openspec/changes/p2-entity-matcher`，同步 `openspec/changes/EXECUTION_ORDER.md`
- [x] 3.3 PR auto-merge 后归档 `rulebook/tasks/issue-493-p2-entity-matcher`
