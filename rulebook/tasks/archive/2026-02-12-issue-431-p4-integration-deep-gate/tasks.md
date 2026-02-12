## 1. Implementation

- [x] 1.1 准入：创建 OPEN issue #431 与隔离 worktree `task/431-p4-integration-deep-gate`
- [x] 1.2 建立 Rulebook task、OpenSpec change 与 RUN_LOG 载体
- [x] 1.3 执行 P4 全量门禁并记录证据
- [x] 1.4 按分类完成实现修复与优化（仅限确认问题）
- [x] 1.5 输出 P4 集成 Delta Report

## 2. Testing

- [x] 2.1 运行 `pnpm typecheck`
- [x] 2.2 运行 `pnpm lint`
- [x] 2.3 运行 `pnpm contract:check`
- [x] 2.4 运行 `pnpm cross-module:check`
- [x] 2.5 运行 `pnpm test:unit`
- [x] 2.6 运行 `pnpm test:integration`
- [x] 2.7 对修复项执行 Red→Green 证据闭环

## 3. Documentation

- [x] 3.1 更新 `openspec/_ops/task_runs/ISSUE-431.md`
- [x] 3.2 更新 `openspec/changes/EXECUTION_ORDER.md`
- [x] 3.3 修复完成后补齐 proposal/tasks/spec 的实际影响与证据
