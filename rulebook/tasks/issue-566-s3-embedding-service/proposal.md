# Proposal: issue-566-s3-embedding-service

## Why

当前 embedding 编排仍依赖调用方分散决策，导致 primary/fallback 语义与错误返回不一致。该任务需要把 provider 选择与 fallback 触发集中到 service 层，确保 `S3-ES-S1/S2/S3` 的行为可预测、可测试、可审计。

## What Changes

- 在 `embeddingService` 引入统一 provider policy（primary + fallback）编排。
- 对 primary 超时场景提供显式、可配置 fallback，并记录结构化 warning（`primaryProvider`、`fallbackProvider`、`reason`）。
- fallback 禁用时返回明确错误码 `EMBEDDING_PROVIDER_UNAVAILABLE`，禁止空结果伪成功。
- 对齐 IPC 错误码契约与生成类型，避免 contract drift。

## Impact

- Affected specs: `openspec/changes/s3-embedding-service/specs/search-and-retrieval-delta.md`
- Affected code:
  - `apps/desktop/main/src/services/embedding/embeddingService.ts`
  - `apps/desktop/main/src/services/embedding/__tests__/embedding-service.primary.test.ts`
  - `apps/desktop/main/src/services/embedding/__tests__/embedding-service.fallback.test.ts`
  - `apps/desktop/main/src/ipc/{embedding.ts,rag.ts}`
  - `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `packages/shared/types/ipc-generated.ts`
- Breaking change: NO
- User benefit: embedding 失败路径具备一致、可观测的降级与失败语义，避免静默成功。
