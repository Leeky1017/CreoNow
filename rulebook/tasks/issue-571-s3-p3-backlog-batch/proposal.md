# Proposal: issue-571-s3-p3-backlog-batch

## Why

`s3-p3-backlog-batch` 是 Sprint 3 的 14 项低危治理批处理，目标是把已识别的 `ADDONLY/NOISE/DRIFT/FAKETEST` 复发点收敛为可验证防线。当前仓库仍存在若干未收敛项（占位参数、deprecated 样式入口、弱断言、监听器释放缺失、TODO 无 issue 追踪等），需要通过 Spec-first + TDD 一次性补齐。

## What Changes

- 新增 `CMI-S3-BB-S1..S4` 四个 focused tests，分别覆盖：14 项追踪、契约稳定、复发防线、漂移防线。
- 补齐审计映射 `openspec/changes/s3-p3-backlog-batch/evidence/audit-item-map.json`。
- 以最小改动修复低危缺口：移除占位参数、下线 deprecated 面板样式路径、强化断言、补一次性告警、补 listener/timer 释放、补 TODO 关联 issue、补导出依赖批准记录。
- 更新 OpenSpec change tasks、RUN_LOG、Rulebook task 文档。

## Impact

- Affected specs:
  - `openspec/changes/s3-p3-backlog-batch/specs/cross-module-integration-delta.md`
  - `openspec/changes/s3-p3-backlog-batch/tasks.md`
- Affected code:
  - `apps/desktop/preload/src/aiStreamBridge.ts`
  - `apps/desktop/renderer/src/components/layout/AppShell.tsx`
  - `apps/desktop/renderer/src/features/character/AddRelationshipPopover.tsx`
  - `apps/desktop/renderer/src/features/outline/OutlinePanel.tsx`
  - `apps/desktop/renderer/src/features/quality-gates/QualityGatesPanel.tsx`
  - `apps/desktop/tests/**/sprint3/backlog-batch-*.test.ts`
- Breaking change: NO
- User benefit: Sprint 3 backlog 批处理具备可追溯且可执行的回归防线，后续治理与验收成本下降。
