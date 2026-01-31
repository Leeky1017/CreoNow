# Proposal: issue-29-docs-close-p0-005-p0-014

## Why

P0-014 / P0-005 的实现已合并，但对应 task card 仍为 `Status: pending` 且验收/测试项未勾选，导致进度与交付证据不可追踪、协作方容易误判任务状态。

## What Changes

- Update task cards：`P0-014`、`P0-005` 的 `Status/Acceptance/Tests` 与 `## Completion`（补齐 Issue/PR/RUN_LOG）。
- Add RUN_LOG：新增 `openspec/_ops/task_runs/ISSUE-29.md` 并记录验证证据。

## Impact

- Affected specs:
  - `openspec/specs/creonow-v1-workbench/task_cards/p0/P0-014-project-lifecycle-and-current-project.md`
  - `openspec/specs/creonow-v1-workbench/task_cards/p0/P0-005-editor-ssot-autosave-versioning.md`
- Affected code: NONE (docs/rulebook only)
- Breaking change: NO
- User benefit: 进度、验收与证据可追踪；交付闭环更一致，减少协作摩擦。
