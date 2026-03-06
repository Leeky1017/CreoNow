# Proposal: a0-12-inline-ai-baseline

## Why

`Cmd/Ctrl+K` 当前无绑定。Inline AI 是让用户"选中文本 → 输入指令 → 看到 diff → 决定是否应用"的核心创作快捷路径。

当前 AI 能力只通过右侧 AI 面板暴露，操作路径长（选中 → 打开面板 → 输入 → 等待 → 复制 → 粘贴）。Inline AI 要把这条路径缩短到 4 步以内。

这是 Phase 0 最大的单项任务，也是 v0.1 的关键 Magic Moment 基础。

## What Changes

- 注册 `Cmd/Ctrl+K` 快捷键
- 在编辑器中弹出轻量输入层（BubbleMenu 扩展或 floating input）
- 复用已有 skill 执行链路调用 AI
- 以 inline diff 方式预览 AI 修改结果
- 支持接受 / 拒绝 / 重新生成

## Scope

- `openspec/specs/editor/spec.md`
- `apps/desktop/renderer/src/config/shortcuts.ts`
- `apps/desktop/renderer/src/features/editor/EditorPane.tsx`
- AI store / skill 调用层
- 相关测试

## Non-Goals

- 不做 Inline AI 的高级模式（A1-01）
- 不做历史回看（A1-01）
- 不改 AI 面板现有功能
- 不在禅模式中开放 Inline AI
