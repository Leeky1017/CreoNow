## 1. Specification

- [x] 1.1 审阅并确认 SR-2 仅覆盖语义嵌入与 RAG 两个 requirement
- [x] 1.2 审阅并确认回退路径：嵌入不可用时自动回退 FTS，RAG 为空时不中断
- [x] 1.3 审阅并确认阈值与默认值：`rag topK=5`、`rag minScore=0.7`、`rag:context:retrieve p95 < 450ms`
- [x] 1.4 依赖同步检查（Dependency Sync Check）：核对 `SR-1`、`context-engine`、`ipc` 在数据结构/契约/错误码/阈值上的一致性；结论 `NO_DRIFT`
- [x] 1.5 Out-of-scope 守卫：不进入替换与混合重排

## 2. TDD Mapping（先测前提）

- [x] 2.0 设定门禁：未出现 Red（失败测试）不得进入实现
- [x] 2.1 将 SR2-R1-S1~S3、SR2-R2-S1~S3 映射为测试用例
- [x] 2.2 标注 Scenario ID 与测试用例一一对应
- [x] 2.3 未记录 Red 失败证据前禁止进入 Green

### Scenario → Test 映射

- [x] SR2-R1-S1 语义搜索相似召回
  - `apps/desktop/tests/integration/search/semantic-search-topk.test.ts`
  - `it('should return semantically similar chunks ordered by score')`
- [x] SR2-R1-S2 嵌入不可用回退 FTS
  - `apps/desktop/tests/integration/search/semantic-fallback-fts.test.ts`
  - `it('should fallback to fts when embedding service is unavailable')`
- [x] SR2-R1-S3 增量嵌入更新
  - `apps/desktop/tests/integration/search/embedding-incremental-update.test.ts`
  - `it('should re-embed only changed paragraphs after autosave')`
- [x] SR2-R2-S1 RAG 注入 Retrieved
  - `apps/desktop/tests/integration/rag/rag-retrieve-inject-context.test.ts`
  - `it('should inject retrieved chunks into context retrieved layer')`
- [x] SR2-R2-S2 RAG 空召回
  - `apps/desktop/tests/integration/rag/rag-empty-retrieve.test.ts`
  - `it('should continue generation when rag retrieve is empty')`
- [x] SR2-R2-S3 RAG 超预算截断
  - `apps/desktop/tests/integration/rag/rag-budget-truncation.test.ts`
  - `it('should truncate rag chunks by score when retrieved budget is exceeded')`

## 3. Red（先写失败测试）

- [x] 3.1 先编写语义检索三条场景失败测试并记录 Red
- [x] 3.2 再编写 RAG 三条场景失败测试并记录 Red
- [x] 3.3 补充默认参数与回退可见提示的断言失败证据

## 4. Green（最小实现通过）

- [x] 4.1 仅实现增量嵌入与语义检索最小路径使 Red 转绿
- [x] 4.2 仅实现 RAG 注入、空召回、超预算截断所需最小路径
- [x] 4.3 仅实现语义不可用回退 FTS 的最小可见提示链路

## 5. Refactor（保持绿灯）

- [x] 5.1 抽离 chunk DTO、RAG DTO 与 Zod schema 复用
- [x] 5.2 统一 fallback 与 truncation 的日志字段，保持外部契约不变

## 6. Evidence

- [x] 6.1 RUN_LOG 记录 Scenario 映射、Red/Green 证据与关键命令输出
- [x] 6.2 记录 Dependency Sync Check 输入、核对项与 `NO_DRIFT` 结论
- [x] 6.3 记录默认参数、回退提示、截断标记的验证证据
