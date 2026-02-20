# 提案：aud-c1b-renderer-async-state-convergence

## Why（问题与目标）

关键 panel/store 的异步刷新路径若缺少 `try/catch/finally` 收敛，可能出现：

- invoke 抛错后状态停留在 `loading`，UI 长期显示 “Loading”（状态漂移）。
- error 信息未被记录，调用方无法给出可解释的失败反馈。

本 change 的目标是让关键异步路径在“成功/失败/抛错”三种情况下都能确定性收敛状态：不留在 loading、错误可回归、UI 不被卡死。

## What（交付内容）

- 为关键 async 刷新路径补齐 `try/catch/finally`，确保：
  - 抛错时状态从 `loading` 收敛到 `error`。
  - `skillsLastError` 等错误信息可回归。
  - UI 侧 model picker 不会长期停留在 Loading。
- 新增回归测试：
  - `apps/desktop/renderer/src/stores/__tests__/aiStore.async-convergence.test.ts`
  - `apps/desktop/renderer/src/features/ai/__tests__/models-loading-convergence.test.tsx`

## Scope（影响范围）

- OpenSpec Delta:
  - `openspec/changes/aud-c1b-renderer-async-state-convergence/specs/workbench/spec.md`
- Tests（evidence）:
  - `apps/desktop/renderer/src/stores/__tests__/aiStore.async-convergence.test.ts`
  - `apps/desktop/renderer/src/features/ai/__tests__/models-loading-convergence.test.tsx`

## Out of Scope（不做什么）

- 不在本 change 内调整业务功能（仅修复状态机收敛与错误可观测性）。
- 不在本 change 内引入新的 store 架构（仅补齐 async 错误路径的收敛逻辑）。

## Evidence（可追溯证据）

- Wave1 RUN_LOG：`openspec/_ops/task_runs/ISSUE-591.md`
- Wave1 PR：https://github.com/Leeky1017/CreoNow/pull/592

## 审阅状态

- Owner 审阅：
  - 结论：APPROVED
  - 备注：Lead 代 Owner 审批通过（2026-02-16）
