## 1. Implementation
- [ ] 1.1 定义 Query Planner 契约与 diagnostics 字段（queries/hits/selection）
- [ ] 1.2 在 `rag:retrieve` 中接入 query planning → FTS recall → topN candidates 输出
- [ ] 1.3 增加 local embedding rerank 步骤：阈值/缓存/稳定排序；`MODEL_NOT_READY` 时跳过并写明原因
- [ ] 1.4 对齐 `rag:retrieve` items 语义：`sourceRef` 可移植引用、`snippet`、`score`（含 rerank/fts 诊断信息）
- [ ] 1.5 更新 renderer 的 retrieved layer / context viewer 展示与断言点（mode + reason）

## 2. Testing
- [ ] 2.1 新增单测：rerank enabled 时 top1 可变化（同义改写场景）
- [ ] 2.2 新增单测/集成测：`MODEL_NOT_READY` 时仍返回结果且 diagnostics.reason 明确
- [ ] 2.3 跑通本地验证命令（typecheck/lint/test），并把关键输出写入 RUN_LOG

## 3. Documentation
- [ ] 3.1 更新 `openspec/specs/creonow-v1-workbench/design/07-search-embedding-rag.md`：补充 “Lexical-first + local rerank” 作为 V1 推荐路径
- [ ] 3.2 更新本任务的 spec delta（`rulebook/.../specs/**/spec.md`）与 RUN_LOG（只追加）
