# P0-004: React ErrorBoundary（防白屏 + 可恢复）

Status: todo

## Goal

新增全局 React ErrorBoundary，捕获渲染异常并展示一致的错误 UI，避免整页白屏。

## Assets in Scope

- `apps/desktop/renderer/src/main.tsx`（挂载点）
- `apps/desktop/renderer/src/components/patterns/ErrorState.tsx`（复用样式）

## Dependencies

- Spec: `../spec.md#cnmvp-req-004`
- Design: `../design/04-error-boundary-and-crash-recovery.md`

## Expected File Changes

| 操作 | 文件路径 |
| --- | --- |
| Add | `apps/desktop/renderer/src/components/patterns/ErrorBoundary.tsx` |
| Update | `apps/desktop/renderer/src/components/patterns/index.ts`（export） |
| Update | `apps/desktop/renderer/src/main.tsx`（包裹 `<App />`） |
| Add | `apps/desktop/renderer/src/components/patterns/ErrorBoundary.test.tsx`（Vitest：fallback + reload button） |

## Detailed Breakdown

1. 新增 `ErrorBoundary`
   - class component（使用 `componentDidCatch`）
   - state 持有 `error` 与 `componentStack`
2. Fallback UI：
   - 复用 `ErrorState`
   - Primary：`Reload`（`window.location.reload()`）
   - Secondary：`Copy error details`
3. 挂载：
   - 在 `main.tsx` 包裹 `<App />`
4. 测试：
   - 构造一个会 throw 的子组件
   - 断言 fallback 出现、按钮可点击（reload 可通过 spy/mock）

## Acceptance Criteria

- [ ] 渲染错误不再白屏，显示统一错误 UI
- [ ] 用户可以点击 Reload 恢复
- [ ] 错误详情可复制
- [ ] Vitest 覆盖上述行为

## Tests

- [ ] `pnpm -C apps/desktop test:run`

## Edge cases

- ErrorBoundary 自己的渲染不得抛错（fallback 内部不得依赖复杂状态）

## Observability

- 允许一次 `console.error(\"renderer_error_boundary_caught\", ...)`（P2 再收敛 logger）

## Completion

- Issue: TBD
- PR: TBD
- RUN_LOG: `openspec/_ops/task_runs/ISSUE-<N>.md`

