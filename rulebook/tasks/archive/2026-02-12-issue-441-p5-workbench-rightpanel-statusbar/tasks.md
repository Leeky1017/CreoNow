## 1. Implementation

- [x] 1.1 准入：确认 OPEN Issue #441，创建 Rulebook task 与 task worktree
- [x] 1.2 完成 Dependency Sync Check 并确认与 `archive/workbench-p5-00-contract-sync` 无漂移
- [x] 1.3 Red：补齐并执行失败测试（AiPanel/RightPanel/AppShell/layoutStore/StatusBar）
- [x] 1.4 Green：完成行为修复与最小实现通过
- [x] 1.5 Refactor：提取 `SaveIndicator` 并补齐 Storybook 场景

## 2. Testing

- [x] 2.1 运行 Red 测试并记录失败证据
- [x] 2.2 运行 Green 目标测试并全部通过
- [x] 2.3 运行受影响布局回归测试并通过
- [ ] 2.4 运行 `scripts/agent_pr_preflight.sh`（PR 阶段执行）

## 3. Documentation

- [x] 3.1 更新 `openspec/changes/workbench-p5-03-rightpanel-statusbar/tasks.md`
- [x] 3.2 新建并完善 `openspec/_ops/task_runs/ISSUE-441.md`
- [ ] 3.3 完成 PR/auto-merge/main 收口并回填真实 PR 链接
