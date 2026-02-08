# Proposal: issue-324-memory-system-p3-isolation-degradation

## Why

`memory-system-p3-isolation-degradation` 仅有 OpenSpec 规划，尚未落地作用域隔离、清除确认与降级策略。若不实现，存在跨项目记忆污染、误删记忆不可恢复、蒸馏/召回故障时用户链路不可判定的问题。

## What Changes

- 实现作用域优先级注入：`project > global`，冲突时项目级覆盖。
- 新增规则提升链路：`memory:scope:promote`。
- 新增清除链路：`memory:clear:project` / `memory:clear:all`（均需显式确认）。
- 实现降级事件与兜底：向量召回故障、全部记忆不可用、蒸馏 IO 失败。
- 新增 7 个集成测试覆盖 MS4-R1 / MS4-R2 / MS4-X 场景。
- 更新 IPC 契约与生成类型（新增 channel 与错误码）。

## Impact

- Affected specs:
  - `openspec/changes/archive/memory-system-p3-isolation-degradation/specs/memory-system-delta.md`
  - `openspec/changes/archive/memory-system-p3-isolation-degradation/tasks.md`
- Affected code:
  - `apps/desktop/main/src/services/memory/episodicMemoryService.ts`
  - `apps/desktop/main/src/ipc/memory.ts`
  - `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `packages/shared/types/ipc-generated.ts`
  - `apps/desktop/tests/integration/memory/*.test.ts`
  - `apps/desktop/tests/unit/memory/retrieval-fallback.test.ts`
  - `package.json`
- Breaking change: NO
- User benefit: 记忆隔离与清理行为可预期，故障降级可判定且不阻断写作主流程。
