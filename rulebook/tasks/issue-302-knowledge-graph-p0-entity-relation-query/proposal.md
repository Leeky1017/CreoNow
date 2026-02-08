# Proposal: issue-302-knowledge-graph-p0-entity-relation-query

## Why

`knowledge-graph-p0-entity-relation-query` 已完成 change 文档与 Owner 审批，但尚未进入实现。若不按 Spec-first + TDD 落地实体/关系/查询基线，将阻断 KG P1/P2 串行能力并造成 IPC 契约与数据层行为漂移。

## What Changes

- 依据 `openspec/changes/knowledge-graph-p0-entity-relation-query/tasks.md` 执行全量任务：
  - 实体管理：类型约束、属性上限、并发版本冲突、级联删除
  - 关系管理：预置关系、自定义关系类型复用、删除与校验
  - 查询契约：`knowledge:query:subgraph/path/validate`、循环检测、超时降级
- 将 IPC 命名从 `kg:*` 收敛到 `knowledge:*`，并同步契约类型生成
- 补齐 Scenario 对应测试（unit/integration/perf）与 Red/Green 证据链
- 增补实体详情页 Storybook 3 态（default/empty/error）
- 落盘 RUN_LOG、preflight 证据、PR auto-merge 与 main 收口证据

## Impact

- Affected specs:
  - `openspec/changes/knowledge-graph-p0-entity-relation-query/**`
  - `rulebook/tasks/issue-302-knowledge-graph-p0-entity-relation-query/**`
- Affected code:
  - `apps/desktop/main/src/services/kg/**`
  - `apps/desktop/main/src/ipc/knowledgeGraph.ts`
  - `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `apps/desktop/main/src/db/{init.ts,migrations/*}`
  - `apps/desktop/renderer/src/features/kg/**`
  - `apps/desktop/renderer/src/stores/kgStore.ts`
  - `packages/shared/types/ipc-generated.ts`
  - `apps/desktop/tests/{unit,integration,perf,e2e}/**`
- Breaking change: YES（KG IPC channel 从 `kg:*` 迁移到 `knowledge:*`）
- User benefit: KG P0 基线可测可验收，可支撑后续 KG P1/P2 串行交付
