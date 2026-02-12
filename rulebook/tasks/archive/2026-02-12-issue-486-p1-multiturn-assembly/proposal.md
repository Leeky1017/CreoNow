# Proposal: issue-486-p1-multiturn-assembly

## Why

`openspec/changes/p1-multiturn-assembly` 是当前唯一 active change，但仍处于未收口状态：`tasks.md` 尚未完成六段证据闭环，且缺少本次交付对应的 Rulebook 任务与 RUN_LOG。需要在不复用已关闭 issue 的前提下，完成该 change 的规范收口、测试证据补全、归档迁移与 GitHub 门禁合并。

## What Changes

- 新建并执行 `issue-486-p1-multiturn-assembly` 的 Rulebook 任务，完成 validate
- 复核 `buildLLMMessages` 与 `estimateMessageTokens` 对应 delta spec S1-S4 的场景覆盖
- 回填 `openspec/changes/p1-multiturn-assembly/tasks.md` 的 Specification/TDD Mapping/Red/Green/Refactor/Evidence 六段内容
- 归档 change 到 `openspec/changes/archive/p1-multiturn-assembly` 并同步 `openspec/changes/EXECUTION_ORDER.md`
- 新增 `openspec/_ops/task_runs/ISSUE-486.md`，记录依赖同步、门禁一致性、测试与合并证据

## Impact

- Affected specs:
  - `openspec/changes/p1-multiturn-assembly/**`（归档后路径迁移至 `archive/`）
  - `openspec/changes/EXECUTION_ORDER.md`
  - `openspec/_ops/task_runs/ISSUE-486.md`
- Affected code:
  - `apps/desktop/main/src/services/ai/buildLLMMessages.ts`（行为复核，无代码变更）
  - `apps/desktop/main/src/services/ai/__tests__/buildLLMMessages.test.ts`（回归复核，无代码变更）
- Breaking change: NO
- User benefit: Phase 1 最后一个 active change 完成交付闭环，审计链路完整且可追溯，控制面 `main` 与 OpenSpec 状态一致。
