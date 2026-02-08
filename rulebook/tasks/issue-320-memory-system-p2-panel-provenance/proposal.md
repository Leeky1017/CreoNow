# Proposal: issue-320-memory-system-p2-panel-provenance

## Why

MS-2 已具备记忆蒸馏与冲突治理能力，但用户端缺少可见可控入口，且 AI 生成结果没有可解释溯源。缺失面板交互与溯源反馈将导致用户无法确认/修正偏好规则，也无法对错误引用形成闭环反馈。

## What Changes

- 新增 Memory Panel（MS-3）语义规则操作闭环：确认、修改、删除、手动添加、暂停/恢复学习。
- 新增 GenerationTrace 能力：`memory:trace:get` 查询溯源、`memory:trace:feedback` 记录用户判断反馈。
- 扩展 IPC 契约与错误码：`MEMORY_TRACE_MISMATCH`、`MEMORY_SCOPE_DENIED`。
- 交付 Storybook 4 态（默认/空状态/暂停学习/冲突通知）与 Scenario 对应测试矩阵（renderer + integration）。

## Impact

- Affected specs:
  - `openspec/changes/archive/memory-system-p2-panel-provenance/specs/memory-system-delta.md`
- Affected code:
  - `apps/desktop/main/src/services/memory/memoryTraceService.ts`
  - `apps/desktop/main/src/ipc/memory.ts`
  - `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `packages/shared/types/ipc-generated.ts`
  - `apps/desktop/renderer/src/features/memory/MemoryPanel.tsx`
  - `apps/desktop/renderer/src/features/memory/MemoryPanel.test.tsx`
  - `apps/desktop/renderer/src/features/memory/MemoryPanel.stories.tsx`
  - `apps/desktop/renderer/src/features/memory/__tests__/*.test.tsx`
  - `apps/desktop/tests/integration/memory/trace-*.test.ts`
- Breaking change: NO
- User benefit: 用户可直接治理偏好规则并查看“为什么这样写”的溯源依据，异常路径可判定且不泄漏跨项目信息。
