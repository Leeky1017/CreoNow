# Proposal: issue-306-memory-system-p1-distillation-decay-conflict

## Why

MS-1 仅具备情景记忆存储基线，缺失语义蒸馏、衰减生命周期和冲突治理，无法稳定输出可注入 Context Engine 的偏好规则。

## What Changes

- 新增 MS-2 场景测试（R1/R2/R3/X 共 10 个）并先 Red 后 Green。
- 在 Memory Service 增加语义蒸馏管线、衰减纯函数、冲突队列、并发写入 WAL 隔离。
- 扩展 IPC 契约与主进程 handlers：`memory:semantic:*`、`memory:distill:progress`。
- 新增错误码：`MEMORY_DISTILL_LLM_UNAVAILABLE`、`MEMORY_CONFIDENCE_OUT_OF_RANGE`。

## Impact

- Affected specs: `openspec/changes/memory-system-p1-distillation-decay-conflict/specs/memory-system-delta.md`
- Affected code:
  - `apps/desktop/main/src/services/memory/episodicMemoryService.ts`
  - `apps/desktop/main/src/ipc/memory.ts`
  - `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `packages/shared/types/ipc-generated.ts`
  - `apps/desktop/tests/unit/memory/*`
  - `apps/desktop/tests/integration/memory/*`
- Breaking change: NO
- User benefit: 语义偏好可持续学习且可治理，异常路径可观测，蒸馏与写入并发下保持一致性。
