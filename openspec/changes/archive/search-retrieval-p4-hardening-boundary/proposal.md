# 提案：search-retrieval-p4-hardening-boundary

## 背景

SR-5 对 SR 全链路做硬化收口：模块级可验收标准与边界异常矩阵。
主 spec 已定义总体边界，但针对跨项目阻断、超时降级可见性、并发冲突与容量溢出的可验证场景仍需在 delta 中补足，避免上线后出现 silent failure 或不可追踪失败。

## 覆盖范围

- Requirement：模块级可验收标准
- Requirement：异常与边界覆盖矩阵
- 核心 Scenario 数：2 + 补充矩阵场景

## 变更内容

- 固化 SR 全链路指标门槛：FTS / Hybrid / RAG p95 与重建吞吐。
- 固化超时降级：统一返回 `SEARCH_TIMEOUT` 且标记 `fallback`，UI 必须可见提示。
- 补齐矩阵场景：网络/IO、数据异常、并发冲突、容量溢出、权限安全。
- 固化跨项目查询阻断：`projectId` 隔离校验失败时返回明确错误码并审计。
- 固化回退策略：语义异常/超时时回退 FTS，不得空白页静默失败。

## 依赖关系

- 上游 change：
  - `search-retrieval-p0-fts-foundation`
  - `search-retrieval-p1-embedding-semantic-rag`
  - `search-retrieval-p2-replace-versioned`
  - `search-retrieval-p3-hybrid-ranking-explain`
- 规范依赖：
  - `openspec/specs/search-and-retrieval/spec.md`
  - `openspec/specs/ipc/spec.md`
  - `openspec/specs/context-engine/spec.md`

## Dependency Sync Check

- 核对输入：
  - `openspec/specs/search-and-retrieval/spec.md`
  - `openspec/specs/ipc/spec.md`
  - `openspec/specs/context-engine/spec.md`
  - `openspec/changes/search-retrieval-p0-fts-foundation/specs/search-and-retrieval-delta.md`
  - `openspec/changes/search-retrieval-p1-embedding-semantic-rag/specs/search-and-retrieval-delta.md`
  - `openspec/changes/search-retrieval-p2-replace-versioned/specs/search-and-retrieval-delta.md`
  - `openspec/changes/search-retrieval-p3-hybrid-ranking-explain/specs/search-and-retrieval-delta.md`
- 核对项：
  - 数据结构：超时回退响应、矩阵错误响应与审计字段可判定。
  - IPC 契约：所有 `search:*`/`embedding:*`/`rag:*` 返回统一 envelope。
  - 错误码：`SEARCH_TIMEOUT`、`SEARCH_BACKPRESSURE`、跨项目阻断码互不冲突。
  - 阈值：FTS/Hybrid/RAG p95、候选上限、并发上限与主 spec 一致。
- 结论：`NO_DRIFT`
- 后续动作：进入 Red，按矩阵逐项验证。

## 受影响模块

- `openspec/changes/search-retrieval-p4-hardening-boundary/**`
- `apps/desktop/main/src/services/search/**`
- `apps/desktop/main/src/services/embedding/**`
- `apps/desktop/main/src/services/rag/**`
- `apps/desktop/main/src/ipc/search.ts`
- `apps/desktop/main/src/ipc/embedding.ts`
- `apps/desktop/main/src/ipc/rag.ts`
- `packages/shared/types/ipc/**`

## Out-of-scope

- 新增第三种检索算法。
- 调整 Owner 固定权重或默认阈值。
- UI 风格扩展（仅要求可见提示，不扩展视觉体系）。

## 审阅状态

- Owner 审阅：`PENDING`
