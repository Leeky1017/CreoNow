## 1. Implementation

- [ ] 1.1 DB: migrations 增加 FTS5 schema（表/触发器/索引）
- [ ] 1.2 Main: `ftsService` + `search:fulltext`（错误语义 `INVALID_ARGUMENT` / `DB_ERROR`）
- [ ] 1.3 Main: `embedding:*` IPC（stub + 明确错误码，可测降级）
- [ ] 1.4 Main: `ragService` + `rag:retrieve`（预算 + `sourceRef` 可移植）
- [ ] 1.5 Renderer: SearchPanel + retrieved layer 进入 context viewer
- [ ] 1.6 Update: contextAssembler 集成 retrieved layer（best-effort）

## 2. Testing

- [ ] 2.1 Integration: `apps/desktop/tests/integration/fts-invalid-query.test.ts`
- [ ] 2.2 E2E (Windows): `apps/desktop/tests/e2e/search-rag.spec.ts`
- [ ] 2.3 Verification: `pnpm typecheck && pnpm test:integration && pnpm desktop:test:e2e`

## 3. Documentation

- [ ] 3.1 RUN_LOG: `openspec/_ops/task_runs/ISSUE-50.md`（append-only）
