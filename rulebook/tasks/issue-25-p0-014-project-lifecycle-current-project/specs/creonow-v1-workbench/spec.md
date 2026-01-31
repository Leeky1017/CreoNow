# Spec Delta: creonow-v1-workbench (ISSUE-25)

本任务实现 `P0-014`（Project lifecycle + current project），为 CN V1 Workbench 提供稳定的本地入口与可重复 E2E 基座。

## Changes

- Add: `project:*` IPC（create/list/setCurrent/getCurrent/delete）与 SQLite SSOT。
- Add: `.creonow` 最小 ensure/status（创建目录结构，提供可测存在性）。
- Add: renderer 最小入口（welcome-screen + create-project-dialog）。
- Add: Windows Playwright Electron E2E：project create + ensure + restart restore。

## Acceptance

- 满足 `P0-014` task card 的 Acceptance Criteria 与 E2E 门禁。
