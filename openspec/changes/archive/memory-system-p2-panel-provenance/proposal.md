# 提案：memory-system-p2-panel-provenance

## 背景

MS-2 已定义语义记忆 CRUD、蒸馏、衰减与冲突处理，仍缺少用户可见且可控的交互入口。
记忆面板和溯源能力是用户理解与纠偏 Memory System 的唯一通道，未落地将导致学习过程不可解释、不可校正。

本 change 依赖 `memory-system-p1-distillation-decay-conflict`，必须在 MS-2 合入后进入实现。

## 变更内容

- 定义 Memory Panel 信息架构与交互契约（左侧栏入口）。
- 覆盖 5 种关键操作：确认、修改、删除、手动添加、暂停学习。
- 规定空状态呈现与冲突通知呈现。
- 定义记忆溯源数据结构 `GenerationTrace` 与 AI 面板展示契约。
- 定义溯源反馈回路：用户可标记「判断有误」。
- 要求 Storybook 覆盖 4 态：默认、空、暂停学习、冲突通知。
- 约束设计 token：`--color-bg-surface`、`--color-bg-raised`、`--radius-sm`、`--color-warning`。

## 受影响模块

- Memory System spec delta：`openspec/changes/memory-system-p2-panel-provenance/specs/memory-system-delta.md`
- Renderer（后续实现阶段）：`apps/desktop/renderer/src/features/memory/`
- AI 面板（后续实现阶段）：`apps/desktop/renderer/src/features/ai/`
- IPC（后续实现阶段）：`apps/desktop/main/src/ipc/memory.ts`

## 不做什么

- 不实现蒸馏后台流程与衰减公式细节。
- 不实现作用域清除逻辑与降级分档。
- 不实现跨模块注入链路改造（仅定义面板/溯源契约）。

## 审阅状态

- Owner 审阅：`APPROVED`（Issue #320 实施前已完成依赖同步检查并进入 TDD）
