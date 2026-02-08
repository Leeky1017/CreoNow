# Proposal: issue-280-document-management-p1-reference-and-export

## Why
`document-management-p1-reference-and-export` 已完成规格拆分并获得审批，需要按 OpenSpec + Rulebook 规则完成收口：将 change 置为完成态、归档、更新执行顺序、补齐 RUN_LOG，并通过 PR auto-merge 合并回控制面 `main`。

## What Changes
- 更新 `openspec/changes/document-management-p1-reference-and-export/{proposal,tasks}.md`，标注审批通过与任务完成
- 将该 completed change 归档到 `openspec/changes/archive/document-management-p1-reference-and-export/`
- 同步 `openspec/changes/EXECUTION_ORDER.md`（移除已完成 change，重算活跃数量与顺序）
- 新增 `openspec/_ops/task_runs/ISSUE-280.md` 记录命令证据
- 创建 PR（Closes #280）并启用 auto-merge，确保控制面 `main` 收口

## Impact
- Affected specs:
  - `openspec/changes/document-management-p1-reference-and-export/**`
  - `openspec/changes/archive/document-management-p1-reference-and-export/**`
  - `openspec/changes/EXECUTION_ORDER.md`
  - `openspec/_ops/task_runs/ISSUE-280.md`
- Affected code: none
- Breaking change: NO
- User benefit: 批次 3 的 OpenSpec 拆分 change 完整闭环并可审计，执行顺序与活跃变更状态一致
