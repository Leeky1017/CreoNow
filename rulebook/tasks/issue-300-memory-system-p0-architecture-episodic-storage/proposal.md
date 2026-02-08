# Proposal: issue-300-memory-system-p0-architecture-episodic-storage

## Why

`memory-system-p0-architecture-episodic-storage` 已通过审批，但当前仓库缺少可执行的 P0 基础实现（工作记忆预算淘汰、episode 持久化、隐式反馈纯函数、IPC record/query 闭环）。若不先落地该层，后续 P1/P2/P3 change 无法建立稳定依赖并通过门禁。

## What Changes

- 落地 MS1-R1/R2/R3/X 全部场景对应实现与测试。
- 新增 episode 存储 schema、索引、容量保护和调度触发接口。
- 新增 `memory:episode:record`（Fire-and-Forget）与 `memory:episode:query`（Request-Response）IPC 契约与 handler。
- 在 renderer `memoryStore` 增补工作记忆结构与 8K token 预算淘汰/会话归档。
- 记录 Red/Green 证据到 `openspec/_ops/task_runs/ISSUE-300.md` 并完成主干收口。

## Impact

- Affected specs:
  - `openspec/changes/memory-system-p0-architecture-episodic-storage/**`
  - `openspec/changes/EXECUTION_ORDER.md`（若执行状态变更）
- Affected code:
  - `apps/desktop/main/src/services/memory/**`
  - `apps/desktop/main/src/ipc/memory.ts`
  - `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `apps/desktop/main/src/db/**`
  - `apps/desktop/renderer/src/stores/memoryStore.ts`
  - `apps/desktop/tests/unit/memory/**`
  - `apps/desktop/tests/integration/memory/**`
- Breaking change: NO
- User benefit: Memory System P0 数据层与契约可用，后续蒸馏/面板/降级 change 可在同一基线继续交付。
