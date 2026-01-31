# Spec Delta: creonow-v1-workbench (ISSUE-11)

本任务为 `openspec/specs/creonow-v1-workbench/` 的规范补齐（gapfill），用于把 P0 施工前置的“入口流/SSOT/测试口径”写死，避免实现阶段脑补与返工。

## Changes

- Add: `CNWB-REQ-005` Project lifecycle（create/list/setCurrent/getCurrent/delete + rootPath）
- Add: `CNWB-REQ-006` Documents/FileTree minimal loop（create/open/switch/rename/delete + currentDocument）
- Update: `design/04-context-engineering.md`
  - `.creonow/` 结构补齐 `.creonow/skills/`
  - constraints SSOT 写死为 `.creonow/rules/constraints.json`
- Add: `design/11-project-and-documents.md`（project/documents IPC、落点、E2E 口径）
- Add: `P0-014` / `P0-015` task cards，并修订 `P0-003/005/013` 与 `task_cards/index.md`

## Acceptance

- 新增/修订内容必须保持内部链接可用，且无悬空引用。
- `openspec/_ops/task_runs/ISSUE-11.md` 存在并通过 `openspec-log-guard`。
