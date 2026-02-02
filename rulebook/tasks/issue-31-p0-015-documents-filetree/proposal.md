# Proposal: issue-31-p0-015-documents-filetree

## Why

P0 Workbench 需要在单 project 内交付 documents 的最小闭环（create/open/switch/rename/delete + currentDocumentId 持久化），并提供 Windows E2E 可断言的稳定选择器与可观测证据。

## What Changes

- Main：补齐 `file:document:*` IPC（rename/getCurrent/setCurrent 等）与 DocumentService 对应语义（project 作用域、删除当前文档的确定性行为）。
- DB：按 SSOT 约束补齐 documents 相关字段/索引（若缺失）以支撑稳定 list/read/write。
- Renderer：新增 Sidebar Files 面板 + Zustand store，驱动文档列表与 currentDocument 切换。
- Tests：新增 Playwright Electron E2E 覆盖 create/switch/rename/delete + 重启恢复。

## Impact

- Affected specs:
  - openspec/specs/creonow-v1-workbench/spec.md#cnwb-req-006
  - openspec/specs/creonow-v1-workbench/spec.md#cnwb-req-020
  - openspec/specs/creonow-v1-workbench/spec.md#cnwb-req-030
- Affected code:
  - apps/desktop/main/src/ipc/file.ts
  - apps/desktop/main/src/services/documents/documentService.ts
  - apps/desktop/main/src/db/migrations/\*
  - apps/desktop/renderer/src/features/files/\*
  - apps/desktop/renderer/src/stores/\*
  - apps/desktop/tests/e2e/documents-filetree.spec.ts
- Breaking change: NO
- User benefit: 用户可在项目内创建/管理多文档并可靠切换；重启后恢复上次编辑文档，避免“进来就是空白/丢失上下文”。
