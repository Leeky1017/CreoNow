# 提案：s2-bubble-ai

## 背景

`docs/plans/unified-roadmap.md` 将 `s2-bubble-ai` 定义为 Sprint 2 Phase 3 交互项（AR-C17）：在 Bubble Menu 中提供 AI 按钮（润色/改写/描写/对白）并连接技能调用。若缺失该入口，选中文本的 AI 操作需要绕行面板流程，编辑操作链路不连续，且与 `s2-write-button` 无法形成统一入口矩阵。

## 变更内容

- 新增 Bubble Menu AI 子菜单组件，承载选中文本场景下的技能入口。
- 将子菜单按钮与对应技能调用绑定，并保持与编辑器选区状态联动。
- 增加组件测试与 Storybook 场景，覆盖显示、点击调用与状态回收。

## 受影响模块

- Editor（`apps/desktop/renderer/src/features/editor/BubbleAiMenu.tsx`）— Bubble Menu AI 入口 UI。
- Editor 测试（`apps/desktop/renderer/src/features/editor/BubbleAiMenu.test.tsx`）— 选区交互与调用断言。
- Editor Storybook（`apps/desktop/renderer/src/features/editor/BubbleAiMenu.stories.tsx`）— 可视化验收场景。

## 依赖关系

- 上游依赖：`s2-writing-skills`（C14，提供写作技能标识与文档约束）。
- 横向协同：与 `s2-write-button` 共用编辑器技能调用通路，需统一参数结构。
- 下游依赖：`s2-shortcuts` 依赖本 change 与 `s2-write-button` 的入口能力完成。
- 执行建议：按 roadmap 在 `s1-break-panel-cycle` 后推进，以减少 UI 层耦合冲突。

## 依赖同步检查（Dependency Sync Check）

- 核对输入：
  - `docs/plans/unified-roadmap.md` 中 AR-C17 定义及依赖图（依赖 C14）；
  - `openspec/specs/editor/spec.md` 中 Bubble Menu 可见性与交互约束；
  - `openspec/specs/skill-system/spec.md` 中技能调用契约。
- 核对项：
  - 仅扩展 Bubble Menu 入口，不改变 Editor 基础格式化行为；
  - 子菜单技能标识与 C14 产物一致；
  - 控制组件抽象层级，避免为少量按钮引入过度抽象。
- 结论：`NO_DRIFT`（与 Sprint 2 AR-C17 定义一致；进入 Red 前需复核 C14 实际产出）。

## 踩坑提醒（防复发）

- Bubble Menu 显示条件与选区状态绑定较强，若测试未覆盖折叠选区会出现假绿。
- 菜单项技能 ID 若与文档约定不一致，会出现“按钮文案正确但调用目标错误”。
- 提前抽象跨入口共享层可能导致 `OVERABS`，应先保证最小可用闭环。

## 防治标签

- `FAKETEST` `DRIFT` `OVERABS`

## 不做什么

- 不实现续写悬浮按钮（由 `s2-write-button` 负责）。
- 不调整 Bubble Menu 基础格式化按钮集合与定位策略。
- 不修改技能执行器、IPC 通道与上下文组装策略。

## 审阅状态

- Owner 审阅：`PENDING`
