# Design 04 — React ErrorBoundary（防白屏 + 可恢复）

> Spec: `../spec.md#cnmvp-req-004`
>
> Related card: `../task_cards/p0/P0-004-react-error-boundary.md`

## 1) 目标

- 防止渲染异常导致整页白屏
- 把错误变成“可恢复、可观测”的状态

## 2) 形态（写死）

新增 `ErrorBoundary`（class component，使用 `componentDidCatch`）：

- 包裹位置：`apps/desktop/renderer/src/main.tsx`（包裹 `<App />`）
- Fallback UI：使用 patterns `ErrorState`（或等价统一样式）

## 3) 恢复策略（必须二选一并写死）

MVP 选择：**Reload App**

- Primary action: `Reload`
  - 行为：`window.location.reload()`
- Secondary action: `Copy error details`
  - 行为：复制 `error.message + componentStack`（用于支持排障）

> 为什么不做 “Back to Dashboard”：需要跨 store reset 的明确语义，P0 会扩大范围；P1 可以再做。

## 4) 可观测性（最低要求）

- renderer 端必须记录一个错误事件（临时允许 `console.error` 一次；P2 再收敛到 logger）
- E2E 必须覆盖：触发一个受控 render error → 显示 fallback → 点击 Reload 有效（或 mock reload）
