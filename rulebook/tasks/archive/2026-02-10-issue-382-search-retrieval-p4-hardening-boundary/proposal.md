# Proposal: issue-382-search-retrieval-p4-hardening-boundary

## Why

`openspec/changes/search-retrieval-p4-hardening-boundary` 已定义 SR5 的模块验收阈值与异常边界矩阵，但主干仍缺少可执行的边界错误码与跨项目阻断收口：超时可见降级、reindex IO 失败重试语义、数据损坏隔离、replace 并发冲突、候选容量背压、`search/* + embedding/* + rag/*` 的 `projectId` 审计阻断均未形成统一契约。若不完成 SR5，Search & Retrieval 链路在高压和异常条件下仍可能出现不可判定失败或 silent failure。

## What Changes

- 按 SR5-R1/R2 场景补齐测试（先 Red 后 Green）：
  - `apps/desktop/tests/perf/search/search-retrieval-slo.benchmark.test.ts`
  - `apps/desktop/tests/integration/search/search-timeout-visible-fallback.test.ts`
  - `apps/desktop/tests/integration/search/search-reindex-io-error.test.ts`
  - `apps/desktop/tests/integration/search/search-data-corruption-isolation.test.ts`
  - `apps/desktop/tests/integration/search/search-replace-autosave-conflict.test.ts`
  - `apps/desktop/tests/integration/search/search-capacity-backpressure.test.ts`
  - `apps/desktop/tests/integration/search/search-cross-project-forbidden.test.ts`
- 在检索域实现最小硬化路径：
  - 超时统一错误 `SEARCH_TIMEOUT` + `fallback` + 可见提示字段
  - reindex IO 失败映射 `SEARCH_REINDEX_IO_ERROR` 且 `retryable=true`
  - 数据损坏隔离错误 `SEARCH_DATA_CORRUPTED`，在线查询不中断
  - replace 写冲突返回 `SEARCH_CONCURRENT_WRITE_CONFLICT`
  - 候选超限触发 `SEARCH_BACKPRESSURE`（含 `retryAfterMs`）
  - 跨项目调用返回 `SEARCH_PROJECT_FORBIDDEN` 并记录审计日志
- 同步 IPC contract 与生成类型，确保 envelope 与错误码可判定。

## Impact

- Affected specs:
  - `openspec/changes/search-retrieval-p4-hardening-boundary/**`
- Affected code:
  - `apps/desktop/main/src/services/search/**`
  - `apps/desktop/main/src/services/embedding/**`
  - `apps/desktop/main/src/services/rag/**`
  - `apps/desktop/main/src/ipc/search.ts`
  - `apps/desktop/main/src/ipc/embedding.ts`
  - `apps/desktop/main/src/ipc/rag.ts`
  - `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `packages/shared/types/ipc-generated.ts`
  - `apps/desktop/tests/integration/search/**`
  - `apps/desktop/tests/perf/search/**`
- Breaking change: YES（检索域新增错误码与响应字段）
- User benefit: 异常可见、可重试、可追踪，跨项目边界具备明确阻断与审计证据，降低 silent failure 风险。
