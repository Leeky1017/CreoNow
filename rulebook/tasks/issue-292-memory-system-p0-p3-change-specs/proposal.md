# Proposal: issue-292-memory-system-p0-p3-change-specs

## Why

需要将 Memory System 主规范拆分为 4 个严格串行的变更包（MS-1~MS-4），为后续 Agent 并行执行实现提供可审阅、可测试、可追踪的 delta 基线，避免跨阶段实现耦合和范围漂移。

## What Changes

- 新建 4 个 OpenSpec change 目录并分别编写 proposal/specs/tasks：
  - `memory-system-p0-architecture-episodic-storage`
  - `memory-system-p1-distillation-decay-conflict`
  - `memory-system-p2-panel-provenance`
  - `memory-system-p3-isolation-degradation`
- 在每个 delta spec 中映射主 spec requirement 与核心 scenario 数，并补充跨切异常场景。
- 更新 `openspec/changes/EXECUTION_ORDER.md`，明确 4 个活跃 change 的串行依赖顺序。
- 创建并绑定 GitHub Issue #292，保证任务入口为当前 OPEN issue。

## Impact

- Affected specs:
  - `openspec/changes/EXECUTION_ORDER.md`
  - `openspec/changes/memory-system-p0-architecture-episodic-storage/**`
  - `openspec/changes/memory-system-p1-distillation-decay-conflict/**`
  - `openspec/changes/memory-system-p2-panel-provenance/**`
  - `openspec/changes/memory-system-p3-isolation-degradation/**`
- Affected code: 无（本任务仅编写变更规范）
- Breaking change: NO
- User benefit: 为 Memory System 后续实现提供稳定、可审阅且可按阶段执行的规范蓝图。
