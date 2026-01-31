# P0-005: Editor SSOT + autosave + versioning（actor=user/auto）

Status: pending

## Goal

交付写作主链路的“可靠保存”闭环：TipTap 编辑器可编辑；文档 SSOT=TipTap JSON；自动保存状态可见；版本历史可列出并可恢复（最小）；重启后内容不丢。

## Dependencies

- Spec: `../spec.md#cnwb-req-020`
- Spec: `../spec.md#cnwb-req-030`
- Design: `../design/02-document-model-ssot.md`
- Design: `../design/01-frontend-implementation.md`（稳定选择器）
- P0-014: `./P0-014-project-lifecycle-and-current-project.md`（projectId/rootPath/current project）
- P0-002: `./P0-002-ipc-contract-ssot-and-codegen.md`
- P0-003: `./P0-003-renderer-design-tokens-appshell-resizer-preferences.md`
- P0-004: `./P0-004-sqlite-bootstrap-migrations-logs.md`

## Expected File Changes

| 操作   | 文件路径                                                                                                   |
| ------ | ---------------------------------------------------------------------------------------------------------- |
| Add    | `apps/desktop/renderer/src/features/editor/EditorPane.tsx`（TipTap editor；`data-testid="tiptap-editor"`） |
| Add    | `apps/desktop/renderer/src/features/editor/useAutosave.ts`（autosave 状态机：idle/saving/saved/error）     |
| Add    | `apps/desktop/renderer/src/stores/editorStore.ts`（currentDocumentId/selection/dirty/autosaveStatus）      |
| Add    | `apps/desktop/main/src/ipc/file.ts`（`file:*` channels：create/read/write/list/delete）                    |
| Add    | `apps/desktop/main/src/ipc/version.ts`（`version:*` channels：create/list/diff/restore）                   |
| Add    | `apps/desktop/main/src/services/documents/documentService.ts`（SSOT 写入 + derived 生成 + 事务）           |
| Add    | `apps/desktop/main/src/services/documents/derive.ts`（`content_text`/`content_md` 生成）                   |
| Update | `apps/desktop/main/src/db/migrations/0001_init.sql`（补齐 documents/document_versions 列与索引）           |
| Add    | `apps/desktop/tests/e2e/editor-autosave.spec.ts`                                                           |
| Add    | `apps/desktop/tests/unit/derive.test.ts`                                                                   |

## Acceptance Criteria

- [ ] TipTap editor 可用：
  - [ ] 页面存在 `data-testid="tiptap-editor"`
  - [ ] 可输入、可选区（为后续 AI apply 做准备）
- [ ] 文档 SSOT：
  - [ ] `content_json` 为唯一事实源（DB 中保存）
  - [ ] 每次保存生成 `content_text/content_md`（derived），且不得反写覆盖 SSOT
- [ ] autosave 状态可见：
  - [ ] StatusBar 显示 `saving/saved/error`（文案可按设计稿，但必须稳定可测）
  - [ ] 保存失败必须可恢复（至少提供重试）
- [ ] 版本历史最小可用：
  - [ ] autosave 产生 `actor=auto` 版本（去重：同 `content_hash` 不新增）
  - [ ] 手动保存产生 `actor=user` 版本（策略写死并测试）
  - [ ] `version:list` 可列出版本
  - [ ] `version:restore` 可恢复到某个版本（最小：覆盖当前文档内容）
- [ ] 重启恢复：
  - [ ] 关闭 app → 再启动 → 当前文档内容保持（不丢稿）

## Tests

- [ ] Unit：`derive.test.ts`
  - [ ] 相同 `content_json` → `content_text` deterministic
  - [ ] `content_md` 失败时降级策略可测（若实现）
- [ ] E2E（Windows）`editor-autosave.spec.ts`
  - [ ] 创建文档 → 输入 → 断言出现 `已保存`（或等价 saved 状态）
  - [ ] 关闭 app → 再启动 → 断言内容仍存在
  - [ ] 断言：`document_versions` 至少存在 1 条 `actor=auto` 记录

## Edge cases & Failure modes

- IO/DB 错误 → `DB_ERROR/IO_ERROR`，UI 展示可读错误且允许重试
- autosave 频繁触发 → 必须 debounce + 去重（避免版本爆炸）
- unclean exit（崩溃/强退）→ 下一次启动至少不丢到“最后一次 autosave”

## Observability

- `main.log` 必须记录：
  - `doc_save_started` / `doc_save_succeeded`（含 documentId + content_hash）
  - `doc_save_failed`（含 error.code）
  - `version_created`（actor/reason）
