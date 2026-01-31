# Spec Delta: creonow-v1-workbench (ISSUE-27)

本任务实现 `P0-005`（Editor SSOT + autosave + versioning），完成写作主链路“可靠保存”的最小闭环。

## Changes

- Add: TipTap editor（renderer）与 autosave 状态机（idle/saving/saved/error）。
- Add: 文档 SSOT（`documents.content_json`）写入 + derived 生成（`content_text/content_md`）与 deterministic 单元测试。
- Add: `file:*` 与 `version:*` IPC（文档 CRUD + 版本 list/restore），并保持 IPC contract/codegen gate 全程强类型。
- Add: Windows Playwright Electron E2E：输入→autosave→重启恢复 + 版本证据断言（actor=auto）。

## Acceptance

- 满足 `P0-005` task card 的 Acceptance Criteria，并通过 `windows-latest` E2E 门禁。
