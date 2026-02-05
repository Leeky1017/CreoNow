# ISSUE-203

- Issue: #203
- Branch: task/203-outline-derive-navigate
- PR: <fill-after-created>

## Plan

- 实现 `deriveOutline.ts` 纯函数从 ProseMirror 文档提取 H1-H3 标题
- 实现 `OutlinePanelContainer.tsx` 连接 editorStore，提供 items/activeId/onNavigate
- 更新 `Sidebar.tsx` 使用容器组件，移除占位代码
- 添加单元测试和 E2E 测试

## Runs

### 2026-02-05 19:30 Implementation

- Command: `pnpm test:run -- 'outline'`
- Key output: `✓ renderer/src/features/outline/deriveOutline.test.ts (31 tests)`
- Evidence: All 31 unit tests for deriveOutline passed

### 2026-02-05 19:45 Full test suite

- Command: `pnpm test:run`
- Key output: `Test Files  58 passed (58), Tests  1209 passed (1209)`
- Evidence: All project tests pass

### 2026-02-05 19:50 TypeScript + Lint

- Command: `pnpm typecheck && pnpm lint`
- Key output: Both passed with no errors
- Evidence: No type errors, only pre-existing warnings in unrelated files

## Files Changed

### Added

- `apps/desktop/renderer/src/features/outline/deriveOutline.ts`
- `apps/desktop/renderer/src/features/outline/deriveOutline.test.ts`
- `apps/desktop/renderer/src/features/outline/OutlinePanelContainer.tsx`
- `apps/desktop/tests/e2e/outline-panel.spec.ts`

### Modified

- `apps/desktop/renderer/src/components/layout/Sidebar.tsx`
- `apps/desktop/renderer/src/features/outline/index.ts`
