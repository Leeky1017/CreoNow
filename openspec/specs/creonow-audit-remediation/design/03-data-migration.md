# Design 03 — Data & Migration

## Scope

- CNAUD-REQ-004
- CNAUD-REQ-006
- CNAUD-REQ-035

## Current-State Evidence

- db/init.ts 中 migration 版本存在“可选迁移 + schema_version 前跳”风险。
- DB 初始化失败后应用继续启动，但用户侧降级状态缺少统一可见语义。
- document_versions 当前缺少 retention/prune 策略。

## Target Design

1. Migration Monotonicity
   - 迁移版本必须严格单调回放。
   - 能力可选不能通过“跳过版本号”实现。
   - 能力开关落独立 capability 表，不污染 schema version 序列。

2. Degraded Mode Contract
   - DB 不可用时必须进入明确降级模式（只读/禁写/提示恢复）。
   - 前后端错误呈现统一：错误码、用户提示、恢复动作。

3. Version Retention
   - 提供可配置策略：按条数保留与按时间保留。
   - prune 行为需可审计（日志 + 统计）。

## Verification Gates

- migration roundtrip（含 sqlite-vec 可用/不可用两条路径）。
- DB 初始化失败场景 UI 行为一致性测试。
- version prune 触发与回归测试。
