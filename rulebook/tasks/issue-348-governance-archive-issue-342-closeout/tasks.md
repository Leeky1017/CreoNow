## 1. Implementation

- [ ] 1.1 归档 `openspec/changes/issue-342-governance-archive-issue-340-closeout` 到 `openspec/changes/archive/`
- [ ] 1.2 执行 `rulebook task archive issue-342-governance-archive-issue-340-closeout`
- [ ] 1.3 执行 `rulebook task archive issue-346-rulebook-archive-issue-344-closeout`
- [ ] 1.4 更新 `openspec/changes/EXECUTION_ORDER.md` 并移除 `issue-342` 活跃声明

## 2. Testing

- [ ] 2.1 执行 `rulebook task validate issue-348-governance-archive-issue-342-closeout` 通过
- [ ] 2.2 执行 `scripts/agent_pr_preflight.sh` 全绿
- [ ] 2.3 校验 required checks：`ci` / `openspec-log-guard` / `merge-serial`

## 3. Documentation

- [ ] 3.1 新增并维护 `openspec/_ops/task_runs/ISSUE-348.md`（含 Red/Green 证据）
- [ ] 3.2 回填真实 PR 链接并记录 main 收口与清理证据
