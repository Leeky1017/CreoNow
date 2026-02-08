# Proposal: issue-297-knowledge-graph-p0-p2-change-specs

## Why

Knowledge Graph 主规范覆盖数据层、渲染层与 AI 利用链路，若不先按阶段拆分为 P0/P1/P2 三个 change，会导致依赖顺序不清、实现范围漂移和交付证据不可追踪。

## What Changes

- 新建并交付 3 个 KG change 三件套文档：
  - `knowledge-graph-p0-entity-relation-query`
  - `knowledge-graph-p1-visualization-extended-views`
  - `knowledge-graph-p2-auto-recognition-ai-utilization`
- 在每个 change 中补齐 requirement 场景、跨切异常覆盖、Out-of-Scope。
- 更新 `openspec/changes/EXECUTION_ORDER.md`，将 KG-1 → KG-2 → KG-3 纳入活跃 change 串行依赖。
- 维持 OpenSpec + Rulebook + GitHub 交付链一致（Issue、task 分支、RUN_LOG、preflight、PR auto-merge）。

## Impact

- Affected specs:
  - `openspec/changes/knowledge-graph-p0-entity-relation-query/**`
  - `openspec/changes/knowledge-graph-p1-visualization-extended-views/**`
  - `openspec/changes/knowledge-graph-p2-auto-recognition-ai-utilization/**`
  - `openspec/changes/EXECUTION_ORDER.md`
- Affected code: 无（本任务仅交付规范文档）
- Breaking change: NO
- User benefit: 为 KG 后续实现提供严格串行、可测试、可审阅的执行蓝图
