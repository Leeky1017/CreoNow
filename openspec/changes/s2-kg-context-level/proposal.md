# 提案：s2-kg-context-level

## 背景

`docs/plans/unified-roadmap.md` 的 Sprint 2（AR-C8）定义了该 change：KG entity 需要新增 `aiContextLevel` 字段，并通过 migration、写入链路与编辑 UI 完成闭环。若缺失该字段，后续 `s2-fetcher-always` 与 `s2-fetcher-detected` 将无法按上下文级别进行实体注入。

## 变更内容

- 在 KG 实体模型中引入 `aiContextLevel` 字段，默认值与迁移策略对齐。
- 补齐 `entityCreate/entityUpdate` 对 `aiContextLevel` 的写入与更新路径。
- 在 KG 编辑 UI 增加 `aiContextLevel` 下拉选择，并补齐 CRUD/交互测试。

## 受影响模块

- Knowledge Graph：`apps/desktop/main/src/services/kg/`
- KG UI：`apps/desktop/renderer/src/features/kg/KnowledgeGraphPanel.tsx`
- 数据迁移：`apps/desktop/main/src/db/migrations/`

## 依赖关系

- 上游建议依赖：`s1-kg-service-extract`（roadmap 建议在其后执行）。
- 下游依赖：`s2-entity-matcher`、`s2-fetcher-always`、`s2-fetcher-detected`。
- 并行关系：可与 `s2-kg-aliases` 并行推进。

## 依赖同步检查（Dependency Sync Check）

- 核对输入：Sprint 2 依赖图（`s2-kg-context-level` → `s2-entity-matcher/s2-fetcher-always`）与 C8 条目范围。
- 核对项：字段名 `aiContextLevel`、默认值迁移语义、写路径与 UI 路径均在路线图范围内。
- 结论：`NO_DRIFT`（当前草案与路线图一致）。

## 踩坑提醒（防复发）

- migration 默认值与运行时默认值必须一致，避免读写漂移。
- UI 下拉值集合必须与后端可接受值保持同源，避免前后端枚举不一致。
- 未补齐 CRUD 与 UI 测试前不得进入 Green，避免 `FAKETEST`。

## 防治标签

- `FAKETEST`
- `DRIFT`

## 不做什么

- 不实现实体匹配逻辑（由 `s2-entity-matcher` 负责）。
- 不实现 fetcher 注入策略（由 `s2-fetcher-always`、`s2-fetcher-detected` 负责）。
- 不改动 Sprint 2 之外的 KG 行为契约。

## 审阅状态

- Owner 审阅：`PENDING`
