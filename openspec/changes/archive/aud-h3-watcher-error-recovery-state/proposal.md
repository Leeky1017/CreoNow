# 提案：aud-h3-watcher-error-recovery-state

## Why（问题与目标）

Watcher 在运行中触发 `error` 时，如果不回收状态与资源，会导致：

- `isWatching` 状态漂移（上层误以为仍在 watching）。
- watcher 资源未关闭，造成后续行为不可预测。
- 无法向上层提供明确的“可重试/需要重建”信号。

本 change 的目标是：当 watcher 出错时，必须确定性回收 watch 状态、关闭 watcher，并向上层发布 invalidation 事件，形成可回归的错误恢复契约。

## What（交付内容）

- watcher `error` 事件触发后：
  - `isWatching(projectId)` 必须变为 `false`
  - watcher 必须被关闭
  - 必须触发 `onWatcherInvalidated({ projectId, reason: "error" })`
- 新增回归测试：`apps/desktop/main/src/services/context/__tests__/watchService.error-recovery.test.ts`
  - 覆盖 Scenario `CE-AUD-H3-S1`（对应注释 S1）。

## Scope（影响范围）

- OpenSpec Delta:
  - `openspec/changes/aud-h3-watcher-error-recovery-state/specs/context-engine/spec.md`
- Tests（evidence）:
  - `apps/desktop/main/src/services/context/__tests__/watchService.error-recovery.test.ts`

## Out of Scope（不做什么）

- 不在本 change 内实现 watcher 的自动重连策略（仅提供确定性回收与信号）。
- 不在本 change 内变更 watch API 的通道命名或 payload schema。

## Evidence（可追溯证据）

- Wave0 RUN_LOG：`openspec/_ops/task_runs/ISSUE-589.md`
- Wave0 PR：https://github.com/Leeky1017/CreoNow/pull/590

## 审阅状态

- Owner 审阅：
  - 结论：APPROVED
  - 备注：Lead 代 Owner 审批通过（2026-02-16）
