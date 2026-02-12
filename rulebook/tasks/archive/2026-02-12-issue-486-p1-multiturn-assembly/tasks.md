## 1. Implementation

- [x] 1.1 准入：创建 OPEN issue #486，并从最新 `origin/main` 建立 `task/486-p1-multiturn-assembly` worktree
- [x] 1.2 Rulebook-first：创建并校验 `issue-486-p1-multiturn-assembly`（`rulebook task validate`）
- [x] 1.3 完成 `p1-multiturn-assembly` 的 `tasks.md` 六段证据回填并归档 change
- [x] 1.4 同步 `openspec/changes/EXECUTION_ORDER.md` 以反映 active change 状态变更

## 2. Testing

- [x] 2.1 依赖同步检查（Dependency Sync Check）：上游 `p1-assemble-prompt`、`p1-aistore-messages` 核对结论 `NO_DRIFT`
- [x] 2.2 Red 证据：记录并复核 `buildLLMMessages` 初始缺口失败证据
- [x] 2.3 Green 回归：执行 `buildLLMMessages` 与相邻回归测试并通过

## 3. Documentation

- [x] 3.1 新增并完善 `openspec/_ops/task_runs/ISSUE-486.md`（命令 + 输出 + 结论）
- [x] 3.2 完成 PR（`Closes #486`）+ auto-merge + required checks 全绿 + 控制面 `main` 收口
- [x] 3.3 将当前 Rulebook task 自归档到 `rulebook/tasks/archive/`（同 PR 收口）
