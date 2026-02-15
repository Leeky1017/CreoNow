# Proposal: issue-553-sprint3-change-scaffold

## Why

需要基于 `docs/plans/unified-roadmap.md` 的 Sprint 3 规划，一次性起草 17 个 change 三件套，并把 `docs/代码问题/*.md` 的 12 类反模式防线前置写入每个 change，避免后续执行阶段重复踩坑与跨会话质量回退。

## What Changes

- 并行起草 Sprint 3 全部 17 个活跃 change 的 `proposal.md`、`tasks.md`、`specs/*-delta.md`。
- 每个 change 对齐已归档 S0/S1 文档结构，强制落盘：
  - 防治标签
  - 踩坑提醒（防复发）
  - 代码问题审计重点（引用 `docs/代码问题/*.md`）
- 更新 `openspec/changes/EXECUTION_ORDER.md` 为 Sprint 3 依赖拓扑与 wave 执行顺序。
- 由主会话对全部子代理产物进行审计并补齐遗漏。

## Impact

- Affected specs:
  - `openspec/changes/s3-*/proposal.md`
  - `openspec/changes/s3-*/tasks.md`
  - `openspec/changes/s3-*/specs/*-delta.md`
  - `openspec/changes/EXECUTION_ORDER.md`
- Affected code:
  - 无（本任务仅起草治理与规格文档）
- Breaking change: NO
- User benefit:
  - Sprint 3 后续实施拥有可执行、可审计、可防复发的 change 基线，降低实现阶段返工风险。
