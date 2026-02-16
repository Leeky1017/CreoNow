# Proposal: issue-587-audit-change-decomposition

## Why

第二轮全量审计已确认 C/H/M 多类系统性问题，但尚缺“可执行、可验证、可编排”的细粒度 change 体系。若直接进入实现，容易出现范围混叠、依赖失控与审计回归。

## What Changes

- 将审计项 C1-C3 / H1-H6 / M1-M5 拆解为 22 个细粒度 change。
- 为每个 change 补齐 `proposal/spec/tasks` 三件套，满足 TDD-first 结构。
- 维护活跃变更拓扑 `openspec/changes/EXECUTION_ORDER.md`（22 项依赖顺序）。
- 落盘 Owner 代审记录与实施波次编排文档。

## Impact

- Affected specs:
  - `openspec/changes/EXECUTION_ORDER.md`
  - `openspec/changes/aud-*/specs/*/spec.md`
  - `rulebook/tasks/issue-587-audit-change-decomposition/specs/governance/spec.md`
- Affected code:
  - `openspec/changes/aud-*/proposal.md`
  - `openspec/changes/aud-*/tasks.md`
  - `docs/CN-审计问题-Change拆解与Owner审批记录-2026-02-16.md`
  - `docs/CN-审计整改实施编排-2026-02-16.md`
  - `openspec/_ops/task_runs/ISSUE-587.md`
  - `rulebook/tasks/issue-587-audit-change-decomposition/*`
- Breaking change: NO
- User benefit: 审计问题已转化为可落地的精细变更计划，且具备依赖拓扑、审批结论与实施审计机制。
