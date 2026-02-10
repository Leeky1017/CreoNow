# Proposal: issue-373-search-retrieval-p3-hybrid-ranking-explain

## Why

`openspec/changes/search-retrieval-p3-hybrid-ranking-explain` 已定义 SR4 的混合检索与可解释重排契约，但当前主干仅具备 `search:fts:*` 与 `embedding:semantic:search` 的分离能力，缺少统一的两阶段召回、融合打分、Top50 分页输出，以及 `search:rank:explain` / `search:query:strategy` 契约。若不先交付 SR4，下游 `search-retrieval-p4-hardening-boundary` 将建立在不稳定排序语义上，难以验证性能门限与结果可解释性。

## What Changes

- 新增并落地 SR4-R1-S1~S2 两个集成测试（先 Red 后 Green）：
  - `apps/desktop/tests/integration/search/hybrid-ranking-explain.test.ts`
  - `apps/desktop/tests/integration/search/hybrid-pagination-tie-break.test.ts`
- 在主进程 `search` IPC 新增：
  - `search:query:strategy`（支持 `fts|semantic|hybrid`）
  - `search:rank:explain`（返回排序拆解）
- 固化混合检索最小实现：
  - FTS Top200 + Semantic Top200
  - 去重键 `documentId + chunkId`
  - 固定公式 `0.55/0.35/0.10`
  - `finalScore < 0.25` 过滤
  - Top50 首屏 + 分页 + 同分 `updatedAt desc`
  - 候选上限 10,000 与背压信息
- 更新 IPC 合同定义与生成类型，保持契约/实现一致。

## Impact

- Affected specs:
  - `openspec/changes/search-retrieval-p3-hybrid-ranking-explain/**`
- Affected code:
  - `apps/desktop/main/src/services/search/**`
  - `apps/desktop/main/src/ipc/search.ts`
  - `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `packages/shared/types/ipc-generated.ts`
  - `apps/desktop/tests/integration/search/**`
- Breaking change: YES（新增 `search:query:strategy` 与 `search:rank:explain` IPC 契约）
- User benefit: 搜索结果具备稳定可解释排序，支持可审计的混合检索与分页行为，便于定位排序原因和调试检索质量。
