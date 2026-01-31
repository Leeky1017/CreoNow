# Proposal: issue-17-p0-002-ipc-contract-codegen

## Why

把 IPC 从“手工约定”升级为“契约 SSOT → 自动生成 types → CI 阻断漂移”的闭环，确保 renderer/preload/main 对通道与错误语义永远一致；同时在 IPC 边界强制 Envelope 与稳定错误码，避免异常穿透与 silent failure。

## What Changes

- 新增 IPC contract SSOT：集中定义 channels、请求/响应 schema 与错误码字典。
- 增加 codegen：从 SSOT 生成 `packages/shared/types/ipc-generated.ts`（提交入库，禁止手改）。
- Preload 暴露唯一入口 `window.creonow.invoke(channel,payload)`，并增加运行时校验（unknown channel 拒绝、返回 Envelope）。
- Renderer 提供 typed IPC client，禁止直接使用 `ipcRenderer.invoke`。
- CI 增加 `pnpm contract:check`：生成后 `git diff --exit-code` 必须为 0。

## Impact

- Affected specs:
  - `openspec/specs/creonow-v1-workbench/spec.md#cnwb-req-040`
  - `openspec/specs/creonow-v1-workbench/task_cards/p0/P0-002-ipc-contract-ssot-and-codegen.md`
- Affected code:
  - `apps/desktop/main/src/ipc/contract/**`
  - `packages/shared/types/ipc-generated.ts`
  - `scripts/contract-generate.ts`
  - `apps/desktop/preload/src/ipc.ts`
  - `apps/desktop/renderer/src/lib/ipcClient.ts`
  - `.github/workflows/ci.yml`
- Breaking change: NO（新增契约与约束；不改变既有通道语义）
- User benefit: IPC 调用类型与错误语义稳定可测，减少漂移与返工；CI 可自动阻断“协议不一致”类故障
