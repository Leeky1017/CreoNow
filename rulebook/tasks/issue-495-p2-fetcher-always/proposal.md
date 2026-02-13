# Proposal: issue-495-p2-fetcher-always

## Why
`openspec/changes/p2-fetcher-always` 要求 Context Engine 的 Rules 层从知识图谱注入 `aiContextLevel="always"` 实体。当前实现仍使用硬编码桩字符串，导致规则层没有真实实体信息，破坏 Phase-2 的上下文装配链路，并阻断 C12 对通用格式化函数的复用。

## What Changes
- 新建 `apps/desktop/main/src/services/context/fetchers/rulesFetcher.ts`，实现 `createRulesFetcher` 与 `formatEntityForContext`。
- 新建 `apps/desktop/main/src/services/context/__tests__/rulesFetcher.test.ts`，覆盖 S1-S4 场景并执行 Red→Green。
- 修改 `apps/desktop/main/src/services/context/layerAssemblyService.ts`，将 rules 默认 fetcher 接入 `createRulesFetcher`（保留无 KG 依赖时的兼容 fallback）。
- 修改 `apps/desktop/main/src/ipc/context.ts` 与 `apps/desktop/main/src/ipc/ai.ts`，在可用 DB 场景注入 `kgService` 供 rules fetcher 查询。
- 更新 `openspec/changes/p2-fetcher-always/tasks.md` 与 `openspec/_ops/task_runs/ISSUE-495.md` 证据。

## Impact
- Affected specs:
  - `openspec/changes/p2-fetcher-always/specs/context-engine/spec.md`
  - `openspec/changes/p2-fetcher-always/tasks.md`
- Affected code:
  - `apps/desktop/main/src/services/context/fetchers/rulesFetcher.ts`
  - `apps/desktop/main/src/services/context/__tests__/rulesFetcher.test.ts`
  - `apps/desktop/main/src/services/context/layerAssemblyService.ts`
  - `apps/desktop/main/src/ipc/context.ts`
  - `apps/desktop/main/src/ipc/ai.ts`
- Breaking change: NO
- User benefit: Rules 层可稳定注入 Always 实体，AI 生成遵循项目知识规则，且为后续 C12 复用实体格式化提供统一实现。
