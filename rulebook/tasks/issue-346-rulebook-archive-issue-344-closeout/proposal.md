# Proposal: issue-346-rulebook-archive-issue-344-closeout

## Why

PR #345 已完成 `#344` 主交付并合并到 main，但对应 Rulebook task 仍停留在 active 目录，需要归档到 `rulebook/tasks/archive/` 以满足收口一致性。

## What Changes

- 归档 Rulebook task：`issue-344-active-changes-delivery`。
- 新增 `ISSUE-346` RUN_LOG 记录归档与收口证据。
- 通过 PR + required checks + auto-merge 将治理收口持久化到 main。

## Impact

- Affected specs: none
- Affected code: none
- Breaking change: NO
- User benefit: Rulebook active/archive 状态与交付事实一致，避免治理漂移
