## 1. Implementation

- [x] 1.1 完成任务准入（Issue #328、task 分支、worktree、Rulebook task）
- [x] 1.2 完成 Dependency Sync Check（对齐 issue-326 delta 输出）
- [x] 1.3 新增 cross-module baseline 与校验脚本
- [x] 1.4 接入 package/CI/preflight 门禁

## 2. Testing

- [x] 2.1 先写 Red 测试：未登记漂移失败 / 漂移陈旧失败 / 接线存在性失败
- [x] 2.2 实现后转绿并纳入 `pnpm test:unit`
- [ ] 2.3 运行 `pnpm cross-module:check`、`pnpm contract:check`、`scripts/agent_pr_preflight.sh`

## 3. Documentation

- [x] 3.1 更新 `openspec/_ops/task_runs/ISSUE-328.md`
- [x] 3.2 更新 `openspec/changes/EXECUTION_ORDER.md` 与 change tasks 勾选状态
