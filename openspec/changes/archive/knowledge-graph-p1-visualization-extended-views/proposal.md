# 提案：knowledge-graph-p1-visualization-extended-views

## 背景

Knowledge Graph 主 spec 的可视化关系图、时间线与角色卡属于上层交互能力，依赖 KG-1 已稳定提供实体/关系 CRUD 与查询结果。
若在数据层未稳定前推进渲染层，会导致图渲染、面板入口与扩展视图的契约反复变动，增加返工成本。

## 变更内容

- 仅覆盖 KG 主 spec 的 2 个 requirement：
  - 可视化关系图
  - 扩展视图（时间线 + 角色卡）
- 依赖约束：`knowledge-graph-p0-entity-relation-query` 合并后再进入实现。
- 在 delta spec 固化关系图技术选型：`d3-force`（布局）+ `d3-zoom`（缩放/平移）。
- 对齐 `DESIGN_DECISIONS.md`：节点色 `--color-node-*`、边 `--color-fg-subtle`、背景 `--color-bg-base`。
- 定义时间线横轴为虚拟时间（章节）并支持拖拽调整顺序。
- 定义角色卡结构与 Storybook 覆盖：完整、部分填写、空态。
- 明确 Icon Bar 入口：关系图在 `graph`，角色卡在 `character`。

## 受影响模块

- `openspec/changes/knowledge-graph-p1-visualization-extended-views/**`
- `apps/desktop/renderer/src/features/kg/**`
- `apps/desktop/renderer/src/features/character/**`
- `apps/desktop/renderer/src/stores/kgStore.ts`
- `apps/desktop/renderer/src/layout/**`（Icon Bar 入口绑定）

## 不做什么

- 不实现自动识别建议流程（在 KG-3）。
- 不实现 AI 续写中的知识图谱注入（在 KG-3）。
- 不做查询性能优化与数据层重构（由 KG-1 保障）。

## 审阅状态

- Owner 审阅：`APPROVED`
