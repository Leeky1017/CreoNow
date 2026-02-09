# Proposal: issue-360-search-retrieval-p1-embedding-semantic-rag

## Why

`openspec/changes/search-retrieval-p1-embedding-semantic-rag` 已定义 SR2 的 6 个核心场景（语义检索、不可用回退、增量嵌入、RAG 注入、空召回、预算截断），但主干仍停留在 P0 的 `search:fts:*` 与 `rag:context:retrieve` 基线。若不在本任务统一 `embedding:*` / `rag:*` 契约与最小可用链路，后续 SR-P3/P4 会建立在漂移接口上，导致测试和治理门禁无法稳定收口。

## What Changes

- 新增并落地 SR2 的 6 个场景测试（先 Red 后 Green）。
- 收敛 IPC 到 `embedding:text:generate/search/reindex` 与 `rag:context:retrieve/config:get/config:update`。
- 落地段落级 chunk 结构、语义检索排序、语义不可用时 FTS 自动回退与提示信息。
- 落地 RAG 检索 `topK=5`、`minScore=0.7` 默认参数，支持空召回不报错与预算截断 `truncated` 标记。
- 将检索结果映射到 Context Retrieved 层可消费结构，并补齐对应验证。

## Impact

- Affected specs:
  - `openspec/changes/search-retrieval-p1-embedding-semantic-rag/**`
  - `openspec/specs/search-and-retrieval/spec.md`（仅消费，不直接改主 spec）
- Affected code:
  - `apps/desktop/main/src/services/embedding/**`
  - `apps/desktop/main/src/services/rag/**`
  - `apps/desktop/main/src/ipc/embedding.ts`
  - `apps/desktop/main/src/ipc/rag.ts`
  - `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `packages/shared/types/ipc-generated.ts`
  - `apps/desktop/tests/integration/search/**`
  - `apps/desktop/tests/integration/rag/**`
- Breaking change: YES（移除旧 `rag:context:retrieve` 与旧 `embedding:*` P0 通道）
- User benefit: 语义检索与 RAG 链路可用、可降级、可判定，并与 OpenSpec SR2 场景一一对应。
