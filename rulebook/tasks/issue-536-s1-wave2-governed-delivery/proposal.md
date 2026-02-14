# Proposal: issue-536-s1-wave2-governed-delivery

## Why

需要将 `openspec/changes/EXECUTION_ORDER.md` 中 Wave 2 的三个 change（`s1-ipc-acl`、`s1-runtime-config`、`s1-context-ipc-split`）一次性交付并完成主会话审计，确保 IPC 准入安全、运行时治理配置一致性、Context IPC 注册层解耦三项基础能力全部落地，为 Wave 3 服务提取提供稳定基线。

## What Changes

- 完成 `s1-ipc-acl`：新增主进程 IPC 调用方 ACL，并在 runtime-validation 入口前统一拦截未授权调用。
- 完成 `s1-runtime-config`：新增统一 runtime governance 配置中心，收敛 `ipc/ai/kg/rag` 关键阈值默认值、env 覆盖与非法值回退。
- 完成 `s1-context-ipc-split`：将 `registerContextIpcHandlers` 拆分为 `contextAssembly/contextBudget/contextFs` 三个子注册器，`context.ts` 仅保留聚合编排。
- 补齐对应 Red/Green 测试、更新三个 change 的 `tasks.md`、归档完成 change，并同步 `EXECUTION_ORDER.md`。

## Impact

- Affected specs:
  - `openspec/changes/s1-ipc-acl/**`
  - `openspec/changes/s1-runtime-config/**`
  - `openspec/changes/s1-context-ipc-split/**`
  - `openspec/changes/EXECUTION_ORDER.md`
- Affected code:
  - `apps/desktop/main/src/ipc/**`
  - `apps/desktop/main/src/config/**`
  - `apps/desktop/main/src/services/ai/aiService.ts`
  - `apps/desktop/main/src/services/kg/kgService.ts`
  - `apps/desktop/preload/src/**`
  - `packages/shared/runtimeGovernance.ts`
- Breaking change: NO
- User benefit: IPC 安全准入更严格、运行时阈值治理更一致、Context IPC 维护成本更低。
