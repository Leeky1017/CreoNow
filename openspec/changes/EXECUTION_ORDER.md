# Active Changes Execution Order

更新时间：2026-02-10 12:14

适用范围：`openspec/changes/` 下所有非 `archive/`、非 `_template/` 的活跃 change。

## 执行策略

- 当前活跃 change 数量为 **6**。
- 执行模式：**分阶段并行（阶段内并行，阶段间串行）**。
- 变更泳道：
  - Context Engine：`p4`（`context-engine-p0/p1/p2/p3` 已归档）
  - AI Service：`(p3 || p4) → p5`（`ai-service-p0/p1/p2` 已归档）
  - Search & Retrieval：`p3 → p4`（`search-retrieval-p0-fts-foundation`、`search-retrieval-p1-embedding-semantic-rag`、`search-retrieval-p2-replace-versioned` 已归档）

## 执行顺序

1. Phase A（并行）
   - `context-engine-p4-hardening-boundary`（依赖已归档 `context-engine-p2-stable-prefix-hash` + `context-engine-p3-constraints-rules-injection`）
   - `ai-service-p3-judge-quality-pipeline`（依赖已归档 `ai-service-p2-panel-chat-apply-flow`）
   - `ai-service-p4-candidates-usage-stats`（依赖已归档 `ai-service-p2-panel-chat-apply-flow`）
   - `search-retrieval-p3-hybrid-ranking-explain`（依赖已归档 `search-retrieval-p1-embedding-semantic-rag` + `search-retrieval-p2-replace-versioned`）
2. Phase B（并行）
   - `search-retrieval-p4-hardening-boundary`（依赖已归档 `search-retrieval-p0-fts-foundation` + `search-retrieval-p1-embedding-semantic-rag` + `search-retrieval-p2-replace-versioned` + `search-retrieval-p3-hybrid-ranking-explain`）
3. Phase C（并行）
   - `ai-service-p5-failover-quota-hardening`（依赖已归档 `ai-service-p0-llmproxy-config-security` + `ai-service-p1-streaming-cancel-lifecycle` + `ai-service-p3-judge-quality-pipeline` + `ai-service-p4-candidates-usage-stats`）

## 依赖说明

- 所有存在上游依赖的 change，在进入 Red 前必须完成并落盘 Dependency Sync Check（至少核对数据结构、IPC 契约、错误码、阈值）。
- 当前已登记变更的 Dependency Sync Check 结论均为 `NO_DRIFT`；若任一 change 发现 `DRIFT`，必须先更新该 change 的 `proposal.md`、`specs/*`、`tasks.md`，再推进 Red/Green。
- 跨泳道协同要求：
  - `ai-service-p5-failover-quota-hardening` 进入 Red 前需同步核对 `ai-service-p3/p4` 的错误码与统计字段。

## 维护规则

- 任一活跃 change 的范围、依赖、状态发生变化时，必须同步更新本文件。
- 活跃 change 数量或拓扑变化时，必须更新执行模式、阶段顺序与更新时间。
- 未同步本文件时，不得宣称执行顺序已确认。
