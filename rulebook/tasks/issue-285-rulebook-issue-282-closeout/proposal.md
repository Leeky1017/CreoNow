# Proposal: issue-285-rulebook-issue-282-closeout

## Why

`issue-282` 已合并（PR #283），但其 Rulebook 任务文件仍有 2 个未勾选项，造成文档状态与实际交付状态不一致。需要一个最小治理补丁将其收口到全完成状态。

## What Changes

- 回填 `rulebook/tasks/issue-282-rulebook-issue-280-closeout/tasks.md` 中剩余 2 个勾选项
- 新增 `openspec/_ops/task_runs/ISSUE-285.md` 记录本次修复证据
- 完成 `issue-285` Rulebook 任务记录并按标准流程合并回 `main`

## Impact

- Affected specs:
  - `rulebook/tasks/issue-282-rulebook-issue-280-closeout/tasks.md`
  - `rulebook/tasks/issue-285-rulebook-issue-282-closeout/**`
  - `openspec/_ops/task_runs/ISSUE-285.md`
- Affected code: none
- Breaking change: NO
- User benefit: Rulebook 任务状态持续一致，避免交付闭环中出现未完成假象
