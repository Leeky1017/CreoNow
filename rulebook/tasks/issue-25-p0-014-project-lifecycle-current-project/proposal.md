# Proposal: issue-25-p0-014-project-lifecycle-current-project

## Why

为 CN V1 Workbench 提供可重复的本地入口：project 生命周期（create/list/setCurrent/getCurrent/delete）+ current project 持久化恢复，并在创建 project 时确保 `<projectRoot>/.creonow/` 目录结构存在。该能力是后续 documents/filetree、context watch 与 Windows E2E 的共同依赖（`CNWB-REQ-005`）。

## What Changes

- Add: main `project:*` IPC channels + ProjectService（SQLite SSOT）。
- Add: `.creonow` 目录 ensure/status（最小可测实现，供 E2E 断言）。
- Add: renderer 最小入口 UI（welcome-screen + create-project-dialog），并通过 typed invoke 驱动 project 创建与 current project 恢复。
- Add: Windows Playwright Electron E2E：project lifecycle + restart 恢复。

## Impact

- Affected specs:
  - `openspec/specs/creonow-v1-workbench/task_cards/p0/P0-014-project-lifecycle-and-current-project.md`
  - `openspec/specs/creonow-v1-workbench/design/11-project-and-documents.md`
  - `openspec/specs/creonow-v1-workbench/design/04-context-engineering.md`
- Affected code:
  - `apps/desktop/main/src/ipc/**`
  - `apps/desktop/main/src/services/**`
  - `apps/desktop/renderer/src/**`
  - `apps/desktop/tests/e2e/project-lifecycle.spec.ts`
- Breaking change: NO
- User benefit: 用户可创建/切换/恢复当前 project；`.creonow` 元数据目录具备可验收落点；Windows E2E 入口稳定可重复。
