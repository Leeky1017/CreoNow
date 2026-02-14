# 提案：s2-fetcher-always

## 背景

`docs/plans/unified-roadmap.md` 的 Sprint 2（AR-C11）定义了该 change：rules fetcher 需要查询 `aiContextLevel="always"` 实体并格式化注入。该能力决定了核心设定是否稳定进入 Rules 层；若缺失会导致规则层与 KG 数据脱节。

## 变更内容

- 在 `rulesFetcher` 中增加 `entityList({ filter: { aiContextLevel: "always" } })` 查询。
- 将查询结果格式化为 context chunks 注入 Rules 层。
- 增加“有 always 实体/无 always 实体”两类 Red 测试并转绿。

## 受影响模块

- Context Engine：`apps/desktop/main/src/services/context/fetchers/rulesFetcher.ts`
- Context 测试：`apps/desktop/main/src/services/context/__tests__/rulesFetcher.test.ts`

## 依赖关系

- 上游依赖：`s2-kg-context-level`（提供 `aiContextLevel` 字段与筛选能力）。
- 上游建议依赖：`s1-break-context-cycle`（roadmap 建议在其后执行）。
- 下游依赖：`s2-fetcher-detected`（依赖同批 fetcher 能力协同）。

## 依赖同步检查（Dependency Sync Check）

- 核对输入：Phase 2 依赖图（C11 依赖 C8）与 C11 条目范围。
- 核对项：筛选条件固定为 `aiContextLevel="always"`，输出目标为格式化注入 chunks。
- 结论：`NO_DRIFT`（当前草案与路线图一致）。

## 踩坑提醒（防复发）

- 必须覆盖“无 always 实体”场景，防止伪通过（`FAKETEST`）。
- 降级路径需输出可追踪告警标识，防止静默失败（`SILENT`）。
- 格式化输出结构应稳定，避免与下游消费约定漂移。

## 防治标签

- `FAKETEST`
- `SILENT`

## 不做什么

- 不实现 when-detected 注入（由 `s2-fetcher-detected` 负责）。
- 不改动 matcher 能力与性能阈值（由 `s2-entity-matcher` 负责）。
- 不扩展 Sprint 2 之外的 Context Engine 行为。

## 审阅状态

- Owner 审阅：`PENDING`
