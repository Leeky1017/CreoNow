# 提案：context-engine-p4-hardening-boundary

## 背景

CE-1 ~ CE-4 已覆盖结构、预算、哈希与约束逻辑，但模块级硬化边界（性能、容量、并发、安全、异常矩阵）尚未形成可验收闭环。
需要通过 P4 统一固化 NFR 与异常路径，避免上线后出现不可观测降级和权限漂移。

## 变更内容

- 固化模块级可验收标准：p95/p99、容量上限、并发上限、日志脱敏。
- 固化异常与边界覆盖矩阵，明确关键错误码与阻断条件。
- 固化 `context:inspect` 权限与调试模式约束。
- 固化并发预算更新冲突、跨项目注入阻断场景。

## 受影响模块

- Context Engine delta：`openspec/changes/context-engine-p4-hardening-boundary/specs/context-engine-delta.md`
- Context Engine（后续实现阶段）：`apps/desktop/main/src/services/context/`
- IPC / 安全边界（后续实现阶段）：`packages/shared/types/ipc/`
- Observability（后续实现阶段）：`apps/desktop/main/src/services/logging/`

## 依赖关系

- 上游依赖：
  - `context-engine-p2-stable-prefix-hash`
  - `context-engine-p3-constraints-rules-injection`
- 下游依赖：无（CE 主链收口项）。

## Dependency Sync Check

- 核对输入：
  - `openspec/changes/context-engine-p2-stable-prefix-hash/specs/context-engine-delta.md`
  - `openspec/changes/context-engine-p3-constraints-rules-injection/specs/context-engine-delta.md`
  - `openspec/specs/context-engine/spec.md`
  - `openspec/specs/ipc/spec.md`
- 核对项：数据结构、IPC 契约、错误码、阈值。
- 结论：`NO_DRIFT`。

## Out-of-scope

- 调整 Owner 固定优先级（层顺序）。
- 调整预算默认比例（15/10/25/50）。
- Judge 算法本体实现。

## 审阅状态

- Owner 审阅：`PENDING`
