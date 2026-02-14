# Proposal: issue-540-s2-change-spec-scaffold

## Why

需要把 `docs/plans/unified-roadmap.md` 中 Sprint 2 的 27 个 change 一次性落为可执行 OpenSpec 资产，并显式标注 `docs/代码问题/` 对应的防治标签，避免后续执行过程重复出现静默失败、安全校验缺失、伪测试覆盖、架构退化等历史问题。

## What Changes

- 新建 27 个 active changes（`s2-*`），每个包含 `proposal.md`、`tasks.md`、`specs/*-delta.md`。
- 每个 change 对齐已归档 S0/S1 结构，统一包含：
  - `依赖同步检查（Dependency Sync Check）`
  - 固定 TDD 六段结构（Specification → TDD Mapping → Red → Green → Refactor → Evidence）
  - `踩坑提醒` 与 `防治标签`
- 更新 `openspec/changes/EXECUTION_ORDER.md`，覆盖 Sprint 2 的 6 个 Wave、依赖关系与执行模式。

## Impact

- Affected specs:
  - `openspec/changes/s2-*/**`
  - `openspec/changes/EXECUTION_ORDER.md`
- Affected code:
  - 文档层改动，不涉及运行时代码
- Breaking change: NO
- User benefit: Sprint 2 执行者可直接按 change 文档进入 TDD，并有标签化防复发约束可审计
