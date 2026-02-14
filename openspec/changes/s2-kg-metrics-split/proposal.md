# 提案：s2-kg-metrics-split

## 背景

`docs/plans/unified-roadmap.md` 将 `s2-kg-metrics-split` 定义为 Sprint 2 债务修复项（A3-H-002）。当前 KG 识别运行时指标在失败路径与完成路径的计数语义存在耦合，导致失败任务统计与完成统计混淆，影响质量回归判断与故障定位。

## 变更内容

- 在 KG 识别运行时指标中明确拆分 `succeeded`、`failed`、`completed` 三类计数语义。
- 明确失败任务进入 `failed`，且不增加 `completed`；成功任务同时增加 `succeeded` 与 `completed`。
- 补齐与计数语义对应的失败路径断言，防止回归。

## 受影响模块

- Knowledge Graph（Main Runtime）— `apps/desktop/main/src/services/kg/kgRecognitionRuntime.ts`
- Knowledge Graph Tests — `apps/desktop/main/src/services/kg/__tests__/`

## 依赖关系

- 上游依赖：无（Sprint 2 债务组默认独立并行）。
- 横向协同：无阻塞依赖，允许并行交付。

## 依赖同步检查（Dependency Sync Check）

- 核对输入：
  - `docs/plans/unified-roadmap.md` 中 `s2-kg-metrics-split` 条目；
  - `openspec/specs/knowledge-graph/spec.md` 的可观测性与降级约束。
- 核对项：
  - 成功与失败路径计数语义互斥；
  - 失败不计入 `completed` 的约束可通过测试验证；
  - 不引入额外业务行为变更（仅指标语义收敛）。
- 结论：`NO_DRIFT`。

## 踩坑提醒（防复发）

- 避免在 `finally` 中无条件增加 `completed`；必须根据执行结果分支计数。

## 防治标签

- `SILENT` `FAKETEST`

## 不做什么

- 不改实体识别算法与匹配阈值。
- 不新增 IPC 通道或 UI 呈现逻辑。
- 不修改主 spec 正文（仅起草 change 三件套）。

## 审阅状态

- Owner 审阅：`PENDING`
