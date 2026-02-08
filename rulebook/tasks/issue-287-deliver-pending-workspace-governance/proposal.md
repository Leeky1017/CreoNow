# Proposal: issue-287-deliver-pending-workspace-governance

## Why

控制面仓库存在未交付改动，包含多个已完成 change 的归档落盘、Rulebook 任务归档、执行顺序同步与 RUN_LOG 补录。若不一次性收口，将持续触发治理漂移和重复 closeout 返工。

## What Changes

- 提交并交付当前工作区全部待提交改动。
- 归档已完成且经确认可归档的 OpenSpec changes（本次为 `windows-e2e-startup-readiness` 与 `ai-panel-model-mode-wiring`）。
- 同步 Rulebook 任务状态与归档目录。
- 将误归档的 `document-management-p2-hardening-and-gates` 恢复为活跃 change 并撤销完成标记。
- 补齐 ISSUE-287 RUN_LOG，并通过 preflight + PR 合并流程完成主干收口。

## Impact

- Affected specs:
  - `openspec/changes/archive/**`
  - `openspec/changes/document-management-p2-hardening-and-gates/**`
  - `openspec/changes/EXECUTION_ORDER.md`
  - `openspec/_ops/task_runs/ISSUE-264.md`
  - `openspec/_ops/task_runs/ISSUE-287.md`
- Affected code:
  - `rulebook/tasks/archive/**`
  - `rulebook/tasks/issue-287-deliver-pending-workspace-governance/**`
- Breaking change: NO
- User benefit: 仓库治理状态与实际交付状态一致，避免误归档未完成 change 并减少后续重复收口。
