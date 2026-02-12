# 提案：editor-p3-zen-mode

## 背景

禅模式是 CreoNow 的沉浸式写作体验核心功能，隐藏所有 UI 干扰，仅保留文档标题与正文。该功能相对独立，不依赖 AI 或 Diff 组件，但依赖基础编辑器实例（editor-p0）。

## 变更内容

- 实现 `ZenMode` 全屏覆盖层组件：
  - 入口/出口：F11 进入，Escape / F11 退出。
  - 覆盖层 `z-index: var(--z-modal)`，背景 `#050505` + 径向渐变微光。
  - 写作区域居中，max-width 720px，padding 120px/80px。
  - 文档标题 48px `--font-family-body`，正文 18px / line-height 1.8。
  - 末段闪烁光标（`showCursor` 启用时）。
  - 禅模式下禁用 AI 辅助。
- 实现退出提示：
  - 右上角常驻淡色提示 "Press Esc or F11 to exit"。
  - 顶部 hover 区域显示关闭按钮。
- 实现底部 hover 状态栏：字数、保存状态、阅读时间（分钟）、当前时间。
- 处理空文档边界：无内容时显示占位标题 + 闪烁光标 + 字数 0。

## 受影响模块

- Editor（`renderer/src/features/zen-mode/`、`renderer/src/stores/editorStore.tsx`）

## 依赖关系

- 上游依赖：
  - `editor-p0-tiptap-foundation-toolbar`（编辑器实例、editorStore、autosave 状态）
- 下游依赖：`editor-p4-a11y-hardening`

## 不做什么

- 不实现 OS 级全屏（仅应用内全屏覆盖层）
- 不实现禅模式下的 AI 交互
- 不实现禅模式专属快捷键（仅复用 F11/Escape）

## 审阅状态

- Owner 审阅：`PENDING`
