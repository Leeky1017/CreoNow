# 提案：editor-bubble-menu-crash-fix

## 背景

在 AI apply 成功/冲突路径中，渲染进程会出现 `NotFoundError: Failed to execute 'removeChild' on 'Node'`，并触发 ErrorBoundary 导致页面崩溃。定位显示崩溃发生在 `EditorBubbleMenu` 相关提交阶段，根因是 BubbleMenu 在选区频繁变化时发生卸载/重挂载竞态。

## 变更内容

- 调整 `EditorBubbleMenu` 挂载策略：保持 `BubbleMenu` 持续挂载，通过 `shouldShow` 控制显隐。
- 在 Vitest runtime 下保持现有测试可见性行为，不引入额外渲染副作用。
- 保持既有交互契约：选区存在时显示、选区折叠时隐藏、Code Block 中抑制显示。

## 受影响模块

- `editor` — BubbleMenu 生命周期与显隐控制策略。

## 不做什么

- 不改动 AI apply 业务逻辑（`AiPanel` / `aiStore`）。
- 不新增 BubbleMenu 功能按钮或样式语义。
- 不修改 IPC 契约。

## 审阅状态

- Owner 审阅：`PENDING`
