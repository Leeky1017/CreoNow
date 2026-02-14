# 提案：s2-write-button

## 背景

`docs/plans/unified-roadmap.md` 将 `s2-write-button` 定义为 Sprint 2 Phase 3 交互项（AR-C16）：在编辑器侧提供续写悬浮按钮组并打通写作技能调用。若缺少该入口，写作技能只能通过间接路径触发，编辑流中断明显，且后续快捷键与命令入口难以复用统一调用链。

## 变更内容

- 新增编辑器续写悬浮按钮组组件，覆盖可见性、状态切换与调用行为。
- 将按钮动作绑定到写作技能调用入口（依赖 `s2-writing-skills` 的技能清单）。
- 增加组件交互测试与 Storybook 场景，确保 UI 与调用契约可回归。

## 受影响模块

- Editor（`apps/desktop/renderer/src/features/editor/WriteButton.tsx`）— 悬浮按钮组 UI 与交互。
- Editor 测试（`apps/desktop/renderer/src/features/editor/WriteButton.test.tsx`）— 行为与调用断言。
- Editor Storybook（`apps/desktop/renderer/src/features/editor/WriteButton.stories.tsx`）— 可视化验收场景。

## 依赖关系

- 上游依赖：`s2-writing-skills`（C14，提供写作技能清单与标识约定）。
- 横向协同：与 `s2-bubble-ai` 共享编辑器技能调用通路，需统一交互语义。
- 下游依赖：`s2-shortcuts` 依赖本 change 与 `s2-bubble-ai` 的入口契约稳定。
- 执行建议：按 roadmap 在 `s1-break-panel-cycle` 之后推进，降低面板耦合冲突。

## 依赖同步检查（Dependency Sync Check）

- 核对输入：
  - `docs/plans/unified-roadmap.md` 中 AR-C16 定义及依赖图（依赖 C14）；
  - `openspec/specs/editor/spec.md` 中浮动交互与按钮行为约束；
  - `openspec/specs/skill-system/spec.md` 中技能调用输入输出契约。
- 核对项：
  - 入口仅负责 UI 触发与调用绑定，不改动技能执行引擎；
  - 按钮调用目标与 C14 技能标识一致；
  - 组件拆分深度受控，避免过度抽象造成 `OVERABS`。
- 结论：`NO_DRIFT`（与 Sprint 2 AR-C16 定义一致；进入 Red 前需复核 C14 实际产出）。

## 踩坑提醒（防复发）

- 若写作技能 ID 与按钮绑定常量未统一，容易出现“UI 可点但调用空技能”的假通过。
- 为复用过早抽象通用 Action Factory，常导致小改动跨多文件扩散（`OVERABS` 风险）。
- 仅断言按钮渲染不校验调用参数会触发 `FAKETEST`。

## 防治标签

- `FAKETEST` `DRIFT` `OVERABS`

## 不做什么

- 不实现 Bubble Menu AI 子菜单（由 `s2-bubble-ai` 负责）。
- 不改动技能执行器、IPC 协议或上下文引擎注入规则。
- 不实现快捷键入口与 Slash 命令入口。

## 审阅状态

- Owner 审阅：`PENDING`
