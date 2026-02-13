# Proposal: issue-503-p2-memory-injection-delivery

## Why

`openspec/changes/p2-memory-injection` 仍处于活跃态，当前 `layerAssemblyService` 的 settings fetcher 仍返回空 chunks，导致 Memory 预览结果无法注入 Context Engine 的 Settings 层。该缺口会让 Phase-2 的个性化上下文链路不完整，且与 change 的 S1-S5 规范场景不一致。

## What Changes

- 新增 `apps/desktop/main/src/services/context/fetchers/settingsFetcher.ts`，实现 `createSettingsFetcher({ memoryService })`。
- 在 `layerAssemblyService.ts` 的 `defaultFetchers()` 中接入 settings fetcher（默认显式注入 `memoryService`）。
- 新增 `apps/desktop/main/src/services/context/__tests__/settingsFetcher.test.ts`，覆盖 S1-S5，严格 Red → Green。
- 更新 `openspec/changes/p2-memory-injection/tasks.md` 与 `openspec/_ops/task_runs/ISSUE-503.md` 证据链。
- 完成后归档 change 到 `openspec/changes/archive/p2-memory-injection` 并同步 `EXECUTION_ORDER.md`。

## Impact

- Affected specs:
  - `openspec/changes/p2-memory-injection/specs/memory-system/spec.md`
  - `openspec/changes/p2-memory-injection/tasks.md`
  - `openspec/changes/EXECUTION_ORDER.md`
- Affected code:
  - `apps/desktop/main/src/services/context/fetchers/settingsFetcher.ts`
  - `apps/desktop/main/src/services/context/layerAssemblyService.ts`
  - `apps/desktop/main/src/services/context/__tests__/settingsFetcher.test.ts`
- Breaking change: NO
- User benefit: Settings 层可稳定注入用户写作偏好记忆，并在异常/降级时返回可观测 warning，不阻断主流程。
