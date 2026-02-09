## 1. Implementation

- [ ] 1.1 在合法 task 分支中执行 `issue-344-active-changes-delivery` 归档
- [ ] 1.2 校验 active 目录不再包含 issue-344 task
- [ ] 1.3 校验 archive 目录存在 `2026-02-09-issue-344-active-changes-delivery`

## 2. Testing

- [ ] 2.1 运行 `scripts/agent_pr_preflight.sh` 并通过
- [ ] 2.2 校验 required checks：`ci` / `openspec-log-guard` / `merge-serial`

## 3. Documentation

- [ ] 3.1 新增 `openspec/_ops/task_runs/ISSUE-346.md` 记录关键命令输出
- [ ] 3.2 回填真实 PR 链接并记录 main 收口与清理证据
