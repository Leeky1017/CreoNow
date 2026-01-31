# P0-015: Documents + FileTree（create/open/switch/rename/delete + currentDocument）

Status: pending

## Goal

交付单 project 内 documents 的最小闭环，并把它落到 Sidebar Files（`12-sidebar-filetree.html`）：创建、切换、重命名、删除，以及 `currentDocumentId` 的 project 作用域持久化；同时为 Windows E2E 提供稳定的 `data-testid` 与可断言证据。

## Dependencies

- Spec: `../spec.md#cnwb-req-006`
- Spec: `../spec.md#cnwb-req-020`（SSOT=TipTap JSON）
- Spec: `../spec.md#cnwb-req-030`（versioning 关联）
- Design: `../design/11-project-and-documents.md`
- Design: `../design/01-frontend-implementation.md`（稳定选择器）
- Design: `../design/02-document-model-ssot.md`（DB schema/derived/版本语义）
- P0-014: `./P0-014-project-lifecycle-and-current-project.md`（projectId/rootPath/current project）
- P0-005: `./P0-005-editor-ssot-autosave-versioning.md`（编辑器/保存/版本闭环）

## Expected File Changes

| 操作   | 文件路径                                                                                                 |
| ------ | -------------------------------------------------------------------------------------------------------- |
| Update | `apps/desktop/main/src/ipc/file.ts`（补齐 `file:document:*`：rename/delete/getCurrent/setCurrent 等）    |
| Update | `apps/desktop/main/src/services/documents/documentService.ts`（list/rename/delete/currentDocument 语义） |
| Update | `apps/desktop/main/src/db/migrations/0001_init.sql`（补齐 documents 字段/索引/（可选）tombstone）        |
| Add    | `apps/desktop/renderer/src/features/files/FileTreePanel.tsx`（`data-testid=\"sidebar-files\"`）          |
| Add    | `apps/desktop/renderer/src/stores/fileStore.ts`（documents list/currentDocumentId）                      |
| Update | `apps/desktop/renderer/src/components/layout/Sidebar.tsx`（新增 Files tab 入口）                         |
| Add    | `apps/desktop/tests/e2e/documents-filetree.spec.ts`                                                      |

## Acceptance Criteria

- [ ] Documents IPC（最小闭环）：
  - [ ] `file:document:create/list/read/rename/delete` 可用且错误码稳定
  - [ ] `file:document:setCurrent/getCurrent` 可用，且作用域为 project（不得串 project）
- [ ] current document：
  - [ ] 切换文档后 `currentDocumentId` 持久化，重启可恢复
- [ ] FileTree UI：
  - [ ] Sidebar 存在 Files 入口并可打开（`data-testid=\"sidebar-files\"`）
  - [ ] 文档列表条目使用稳定选择器：`file-row-<documentId>`
  - [ ] 新建文档入口存在：`file-create`
  - [ ] 点击条目切换文档后，Editor 内容切换且不丢失（与 P0-005 的 autosave 对齐）

## Tests

- [ ] E2E（Windows）`documents-filetree.spec.ts`
  - [ ] 创建 project → 创建 doc A → 输入内容并保存
  - [ ] 创建 doc B → 切换到 B 输入不同内容
  - [ ] 来回切换 A/B → 断言内容互不污染
  - [ ] 重启 app → 断言 `currentDocumentId` 恢复且 filetree 列表可见

## Edge cases & Failure modes

- 删除当前文档：
  - 必须写死语义（自动切到最近文档 / 清空 current），并在 E2E 断言
- 重命名为空/超长：
  - `INVALID_ARGUMENT` 且 message 可断言
- 并发保存与切换：
  - 必须定义行为（例如保存先完成或切换阻塞），不得 silent drop

## Observability

- `main.log` 记录：
  - `document_created`（projectId, documentId）
  - `document_renamed`（documentId）
  - `document_deleted`（documentId）
  - `document_set_current`（projectId, documentId）
