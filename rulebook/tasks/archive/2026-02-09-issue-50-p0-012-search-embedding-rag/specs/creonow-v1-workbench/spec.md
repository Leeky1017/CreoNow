# Spec Delta: creonow-v1-workbench (ISSUE-50)

本任务交付 CN V1 检索能力的最小闭环：FTS5 全文搜索 + RAG retrieve（进入 retrieved layer 并可视化），并为语义检索/embedding 提供可测降级语义，确保 Windows-first 环境中 sqlite-vec/embedding 不可用时不阻断主链路（best-effort）。

## Changes

- Add: `search:fulltext`：支持 `limit`（默认 20），非法 FTS 语法必须返回 `ok:false` 且 `error.code="INVALID_ARGUMENT"`。
- Add: `rag:retrieve`：返回 `items[]`（`sourceRef/snippet/score`）并包含 `diagnostics`（预算与裁剪证据）。
- Add: Retrieved layer：`ai-context-layer-retrieved` 必须可在 context viewer 中可视化；`sourceRef` 必须为可移植格式（例如 `doc:<documentId>#chunk:<chunkId>`）。
- Add: `search:semantic` / `embedding:*`：若未实现/不可用，必须返回可测降级（例如 `MODEL_NOT_READY` 或回退 FTS），且不得阻断 Workbench 主链路。

## Acceptance

- `search:fulltext` 命中包含 `documentId` 与 `snippet`，非法 query 触发 `INVALID_ARGUMENT`（Integration 可断言）。
- `rag:retrieve` 返回 `sourceRef` 为 portable 引用，retrieved layer 在 context viewer 中可见（E2E 可断言）。
- 降级路径必须可观测（日志）且不导致 UI 卡死或技能运行失败。
