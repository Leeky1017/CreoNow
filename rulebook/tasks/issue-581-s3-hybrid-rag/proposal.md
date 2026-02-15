# Proposal: issue-581-s3-hybrid-rag

## Why

Sprint 3 的 Hybrid RAG 需要把 `rag:context:retrieve` 从单一路径召回升级为 FTS + semantic 融合重排，保证去重、排序解释和 token 预算截断在同一条可验证链路中执行，降低召回结果抖动与回归排查成本。

## What Changes

- 新增 `hybridRagRanking` 纯函数模块，集中实现融合去重、同源 `scoreBreakdown` 计算和确定性排序。
- 在 `rag:context:retrieve` 的 semantic 成功分支接入 Hybrid 流程（FTS + semantic 融合、阈值过滤、token 预算截断）。
- 新增 S3-HR-S1/S2/S3 测试并执行 Red → Green。
- 回归受影响 RAG / retrieval 集成测试，确保旧契约稳定。

## Impact

- Affected specs:
  - `openspec/changes/s3-hybrid-rag/specs/search-and-retrieval-delta.md`
  - `openspec/changes/s3-hybrid-rag/tasks.md`
- Affected code:
  - `apps/desktop/main/src/services/rag/hybridRagRanking.ts`
  - `apps/desktop/main/src/services/rag/__tests__/hybrid-rag.merge.test.ts`
  - `apps/desktop/main/src/services/rag/__tests__/hybrid-rag.explain.test.ts`
  - `apps/desktop/main/src/services/rag/__tests__/hybrid-rag.truncate.test.ts`
  - `apps/desktop/main/src/ipc/rag.ts`
  - `apps/desktop/tests/integration/rag-retrieve-rerank.test.ts`
- Breaking change: NO
- User benefit: RAG 召回结果更稳定，可解释分数与最终排序同源，且预算截断行为可重现。
