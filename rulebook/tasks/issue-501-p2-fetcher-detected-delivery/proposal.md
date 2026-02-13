# Proposal: issue-501-p2-fetcher-detected-delivery

## Why

`openspec/changes/p2-fetcher-detected` 仍未交付：Context Engine 的 retrieved layer 仍是空桩，无法按 `when_detected` 自动注入实体信息，Phase-2 Codex 上下文链路断裂。与此同时，仓库缺少可直接用于 LLM/agent 联调的 `apps/desktop/.env.example` 模板，导致本地验证门槛高且配置易漂移。

## What Changes

- 新增 `apps/desktop/main/src/services/context/fetchers/retrievedFetcher.ts`，实现 `createRetrievedFetcher({ kgService, matchEntities })`。
- 在 `layerAssemblyService.ts` 的 `defaultFetchers()` 中接入 retrieved fetcher（默认使用 C10 `matchEntities`）。
- 新增 `apps/desktop/main/src/services/context/__tests__/retrievedFetcher.test.ts`，覆盖 S1-S5（Red→Green）。
- 新增并完善 `apps/desktop/.env.example`，提供 LLM/agent 本地测试所需环境变量模板。
- 更新 `openspec/changes/p2-fetcher-detected/tasks.md` 与 `openspec/_ops/task_runs/ISSUE-501.md` 证据链。

## Impact

- Affected specs:
  - `openspec/changes/p2-fetcher-detected/specs/context-engine/spec.md`
  - `openspec/changes/p2-fetcher-detected/tasks.md`
- Affected code:
  - `apps/desktop/main/src/services/context/fetchers/retrievedFetcher.ts`
  - `apps/desktop/main/src/services/context/layerAssemblyService.ts`
  - `apps/desktop/main/src/services/context/__tests__/retrievedFetcher.test.ts`
  - `apps/desktop/.env.example`
- Breaking change: NO
- User benefit: Retrieved 层能自动识别文本中的实体引用并注入实体详情；LLM/agent 联调可直接基于标准化 env 模板启动。
