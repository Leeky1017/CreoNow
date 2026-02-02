# Proposal: issue-112-search-fts-agent-local-rerank

## Why

CreoNow 的写作辅助需要“可解释、可控、可降级”的检索链路。当前 `rag:retrieve` 主要依赖 FTS 召回且 embedding/semantic 处于 `MODEL_NOT_READY` 降级态，缺少可观测的检索规划（query planning）与可测试的“精排增强但不中断”的能力。

## What Changes

- 定义并落地 Agent Query Planner 的契约与 `rag:retrieve.diagnostics` 字段（记录生成的 FTS queries、命中数、最终选段）。
- 在不引入向量库的前提下，将本地 embedding 作为 topN candidates 的可选精排（rerank）步骤，并提供缓存与明确降级语义（`MODEL_NOT_READY` → 跳过精排）。
- 对齐 `rag:retrieve` 产物与 context viewer 的 retrieved layer 展示，使 E2E/集成测试可断言“精排生效/降级原因”。
- 更新 OpenSpec 设计文档，明确 V1 推荐路径：Lexical-first（FTS）+ optional local rerank。

## Impact

- Affected specs:
  - `openspec/specs/creonow-v1-workbench/design/07-search-embedding-rag.md`
  - `rulebook/tasks/issue-112-search-fts-agent-local-rerank/specs/creonow-v1-workbench/spec.md`
- Affected code:
  - `apps/desktop/main/src/ipc/rag.ts`
  - `apps/desktop/main/src/ipc/search.ts`
  - `apps/desktop/main/src/ipc/embedding.ts`
  - Renderer retrieved layer / context viewer related UI
  - Tests (unit/integration/e2e as applicable)
- Breaking change: NO (keep `rag:retrieve.items[]` shape stable)
- User benefit: 更稳定的上下文检索（FTS 主链路）+ 更相关的排序（本地精排可选）+ 全链路可观测且在模型未就绪时不中断。
