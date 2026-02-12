# Proposal: issue-416-skill-system-p3-scheduler-concurrency-timeout

## Why

`skill-system-p0/p1/p2` 已归档后，技能链路仍缺少生产可用的并发调度与超时控制能力：同会话串行 FIFO、全局并发上限、会话队列上限、依赖缺失阻断与可观测队列状态。如果不完成该 change，技能调用在并发和异常场景下会出现不可预测行为，且 `skill-system-p4` 将缺少稳定前置基线。

## What Changes

- 引入独立 `SkillScheduler` 模块，落实：
  - 同会话 FIFO 串行执行；
  - 全局并发上限 `8`；
  - 每会话队列上限 `20` 与溢出拒绝（`SKILL_QUEUE_OVERFLOW`）。
- 在 `aiService` 中接入调度器，补齐 `timeoutMs` 默认/上限（`30000`/`120000`）和超时终态 `SKILL_TIMEOUT`。
- 在 `skillExecutor` + `skillService` 中补齐 `dependsOn` 依赖校验与 `SKILL_DEPENDENCY_MISSING`。
- 打通队列状态事件到渲染层（shared type、preload bridge、store、AI 面板）。
- 更新 IPC 错误码契约并重新生成 `ipc-generated.ts`。
- 完成 change/RUN_LOG/Rulebook 证据、preflight、PR auto-merge 与 main 收口。

## Impact

- Affected specs:
  - `openspec/changes/skill-system-p3-scheduler-concurrency-timeout/proposal.md`
  - `openspec/changes/skill-system-p3-scheduler-concurrency-timeout/tasks.md`
  - `openspec/changes/skill-system-p3-scheduler-concurrency-timeout/specs/skill-system-delta.md`
- Affected code:
  - `apps/desktop/main/src/services/skills/{skillScheduler.ts,skillExecutor.ts,skillLoader.ts,skillService.ts,skillValidator.ts}`
  - `apps/desktop/main/src/services/ai/aiService.ts`
  - `apps/desktop/main/src/ipc/{ai.ts,contract/ipc-contract.ts}`
  - `apps/desktop/preload/src/aiStreamBridge.ts`
  - `apps/desktop/renderer/src/{stores/aiStore.ts,features/ai/{useAiStream.ts,AiPanel.tsx}}`
  - `packages/shared/types/{ai.ts,ipc-generated.ts}`
  - `apps/desktop/tests/{integration/skill-session-queue-limit.test.ts,unit/skill-executor.test.ts,unit/ai-store-run-request-options.test.ts}`
- Breaking change: NO
- User benefit: 技能并发执行可预测、队列/超时可见、依赖错误可判定，避免高并发卡死与静默失败。
