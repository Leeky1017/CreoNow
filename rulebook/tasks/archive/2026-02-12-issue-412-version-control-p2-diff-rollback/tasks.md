## 1. Implementation

- [x] 1.1 准入：创建 OPEN issue #412 + `task/412-version-control-p2-diff-rollback` worktree
- [x] 1.2 Rulebook task 创建并 `validate` 通过
- [x] 1.3 Dependency Sync Check：核对 `version-control-p0/p1` + 归档 `editor-p2`（数据结构、IPC 契约、错误码、阈值）并记录 `NO_DRIFT/DRIFT`
- [x] 1.4 Red：完成 P2 五个 Scenario 的失败测试证据
- [x] 1.5 Green：实现 `version:snapshot:diff` + `version:snapshot:rollback` 与前端接线最小闭环
- [x] 1.6 Refactor：统一 diff payload 类型与 AI mark 渲染入口，保持行为不变

## 2. Testing

- [x] 2.1 运行新增/修改的版本对比与回滚测试（Red -> Green）
- [x] 2.2 运行 `pnpm typecheck`
- [x] 2.3 运行 `pnpm lint`
- [x] 2.4 运行 `pnpm contract:check`
- [x] 2.5 运行 `pnpm cross-module:check`
- [x] 2.6 运行 `pnpm test:unit`
- [x] 2.7 运行 `pnpm -C apps/desktop test:run`（受影响前端测试）
- [ ] 2.8 运行 `scripts/agent_pr_preflight.sh`（PR 链接回填后）

## 3. Documentation

- [x] 3.1 维护 `openspec/_ops/task_runs/ISSUE-412.md`（准入、Dependency Sync、Red/Green、门禁、合并证据）
- [x] 3.2 完成并归档 `openspec/changes/version-control-p2-diff-rollback`，同步 `openspec/changes/EXECUTION_ORDER.md`
- [x] 3.3 同 PR 自归档 `rulebook/tasks/issue-412-version-control-p2-diff-rollback`
