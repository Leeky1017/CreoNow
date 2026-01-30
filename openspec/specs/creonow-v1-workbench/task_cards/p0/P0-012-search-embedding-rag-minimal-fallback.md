# P0-012: Search/Embedding/RAG（FTS + retrieve + fallback）

Status: pending

## Goal

交付可用且可降级的检索链路：FTS5 全文搜索（确定性错误语义）+ 最小 RAG retrieve（进入 retrieved layer 并可视化）。语义检索/embedding 可做最小实现或先做可测降级，但必须写死并可在 E2E 断言。

## Dependencies

- Spec: `../spec.md#cnwb-req-100`
- Design: `../design/07-search-embedding-rag.md`
- Design: `../design/04-context-engineering.md`（retrieved layer 可视化）
- P0-004: `./P0-004-sqlite-bootstrap-migrations-logs.md`
- P0-008: `./P0-008-context-engineering-viewer-redaction-watch.md`

## Expected File Changes

| 操作   | 文件路径                                                                                        |
| ------ | ----------------------------------------------------------------------------------------------- |
| Update | `apps/desktop/main/src/db/migrations/0001_init.sql`（FTS5 表/触发器/索引）                      |
| Add    | `apps/desktop/main/src/ipc/search.ts`（`search:fulltext/semantic`）                             |
| Add    | `apps/desktop/main/src/ipc/embedding.ts`（`embedding:encode/index`；可先 stub + 明确错误码）    |
| Add    | `apps/desktop/main/src/ipc/rag.ts`（`rag:retrieve`）                                            |
| Add    | `apps/desktop/main/src/services/search/ftsService.ts`                                           |
| Add    | `apps/desktop/main/src/services/rag/ragService.ts`（预算 + 引用格式）                           |
| Add    | `apps/desktop/renderer/src/features/search/SearchPanel.tsx`（可挂在 Sidebar 或 CommandPalette） |
| Add    | `apps/desktop/tests/integration/fts-invalid-query.test.ts`                                      |
| Add    | `apps/desktop/tests/e2e/search-rag.spec.ts`                                                     |

## Acceptance Criteria

- [ ] FTS5：
  - [ ] `search:fulltext(query)` 返回匹配结果（至少包含 documentId/snippet）
  - [ ] FTS 语法错误必须返回 `INVALID_ARGUMENT`（可断言 message）
- [ ] RAG：
  - [ ] `rag:retrieve(queryText)` 返回 `items[]`，每项包含 `sourceRef/snippet/score`
  - [ ] `sourceRef` 必须为可移植引用（禁止绝对路径；例如 `doc:<id>#chunk:<id>`）
  - [ ] retrieved layer 可在 context viewer 中可视化（`ai-context-layer-retrieved`）
- [ ] Semantic/Embedding：
  - [ ] 若未实现语义检索：必须返回可测降级（`MODEL_NOT_READY` 或回退 FTS），语义写死
  - [ ] 降级不得阻断技能运行（best-effort）

## Tests

- [ ] Integration：`fts-invalid-query.test.ts`
  - [ ] 传入非法 query → `INVALID_ARGUMENT`
- [ ] E2E（Windows）`search-rag.spec.ts`
  - [ ] 创建文档并写入唯一关键字 → `search:fulltext` 命中
  - [ ] 运行带检索的 skill（或直接调用 `rag:retrieve`）→ 打开 context viewer → 断言 retrieved layer 出现

## Edge cases & Failure modes

- 空 query/过长 query → `INVALID_ARGUMENT`
- DB 错误 → `DB_ERROR`（UI 必须可恢复）
- sqlite-vec/embedding 不可用 → 走降级并记录原因（不得 silent）

## Observability

- `main.log` 记录：
  - `search_fulltext`（queryLength/resultCount）
  - `rag_retrieve`（queryLength/resultCount/budgetTokens）
  - `semantic_disabled`（reason）
