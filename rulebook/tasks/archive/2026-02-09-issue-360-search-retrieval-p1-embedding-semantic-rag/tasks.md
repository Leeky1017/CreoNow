## 1. Implementation

- [x] 1.1 建立 SR2-R1-S1~S3、SR2-R2-S1~S3 的测试文件与场景映射（先 Red）
- [x] 1.2 实现 `embedding:text:generate` / `embedding:semantic:search` / `embedding:index:reindex` 与段落 chunk 最小链路
- [x] 1.3 实现语义不可用自动回退 FTS，并返回可见提示信息
- [x] 1.4 实现 `rag:context:retrieve` / `rag:config:get` / `rag:config:update` 与默认参数 `topK=5` `minScore=0.7`
- [x] 1.5 实现 RAG 空召回不中断、预算截断与 `truncated` 标记
- [x] 1.6 实现 Retrieved 注入可消费结构并通过场景验证

## 2. Testing

- [x] 2.1 Red：执行 6 个新增场景测试并记录失败证据
- [x] 2.2 Green：执行 6 个新增场景测试并全部通过
- [x] 2.3 回归：`pnpm contract:check`、`pnpm cross-module:check`、`pnpm test:unit` 通过

## 3. Documentation

- [x] 3.1 更新 `openspec/_ops/task_runs/ISSUE-360.md`（Scenario 映射、Red/Green、关键命令输出）
- [x] 3.2 完成 `openspec/changes/search-retrieval-p1-embedding-semantic-rag/tasks.md` 勾选与证据项
- [x] 3.3 完成 change 归档、`EXECUTION_ORDER.md` 同步、Rulebook task 自归档
