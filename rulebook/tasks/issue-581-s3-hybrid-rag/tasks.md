## 1. Implementation

- [x] 1.1 新增 `hybridRagRanking`，实现融合去重、最终分数计算与稳定排序。
- [x] 1.2 在 `rag:context:retrieve` semantic 成功分支接入 Hybrid 融合检索。
- [x] 1.3 接入 token 预算截断并返回稳定 `truncated/usedTokens` 语义。

## 2. Testing

- [x] 2.1 S3-HR-S1 Red→Green：`hybrid-rag.merge.test.ts`
- [x] 2.2 S3-HR-S2 Red→Green：`hybrid-rag.explain.test.ts`
- [x] 2.3 S3-HR-S3 Red→Green：`hybrid-rag.truncate.test.ts`
- [x] 2.4 受影响回归：`rag-retrieve-rerank`、`rag-budget-truncation`、`rag-empty-retrieve`、`rag-retrieve-inject-context`、`search-cross-project-forbidden`

## 3. Governance

- [x] 3.1 更新 `openspec/changes/s3-hybrid-rag/tasks.md`（含依赖同步检查与 Red/Green 证据）
- [x] 3.2 新建并更新 `openspec/_ops/task_runs/ISSUE-581.md`
- [ ] 3.3 Main Session Audit（由 lead 在主会话签字提交）
- [x] 3.4 执行 `rulebook task validate issue-581-s3-hybrid-rag`
- [x] 3.5 commit + push 到 `origin/task/581-s3-hybrid-rag`（不创建 PR）
