# 提案：knowledge-graph-p0-entity-relation-query

## 背景

Knowledge Graph 主 spec 中的实体管理、关系管理与查询契约是后续可视化面板与自动识别能力的基础。
若不先固化数据模型（SQLite schema + IPC 命名 + Zod 校验）与查询边界（k-hop、最短路径、循环检测、超时降级），后续 P1/P2 会出现实现口径不一致、跨进程契约漂移与性能不可控风险。

## 变更内容

- 仅覆盖 KG 主 spec 的 3 个 requirement：
  - 实体管理
  - 关系管理
  - 查询契约、循环关系检测与降级检索
- 固化 KG-1 数据层基线：SQLite schema、索引、容量限制与版本冲突字段。
- 固化 IPC 通道命名与 Zod schema：`knowledge:entity:*`、`knowledge:relation:*`、`knowledge:query:*`。
- 明确 5 种实体类型与节点颜色 Token：`character/location/event/item/faction`。
- 明确 8 种预置关系类型与自定义关系类型扩展机制。
- 明确查询边界：`knowledge:query:subgraph`（`k<=3`）、`knowledge:query:path`（最大扩展 10,000 节点）、`knowledge:query:validate`（返回 `cycles` 且不中断查询）。
- 纳入实体详情页 Storybook 3 态（默认、空、错误）作为 P0 UI 契约。
- 纳入 KG-1 范围跨切场景：数据异常、并发冲突、容量溢出。

## 受影响模块

- `openspec/changes/knowledge-graph-p0-entity-relation-query/**`
- `apps/desktop/main/src/services/kg/**`
- `apps/desktop/main/src/ipc/knowledgeGraph.ts`
- `apps/desktop/renderer/src/features/kg/**`
- `apps/desktop/renderer/src/stores/kgStore.ts`
- `packages/shared/**`（IPC 类型、错误码）

## 不做什么

- 不实现可视化关系图渲染（Force-directed UI 在 KG-2）。
- 不实现时间线与角色卡扩展视图（在 KG-2）。
- 不实现自动识别建议与 AI 续写注入（在 KG-3）。
- 不接入真实 LLM 调用。

## 审阅状态

- Owner 审阅：`PENDING`
