# Memory System — MS-3 Panel & Provenance (Issue #320)

## Scope

- Memory Panel 交互闭环：确认、修改、删除、手动添加、暂停/恢复学习。
- GenerationTrace 溯源展示与反馈：`memory:trace:get` / `memory:trace:feedback`。
- 异常矩阵：`MEMORY_TRACE_MISMATCH`、`MEMORY_SCOPE_DENIED`。

## Scenario Mapping

- MS3-R1-S1 → `renderer/src/features/memory/__tests__/memory-panel-confirm.test.tsx`
- MS3-R1-S2 → `renderer/src/features/memory/__tests__/memory-panel-edit.test.tsx`
- MS3-R1-S3 → `renderer/src/features/memory/__tests__/memory-panel-delete.test.tsx`
- MS3-R1-S4 → `renderer/src/features/memory/__tests__/memory-panel-manual-add-empty-state.test.tsx`
- MS3-R1-S5 → `renderer/src/features/memory/__tests__/memory-panel-pause-learning.test.tsx`
- MS3-R2-S1 → `apps/desktop/tests/integration/memory/trace-get-display.test.ts`
- MS3-R2-S2 → `apps/desktop/tests/integration/memory/trace-feedback.test.ts`
- MS3-X-S1 → `apps/desktop/tests/integration/memory/trace-mismatch-error.test.ts`
- MS3-X-S2 → `apps/desktop/tests/integration/memory/trace-cross-project-deny.test.ts`

## Acceptance

- `MemoryPanel` 使用设计 token：`--color-bg-surface`、`--color-bg-raised`、`--radius-sm`、`--color-warning`。
- Storybook 覆盖 4 态：默认、空状态、暂停学习、冲突通知。
- `typecheck`、`test:unit`、`test:integration`、`apps/desktop test:run`、`storybook:build` 通过。
