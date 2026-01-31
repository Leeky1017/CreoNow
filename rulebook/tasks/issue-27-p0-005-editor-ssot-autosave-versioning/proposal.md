# Proposal: issue-27-p0-005-editor-ssot-autosave-versioning

## Why

为 CN V1 Workbench 交付写作主链路“可靠保存”的最小闭环：TipTap editor 可编辑；文档 SSOT=TipTap JSON（DB）；autosave 状态可见且失败可恢复；版本历史最小可用（actor=user/auto）并可恢复；重启后内容不丢稿。该能力是后续 FileTree、AI diff/apply 与 RAG/FTS 的共同依赖（`CNWB-REQ-020/030`）。

## What Changes

- Add: renderer TipTap editor（`EditorPane`）+ editorStore + autosave 状态机（idle/saving/saved/error）。
- Add: main `file:*` 与 `version:*` IPC（文档 CRUD + 版本 list/restore），并通过 IPC contract/codegen gate 强类型化。
- Add: SQLite SSOT 写入（`documents`）+ derived 生成（`content_text/content_md`）+ 版本落盘（`document_versions`）的事务性实现。
- Add: unit tests（derive deterministic）+ Windows Playwright Electron E2E（autosave + restart restore + version evidence）。

## Impact

- Affected specs:
  - `openspec/specs/creonow-v1-workbench/task_cards/p0/P0-005-editor-ssot-autosave-versioning.md`
  - `openspec/specs/creonow-v1-workbench/design/02-document-model-ssot.md`
  - `openspec/specs/creonow-v1-workbench/design/11-project-and-documents.md`
- Affected code:
  - `apps/desktop/main/src/ipc/**`
  - `apps/desktop/main/src/services/documents/**`
  - `apps/desktop/main/src/db/migrations/**`
  - `apps/desktop/renderer/src/features/editor/**`
  - `apps/desktop/renderer/src/stores/**`
  - `apps/desktop/tests/**`
- Breaking change: NO
- User benefit: 用户可在编辑器中输入并自动保存，状态可见；重启后内容可恢复；版本历史可查看并可回滚，降低丢稿风险。
