## 1. Implementation

- [x] 1.1 创建 OPEN Issue #297 并确认任务入口
- [x] 1.2 从 `origin/main` 创建 `task/297-knowledge-graph-p0-p2-change-specs` worktree
- [x] 1.3 创建 KG-1/KG-2/KG-3 三个 change 三件套文档
- [x] 1.4 更新 `openspec/changes/EXECUTION_ORDER.md` 串行依赖与更新时间
- [x] 1.5 创建并填写 `openspec/_ops/task_runs/ISSUE-297.md`

## 2. Testing

- [x] 2.1 执行 `rulebook task validate issue-297-knowledge-graph-p0-p2-change-specs`
- [x] 2.2 执行 `scripts/agent_pr_preflight.sh`
- [x] 2.3 若 preflight 失败，修复后重跑直至通过

## 3. Documentation

- [x] 3.1 在 change proposal 中明确 scope / out-of-scope
- [x] 3.2 在 change tasks 中建立 Scenario → Test 映射与 Red-gate
- [ ] 3.3 在 RUN_LOG 补齐 PR 链接与交付收口证据
