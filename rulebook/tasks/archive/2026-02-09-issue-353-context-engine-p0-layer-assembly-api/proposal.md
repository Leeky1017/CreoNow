# Proposal: issue-353-context-engine-p0-layer-assembly-api

## Why

`openspec/changes/context-engine-p0-layer-assembly-api` 当前只有规格草案，未落地四层契约组装与降级语义，导致后续 CE P1/P2/P3 缺少稳定前置，且 IPC 消费侧无法依赖统一返回结构。

## What Changes

- 新增 Context Layer Assembly 服务：固化四层顺序 `rules -> settings -> retrieved -> immediate`，并输出 `source/tokenCount/truncated` 契约字段。
- 新增 IPC 通道：`context:prompt:assemble` 与 `context:prompt:inspect`，返回可判定结果并支持单层降级 warnings。
- 扩展 IPC contract schema 并重新生成 `packages/shared/types/ipc-generated.ts`。
- 新增 CE1 场景映射测试（4 个 unit tests），覆盖层契约完整性、降级 warning、assemble/inspect 契约。
- 完成 change 证据与归档收口（RUN_LOG、Rulebook、OpenSpec archive、EXECUTION_ORDER 更新）。

## Impact

- Affected specs:
  - `openspec/changes/context-engine-p0-layer-assembly-api/specs/context-engine-delta.md`
  - `openspec/changes/context-engine-p0-layer-assembly-api/tasks.md`
- Affected code:
  - `apps/desktop/main/src/services/context/layerAssemblyService.ts`
  - `apps/desktop/main/src/ipc/context.ts`
  - `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `packages/shared/types/ipc-generated.ts`
  - `apps/desktop/tests/unit/context/*.test.ts`
  - `package.json`
- Breaking change: NO
- User benefit: Context Engine P0 提供稳定、可测试、可消费的组装 API，为后续预算/哈希/约束迭代建立基线。
