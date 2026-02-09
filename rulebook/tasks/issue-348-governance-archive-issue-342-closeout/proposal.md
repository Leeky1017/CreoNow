# Proposal: issue-348-governance-archive-issue-342-closeout

## Why

`issue-342` 对应的治理收口任务已完成并合并，但其 OpenSpec change 与 Rulebook task 仍停留在 active 目录，造成治理状态与仓库事实不一致，需要执行归档收口。

## What Changes

- 归档 OpenSpec change：`issue-342-governance-archive-issue-340-closeout`。
- 归档 Rulebook task：`issue-342-governance-archive-issue-340-closeout`。
- 归档遗留 Rulebook task：`issue-346-rulebook-archive-issue-344-closeout`。
- 更新 `openspec/changes/EXECUTION_ORDER.md`，移除 `issue-342` 并同步活跃集合计数。
- 记录 `ISSUE-348` RUN_LOG，落盘关键命令与门禁证据。

## Impact
- Affected specs: `openspec/changes/EXECUTION_ORDER.md`
- Affected code: none
- Breaking change: NO
- User benefit: 治理面 active/archive 状态一致，减少遗留项和执行顺序漂移
