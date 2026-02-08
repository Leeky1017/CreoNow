# Proposal: issue-269-ipc-archive-closeout

## Why
Issue #267 的实现已通过 PR #268 合并，但对应 active change 仍停留在 `openspec/changes/`，需要执行归档收口，避免活跃变更列表与实际状态不一致。

## What Changes
- 归档 `ipc-p0-envelope-ok-and-preload-security-evidence` 到 `openspec/changes/archive/`
- 同步 `openspec/changes/EXECUTION_ORDER.md` 为 active count 0
- 回填 `openspec/_ops/task_runs/ISSUE-267.md` 的 PR 与合并证据
- 新增 `openspec/_ops/task_runs/ISSUE-269.md` 记录本次归档操作

## Impact
- Affected specs: `openspec/changes/archive/ipc-p0-envelope-ok-and-preload-security-evidence/**`, `openspec/changes/EXECUTION_ORDER.md`
- Affected code: none
- Breaking change: NO
- User benefit: IPC change 生命周期闭环清晰，治理门禁与实际状态一致。
