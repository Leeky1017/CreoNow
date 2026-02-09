# 提案：context-engine-p0-layer-assembly-api

## 背景

Context Engine 主 spec 已定义四层模型与组装 API，但当前缺少可直接实施的层数据契约（`source`、`tokenCount`）与降级语义统一定义。
若不先固化 P0 契约，后续预算裁剪、Stable Prefix、Constraints 与硬化项将缺少稳定前置，容易出现跨模块漂移（Context ↔ Retrieval ↔ AI Service ↔ IPC）。

## 变更内容

- 固化 Rules / Settings / Retrieved / Immediate 四层的标准数据契约与固定组装顺序。
- 固化 `context:assemble` 与 `context:inspect` 的 Request-Response 契约与返回结构。
- 明确各层输出必须携带 `source` 与 `tokenCount`。
- 明确数据源不可用时的降级策略：不中断组装，写入 `warnings` 并返回可判定结果。

## 受影响模块

- Context Engine delta：`openspec/changes/context-engine-p0-layer-assembly-api/specs/context-engine-delta.md`
- Context Engine（后续实现阶段）：`apps/desktop/main/src/services/context/`
- IPC 契约（后续实现阶段）：`packages/shared/types/ipc/`
- AI Service 消费侧（后续实现阶段）：`apps/desktop/main/src/services/ai/`

## 依赖关系

- 上游依赖：无（Context Engine P0 基线变更）。
- 下游依赖：
  - `context-engine-p1-token-budget-truncation`
  - `context-engine-p2-stable-prefix-hash`
  - `context-engine-p3-constraints-rules-injection`
  - `context-engine-p4-hardening-boundary`

## Dependency Sync Check

- 核对输入：
  - `openspec/specs/context-engine/spec.md`
  - `openspec/specs/search-and-retrieval/spec.md`
  - `openspec/specs/ai-service/spec.md`
  - `openspec/specs/ipc/spec.md`
- 核对项：数据结构、IPC 契约、错误码、阈值。
- 结论：`NO_DRIFT`。

## Out-of-scope

- Token 预算裁剪策略与预算 CRUD。
- Stable Prefix Hash 计算与缓存命中逻辑。
- Constraints CRUD 与约束优先级裁剪。
- 性能门限、并发与安全硬化矩阵。

## 审阅状态

- Owner 审阅：`PENDING`
