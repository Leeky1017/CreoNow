# Proposal: issue-386-execution-order-closeout-fix

## Why
`#382` 的 SR5 交付已经归档 change 并合并到 `main`，但在冲突解决后 `openspec/changes/EXECUTION_ORDER.md` 仍把 `search-retrieval-p4-hardening-boundary` 记为活跃，和实际目录状态不一致，违反“活跃 change 变更需同步 EXECUTION_ORDER”的约束。

## What Changes
- 修正 `openspec/changes/EXECUTION_ORDER.md`：活跃 change 数改为 2，并移除已归档的 `search-retrieval-p4-hardening-boundary`
- 回填 `openspec/_ops/task_runs/ISSUE-382.md` 的完成态证据（preflight 全绿、auto-merge、main 收口、worktree 清理）
- 通过 `#386` 独立任务链路交付修复，避免复用已关闭 Issue

## Impact
- Affected specs: `openspec/changes/EXECUTION_ORDER.md`
- Affected code: `openspec/_ops/task_runs/ISSUE-382.md`、`openspec/_ops/task_runs/ISSUE-386.md`
- Breaking change: NO
- User benefit: 保证治理文档与真实执行状态一致，避免后续任务错误依赖与交付误判。
