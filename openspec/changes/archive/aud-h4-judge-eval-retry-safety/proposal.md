# 提案：aud-h4-judge-eval-retry-safety

## Why（问题与目标）

AI 面板启用 Judge 自动评估（auto-eval）时，若某次评估调用失败，系统不能把该 `runId` 永久锁死为“已评估”（否则会 silent skip，用户无法再次获得评估结果）。该问题属于稳定性与可治理性风险：失败路径必须可恢复、可回归验证。

本 change 的目标是：首次 auto-eval 失败后，同一 `runId` 必须允许在后续合适的状态窗口再次触发评估；同时需要幂等守卫避免无限重试循环。

## What（交付内容）

- 修复 runId 锁死：首次 `judge:quality:evaluate` 失败后，不应永久标记为已评估。
- 明确评估状态窗口：在 `running -> idle` 等状态转换后允许再次触发评估调用。
- 新增回归测试：`apps/desktop/renderer/src/features/ai/__tests__/judge-auto-eval-retry-safety.test.tsx`
  - 覆盖 Scenario `AIS-AUD-H4-S2`（测试用例名 tag 使用 `AISVC-AUD-H4-S2`）。

## Scope（影响范围）

- OpenSpec Delta:
  - `openspec/changes/aud-h4-judge-eval-retry-safety/specs/ai-service/spec.md`
- Tests（evidence）:
  - `apps/desktop/renderer/src/features/ai/__tests__/judge-auto-eval-retry-safety.test.tsx`

## Out of Scope（不做什么）

- 不在本 change 内调整 Judge 评分策略或阈值（仅修复重试安全性）。
- 不在本 change 内引入新的 IPC 通道（仅约束既有 `judge:quality:evaluate` 调用时机）。

## Evidence（可追溯证据）

- Wave1 RUN_LOG：`openspec/_ops/task_runs/ISSUE-591.md`
- Wave1 PR：https://github.com/Leeky1017/CreoNow/pull/592

## 审阅状态

- Owner 审阅：
  - 结论：APPROVED
  - 备注：Lead 代 Owner 审批通过（2026-02-16）
