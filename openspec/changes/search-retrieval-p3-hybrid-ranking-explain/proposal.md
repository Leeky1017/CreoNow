# 提案：search-retrieval-p3-hybrid-ranking-explain

## 背景

SR-4 在 SR-1/2/3 完成后，固化混合检索的可解释排序能力。
若不先确定两阶段召回、融合重排公式、Top50 首屏与 explain 契约，搜索结果将缺乏稳定排序语义，难以定位排序原因，且无法在性能与可解释性之间建立验收基线。

## 覆盖范围

- Requirement：检索算法与排序策略
- 核心 Scenario 数：2

## 变更内容

- 固化两阶段召回：FTS Top200 + Semantic Top200。
- 固化融合重排：`finalScore = 0.55*bm25Norm + 0.35*semanticScore + 0.10*recencyScore`。
- 固化去重与同分规则：按 `documentId + chunkId` 去重；同分按 `updatedAt` 降序。
- 固化结果返回：首屏 Top50、`hasMore`、分页增量加载。
- 固化 explain 契约：`scoreBreakdown`、`search:rank:explain`、`search:query:strategy`。

## 依赖关系

- 上游 change：
  - `search-retrieval-p1-embedding-semantic-rag`
  - `search-retrieval-p2-replace-versioned`
- 间接前置：`search-retrieval-p0-fts-foundation`
- 规范依赖：
  - `openspec/specs/search-and-retrieval/spec.md`
  - `openspec/specs/ipc/spec.md`

## Dependency Sync Check

- 核对输入：
  - `openspec/specs/search-and-retrieval/spec.md`
  - `openspec/specs/ipc/spec.md`
  - `openspec/changes/search-retrieval-p0-fts-foundation/specs/search-and-retrieval-delta.md`
  - `openspec/changes/search-retrieval-p1-embedding-semantic-rag/specs/search-and-retrieval-delta.md`
  - `openspec/changes/search-retrieval-p2-replace-versioned/specs/search-and-retrieval-delta.md`
- 核对项：
  - 数据结构：融合结果中 `scoreBreakdown`、`finalScore`、分页字段可判定。
  - IPC 契约：`search:rank:explain`、`search:query:strategy` 命名与 envelope 一致。
  - 错误码：策略非法值、查询超时、并发背压可区分。
  - 阈值：hybrid 首屏 p95 < 650ms、单次候选上限 10,000。
- 结论：`NO_DRIFT`
- 后续动作：进入 Red，不调整 Owner 固定权重/阈值。

## 受影响模块

- `openspec/changes/search-retrieval-p3-hybrid-ranking-explain/**`
- `apps/desktop/main/src/services/search/**`
- `apps/desktop/main/src/services/embedding/**`
- `apps/desktop/main/src/ipc/search.ts`
- `apps/desktop/renderer/src/features/search/**`
- `packages/shared/types/ipc/**`

## Out-of-scope

- 调整 Owner 固定权重与阈值。
- 新增第三种检索算法。
- 回滚 UI 与替换流程扩展。

## 审阅状态

- Owner 审阅：`PENDING`
