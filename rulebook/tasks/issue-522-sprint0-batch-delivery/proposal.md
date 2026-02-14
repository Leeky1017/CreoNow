# Proposal: issue-522-sprint0-batch-delivery

## Why

Sprint0 的 8 个 OpenSpec change 文档已经在本地生成，但尚未进入受治理的交付闭环。若继续停留在本地未合并状态，会导致执行顺序、依赖关系与后续实现入口不一致，且无法作为团队共享的规范基线。

## What Changes

- 交付并提交 `openspec/changes/s0-*` 共 8 个 active changes 的 proposal/tasks/spec 文档包。
- 更新 `openspec/changes/EXECUTION_ORDER.md`，声明 Sprint0 的并行/串行拓扑与依赖关系。
- 建立并完善本任务的 RUN_LOG、Rulebook task 与主会话审计证据，完成单 PR 合并收口。

## Impact

- Affected specs:
  - `openspec/changes/s0-fake-queued-fix/*`
  - `openspec/changes/s0-window-load-catch/*`
  - `openspec/changes/s0-app-ready-catch/*`
  - `openspec/changes/s0-metadata-failfast/*`
  - `openspec/changes/s0-skill-loader-error/*`
  - `openspec/changes/s0-sandbox-enable/*`
  - `openspec/changes/s0-kg-async-validate/*`
  - `openspec/changes/s0-context-observe/*`
  - `openspec/changes/EXECUTION_ORDER.md`
- Affected code: 无（仅文档与治理交付工件）
- Breaking change: NO
- User benefit: Sprint0 全部 change 可一次性进入受治理主干，后续实现团队可直接按统一文档执行。
