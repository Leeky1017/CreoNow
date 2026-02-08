## 1. Implementation

- [x] 1.1 创建 OPEN Issue #311 并建立独立 worktree `task/311-kg-e2e-default-graph-mode`
- [x] 1.2 定位根因：KG 默认 Graph 视图与旧 E2E 的 List 前置假设不一致
- [x] 1.3 以最小改动修复两条 E2E（先断言 Graph，再切换 List）
- [ ] 1.4 完成 PR、auto-merge 与 main 收口

## 2. Testing

- [x] 2.1 Red：在改动前复现两条失败用例并记录证据
- [x] 2.2 Green：修复后两条目标用例本地通过
- [ ] 2.3 执行 `scripts/agent_pr_preflight.sh` 并通过

## 3. Documentation

- [x] 3.1 更新 `openspec/_ops/task_runs/ISSUE-311.md`（根因 / Red / Green / 命令证据）
- [ ] 3.2 回填 RUN_LOG 的 PR 链接并记录门禁结果
- [ ] 3.3 交付后归档 Rulebook task
