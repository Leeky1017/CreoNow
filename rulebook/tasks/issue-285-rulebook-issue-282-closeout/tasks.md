## 1. Implementation

- [x] 1.1 确认 `issue-282` 已合并且仅剩 Rulebook 勾选残留
- [x] 1.2 回填 `rulebook/tasks/issue-282-rulebook-issue-280-closeout/tasks.md` 的 2 个未勾选项

## 2. Testing

- [x] 2.1 `rulebook task validate issue-285-rulebook-issue-282-closeout` 通过
- [x] 2.2 `scripts/agent_pr_preflight.sh` 可在当前修复变更下通过（PR 链接回填后）

## 3. Documentation

- [x] 3.1 新增 `openspec/_ops/task_runs/ISSUE-285.md` 并记录关键命令证据
- [x] 3.2 本任务不引入“合并后再勾选”条目，避免再次残留
