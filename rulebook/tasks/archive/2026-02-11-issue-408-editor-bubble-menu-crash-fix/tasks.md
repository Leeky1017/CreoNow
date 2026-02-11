## 1. Implementation

- [x] 1.1 创建 OPEN Issue #408 与 `task/408-editor-bubble-menu-crash-fix` worktree
- [x] 1.2 创建并 validate Rulebook task
- [x] 1.3 应用 `EditorBubbleMenu` 挂载策略修复

## 2. Testing

- [x] 2.1 Red：`pnpm -C apps/desktop test:e2e -- tests/e2e/ai-apply.spec.ts` 失败证据
- [x] 2.2 Green：同命令复跑通过
- [x] 2.3 Fresh gate：`pnpm typecheck`
- [x] 2.4 Fresh gate：`pnpm lint`
- [x] 2.5 Fresh gate：`pnpm contract:check`
- [x] 2.6 Fresh gate：`pnpm cross-module:check`
- [x] 2.7 Fresh gate：`pnpm test:unit`
- [x] 2.8 Fresh gate：`pnpm -C apps/desktop test:run`

## 3. Documentation

- [x] 3.1 补录 `openspec/_ops/task_runs/ISSUE-408.md`
- [x] 3.2 新增 OpenSpec delta：`openspec/changes/editor-bubble-menu-crash-fix/*`
- [x] 3.3 更新 `openspec/changes/EXECUTION_ORDER.md`
