# 提案：s2-slash-framework

## 背景

`docs/plans/unified-roadmap.md` 在 Sprint 2 Phase 3 将 `s2-slash-framework`（AR-C18）定义为编辑器命令入口基建项：提供 TipTap Slash Command 扩展框架与命令面板 UI。
当前路线图要求后续 `s2-slash-commands` 依赖该框架承载命令注册与触发，因此需要先把 `/` 触发、面板展示与交互骨架明确为可测试契约。

## 变更内容

- 新增 Slash Command TipTap 扩展骨架：监听编辑态输入 `/` 并驱动命令面板显隐。
- 新增命令面板 UI 契约：包含搜索输入与候选列表两部分结构。
- 约束扩展与面板集成行为：触发、过滤、关闭三个关键交互具备可验证场景。

## 受影响模块

- Editor（`apps/desktop/renderer/src/features/editor/`）— Slash Command 扩展层与命令面板 UI 契约。
- Workbench（Editor Surface）— 编辑区输入事件到命令面板渲染链路。

## 依赖关系

- 上游依赖：无。路线图依赖图标记 `s2-slash-framework` 为 Phase 3 内可独立推进项。
- 下游依赖：`s2-slash-commands` 明确依赖本 change（依赖 C18）。

## 依赖同步检查（Dependency Sync Check）

- 核对输入：
  - `docs/plans/unified-roadmap.md` Sprint 2 Phase 3 change 列表（`s2-slash-framework` 条目）；
  - `docs/plans/unified-roadmap.md` Phase 3 内部依赖图（`s2-slash-framework -> s2-slash-commands`）。
- 核对项：
  - Scope 仅覆盖“扩展框架 + 面板 UI”，不提前落地具体写作命令语义；
  - 保持后续命令注册接口可接入，不与 `s2-slash-commands` 职责重叠；
  - 不引入与路线图冲突的新上游依赖。
- 结论：`NO_DRIFT`（与 Sprint 2 路线图定义一致，可进入 TDD）。

## 踩坑提醒（防复发）

- `/` 触发逻辑与普通文本输入共享事件流，测试必须覆盖“触发后面板出现”而非仅断言函数被调用。
- 面板搜索与列表展示属于框架契约的一部分，避免仅做空壳容器导致后续命令接入返工。
- 不要在本 change 内写入具体命令清单，防止与 `s2-slash-commands` 重复实现。

## 防治标签

`FAKETEST` `DRIFT` `OVERABS`

## 不做什么

- 不实现具体写作命令（`/续写`、`/描写` 等注册与执行由 `s2-slash-commands` 负责）。
- 不改动 AI 技能调度、上下文注入或 KG 检索逻辑。
- 不扩展到快捷键系统与 inline diff 相关能力。

## 审阅状态

- Owner 审阅：`PENDING`
