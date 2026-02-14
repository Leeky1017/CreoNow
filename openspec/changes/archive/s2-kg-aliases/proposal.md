# 提案：s2-kg-aliases

## 背景

`docs/plans/unified-roadmap.md` 的 Sprint 2（AR-C9）定义了该 change：KG entity 需要新增/确认 `aliases: string[]` 字段，并补齐写路径、编辑 UI 与边界测试。若别名链路不完整，`s2-entity-matcher` 的“名字+别名”匹配将缺少稳定输入。

## 变更内容

- 在 KG 实体写入链路中确保 `aliases` 可创建、更新和读取。
- 在 KG 编辑 UI 增加 aliases 的 tag 编辑能力。
- 增加空 alias、超长 alias、重复 alias 的边界测试。

## 受影响模块

- Knowledge Graph：`apps/desktop/main/src/services/kg/`
- KG UI：`apps/desktop/renderer/src/features/kg/KnowledgeGraphPanel.tsx`
- KG 测试：`apps/desktop/main/src/services/kg/__tests__/`

## 依赖关系

- 上游建议依赖：`s1-kg-service-extract`（roadmap 建议在其后执行）。
- 下游依赖：`s2-entity-matcher`。
- 并行关系：可与 `s2-kg-context-level` 并行推进。

## 依赖同步检查（Dependency Sync Check）

- 核对输入：Sprint 2 C9 条目与 Phase 2 依赖图（`s2-kg-aliases` → `s2-entity-matcher`）。
- 核对项：字段名、编辑入口与边界测试范围和路线图一致。
- 结论：`NO_DRIFT`（当前草案与路线图一致）。

## 踩坑提醒（防复发）

- alias 输入标准化策略必须在读写两侧一致，避免展示值与存储值漂移。
- 重复 alias 的处理结果必须可预测并通过测试固定，避免行为漂移。
- 边界测试不完整会导致 `FAKETEST`，必须先 Red 再 Green。

## 防治标签

- `FAKETEST`
- `DRIFT`

## 不做什么

- 不实现实体匹配算法（由 `s2-entity-matcher` 负责）。
- 不扩展 `aiContextLevel` 行为（由 `s2-kg-context-level` 负责）。
- 不改动 Sprint 2 之外的 KG 业务范围。

## 审阅状态

- Owner 审阅：`PENDING`
