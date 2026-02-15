# Rulebook Spec Snapshot: issue-566-s3-embedding-service

## Source

- `openspec/changes/s3-embedding-service/specs/search-and-retrieval-delta.md`

## Scoped Scenarios

- `S3-ES-S1`: Primary provider 成功时不触发 fallback warning。
- `S3-ES-S2`: Primary 超时时按显式配置触发 fallback，并记录结构化 warning。
- `S3-ES-S3`: fallback 禁用时返回 `EMBEDDING_PROVIDER_UNAVAILABLE`，不得伪成功。

## Out of Scope

- Hybrid RAG 排序策略变更
- Renderer 搜索交互改造
- 新增无关 IPC 通道
