# Proposal: issue-23-docs-p0-task-cards-001-004

## Why

P0-001..P0-004 已合并，但对应 task card 仍显示 `Status: pending` 且验收项未勾选，导致进度不可追踪、协作方容易误判“尚未完成”。同时，ISSUE-21 的 rulebook task 需要落盘归档到 `rulebook/tasks/archive/`，避免长期堆积在活跃目录。

## What Changes

- Update task cards：`P0-001..P0-004` 的 `Status/Acceptance/Tests` 与 `## Completion`（补齐 Issue/PR/RUN_LOG）。
- Archive rulebook task：将 `rulebook/tasks/issue-21-p0-004-sqlite-bootstrap-migrations-logs/` 移入 `rulebook/tasks/archive/`（保留审计证据）。

## Impact

- Affected specs:
  - `openspec/specs/creonow-v1-workbench/task_cards/p0/P0-001-windows-ci-windows-e2e-build-artifacts.md`
  - `openspec/specs/creonow-v1-workbench/task_cards/p0/P0-002-ipc-contract-ssot-and-codegen.md`
  - `openspec/specs/creonow-v1-workbench/task_cards/p0/P0-003-renderer-design-tokens-appshell-resizer-preferences.md`
  - `openspec/specs/creonow-v1-workbench/task_cards/p0/P0-004-sqlite-bootstrap-migrations-logs.md`
- Affected code: NONE (docs/rulebook only)
- Breaking change: NO
- User benefit: 进度与验收可追踪；交付证据（Issue/PR/RUN_LOG）与归档审计更一致。
