# Proposal: issue-579-s3-zen-mode

## Why

`s3-zen-mode` 需要在现有实现上补齐可审计的 Sprint3 场景闭环（S1/S2/S3）：进入时隐藏干扰面板、退出时恢复进入前布局快照、快捷键切换不出现双重切换。当前代码缺少针对该契约的独立场景测试，且 F11 长按会触发重复事件导致状态回翻。

## What Changes

- 新增 3 个聚焦场景测试：
  - `zen-mode-enter.test.tsx`
  - `zen-mode-exit-restore.test.tsx`
  - `zen-mode-shortcut.test.tsx`
- 在 `AppShell` 的 F11 处理逻辑中增加 `KeyboardEvent.repeat` 防重入保护，避免一次长按导致禅模式重复翻转。
- 更新 OpenSpec change checklist、RUN_LOG 与 Rulebook 任务文档，记录 RED/GREEN 证据和依赖同步检查结论。

## Impact

- Affected specs:
  - `openspec/changes/s3-zen-mode/tasks.md`
- Affected code:
  - `apps/desktop/renderer/src/components/layout/AppShell.tsx`
  - `apps/desktop/renderer/src/features/zen-mode/__tests__/zen-mode-enter.test.tsx`
  - `apps/desktop/renderer/src/features/zen-mode/__tests__/zen-mode-exit-restore.test.tsx`
  - `apps/desktop/renderer/src/features/zen-mode/__tests__/zen-mode-shortcut.test.tsx`
  - `openspec/_ops/task_runs/ISSUE-579.md`
  - `rulebook/tasks/issue-579-s3-zen-mode/tasks.md`
- Breaking change: NO
- User benefit: 禅模式切换行为更稳定，进入/退出布局行为有可追踪测试与交付证据，降低回归风险。
