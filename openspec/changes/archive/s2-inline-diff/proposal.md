# 提案：s2-inline-diff

## 背景

`docs/plans/unified-roadmap.md` 在 Sprint 2 Phase 3 将 `s2-inline-diff`（AR-C20）定义为编辑器 AI 协作可视化能力：Inline diff decoration 与接受/拒绝按钮。
当前目标是把“AI 输出预览、局部确认、应用结果”变成可验证行为，避免用户在未确认前被直接覆盖正文。

## 变更内容

- 新增 inline diff decoration 契约，表达新增与删除片段。
- 新增接受/拒绝控制按钮契约，支持对可见差异进行确认或放弃。
- 约束应用流程：仅在用户确认后写回编辑器。

## 受影响模块

- Editor（`apps/desktop/renderer/src/features/editor/`）— Inline diff 扩展、控制组件与编辑器应用链路。
- AI 协作流（Editor 内部）— AI 输出到编辑区应用前的中间确认层。

## 依赖关系

- 上游依赖：无。Phase 3 依赖图中 `s2-inline-diff` 标记为独立项。
- 并行关系：可与 `s2-slash-commands` 并行（同属 Wave 4）。

## 依赖同步检查（Dependency Sync Check）

- 核对输入：
  - `docs/plans/unified-roadmap.md` Sprint 2 `s2-inline-diff` 条目；
  - `docs/plans/unified-roadmap.md` Phase 3 依赖图（`s2-inline-diff` 独立）。
- 核对项：
  - Scope 仅限 diff decoration 与接受/拒绝按钮，不扩展版本管理语义；
  - 行为目标聚焦“AI 输出可视差异 + 用户确认后应用”；
  - 不引入路线图未声明的上游依赖。
- 结论：`NO_DRIFT`（与路线图一致，可进入 TDD）。

## 踩坑提醒（防复发）

- diff 视图常见伪绿是只校验渲染快照，需补“接受后应用/拒绝后不应用”的行为断言。
- 接受与拒绝按钮必须绑定同一份差异数据，避免 UI 与实际应用目标错位。
- 错误路径不能静默吞掉（`SILENT` 风险），至少应保留失败可见信号。

## 防治标签

`FAKETEST` `DRIFT` `SILENT`

## 不做什么

- 不在本 change 内实现多版本历史管理、版本回滚或持久化策略。
- 不改动 Slash 命令体系与快捷键分发。
- 不引入路线图之外的 AI 应用策略变更。

## 审阅状态

- Owner 审阅：`PENDING`
