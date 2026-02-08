# Proposal: issue-282-rulebook-issue-280-closeout

## Why

`issue-280` 的交付已完成并合并（PR #281），但 `rulebook/tasks/issue-280-document-management-p1-reference-and-export/tasks.md` 仍残留 2 个未勾选项，造成任务记录与实际交付状态不一致。需要通过一次最小修复任务把文档状态收口到一致。

## What Changes

- 回填 `rulebook/tasks/issue-280-document-management-p1-reference-and-export/tasks.md` 中 2 个已完成事项（`2.2`、`3.2`）
- 新增 `openspec/_ops/task_runs/ISSUE-282.md` 记录本次修复证据
- 创建并完成 `issue-282` 的 Rulebook task 交付记录
- 通过标准 preflight + PR auto-merge 合并回控制面 `main`

## Impact

- Affected specs:
  - `rulebook/tasks/issue-280-document-management-p1-reference-and-export/tasks.md`
  - `rulebook/tasks/issue-282-rulebook-issue-280-closeout/**`
  - `openspec/_ops/task_runs/ISSUE-282.md`
- Affected code: none
- Breaking change: NO
- User benefit: Rulebook 任务状态与实际交付一致，可审计性与后续治理准确性提升
