# Proposal: issue-11-cn-v1-workbench-openspec-gapfill

## Why

补齐 `creonow-v1-workbench` OpenSpec 的关键缺口，避免 P0 施工阶段被迫脑补/返工：当前缺少 project 生命周期与 documents/filetree 的稳定口径，并存在 `.creonow/skills` 与 constraints SSOT 等不一致，以及少量测试路径分裂问题。

## What Changes

- 在 `spec.md` 新增 `CNWB-REQ-005/006`（project lifecycle、documents/filetree minimal loop）。
- 更新 `design/04-context-engineering.md`：补齐 `.creonow/skills/`，并写死 constraints SSOT。
- 新增 `design/11-project-and-documents.md`：固化 project/documents 的 IPC、落点与 E2E 口径。
- 新增 P0 task cards：`P0-014`、`P0-015`；修订 `P0-003/005/013` 与 `task_cards/index.md`（含依赖图）。

## Impact

- Affected specs:
  - `openspec/specs/creonow-v1-workbench/spec.md`
  - `openspec/specs/creonow-v1-workbench/design/04-context-engineering.md`
  - `openspec/specs/creonow-v1-workbench/design/11-project-and-documents.md`
  - `openspec/specs/creonow-v1-workbench/task_cards/**`
- Affected code: None（本次仅补齐规范与任务卡）
- Breaking change: NO（仅增强规范；不引入运行时 breaking change）
- User benefit: P0 任务卡可直接施工，入口流/ID/落点/测试口径写死，减少返工与分歧
