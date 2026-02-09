# Proposal: issue-361-ai-service-p1-streaming-cancel-lifecycle

## Why
`openspec/changes/ai-service-p1-streaming-cancel-lifecycle` 已定义流式生命周期、取消优先竞态与网络中断重试语义，但代码与测试仍停留在旧事件模型（`run_started/delta/run_completed`）。若不收敛为可判定终态，后续 `ai-service-p2/p5` 将在取消、完成、异常并发场景出现行为漂移。

## What Changes
- 落地 `executionId` 驱动的流式协议：`skill:stream:chunk` + `skill:stream:done`，并固定 done 终态 `completed | cancelled | error`。
- 引入生成生命周期状态机，确保终态不可逆且 `cancelled` 在并发竞态中优先。
- 实现网络中断后的完整 prompt 重放（非断点续传）路径。
- 新增并通过 S1/S2 集成测试，记录 Red/Green 证据并归档 change。

## Impact
- Affected specs:
  - `openspec/changes/ai-service-p1-streaming-cancel-lifecycle/**`
  - `openspec/changes/EXECUTION_ORDER.md`（归档阶段同步）
- Affected code:
  - `packages/shared/types/ai.ts`
  - `apps/desktop/main/src/services/ai/aiService.ts`
  - `apps/desktop/main/src/ipc/ai.ts`
  - `apps/desktop/preload/src/aiStreamBridge.ts`
  - `apps/desktop/renderer/src/features/ai/useAiStream.ts`
  - `apps/desktop/renderer/src/stores/aiStore.ts`
  - `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `packages/shared/types/ipc-generated.ts`
  - `apps/desktop/tests/integration/ai-stream-lifecycle.test.ts`
  - `apps/desktop/tests/integration/ai-stream-race-cancel-priority.test.ts`
- Breaking change: NO（保留向后兼容字段，调用方同步迁移到 `executionId`）
- User benefit: 流式状态可判定、停止生成在竞态下行为稳定、网络抖动场景可恢复
