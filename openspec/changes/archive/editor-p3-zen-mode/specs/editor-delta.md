# Editor Specification Delta

## Change: editor-p3-zen-mode

### Requirement: 禅模式（Zen Mode）[ADDED]

系统必须提供应用内全屏的无干扰写作模式。

- 隐藏所有 UI：侧边栏、右面板、工具栏、状态栏。
- 写作区域居中 max-width 720px，padding 120px/80px。
- 背景 `#050505` + 径向渐变微光。
- 文档标题 48px `--font-family-body`，正文 18px / line-height 1.8。
- 末段闪烁光标（`showCursor` 启用时）。
- 禅模式下禁用 AI 辅助。
- F11 进入，Escape / F11 退出。
- 右上角常驻淡色提示 "Press Esc or F11 to exit"；顶部 hover 显示关闭按钮。
- 底部 hover 状态栏：字数、保存状态、阅读时间（分钟）、当前时间。

#### Scenario: User enters and exits Zen Mode [ADDED]

- **假设** 用户在正常模式编辑文档
- **当** 用户按 F11
- **则** 全屏覆盖层渲染于 `z-index: var(--z-modal)`
- **并且** 仅文档标题和正文可见，居中显示
- **并且** 按 Escape 关闭覆盖层回到正常模式

#### Scenario: Zen Mode hides all distractions [ADDED]

- **假设** 禅模式已激活
- **当** 用户查看界面
- **则** 侧边栏、右面板（AI/Info）、编辑器工具栏、主状态栏不可见
- **并且** hover 底部边缘显示字数、保存状态、阅读时间
- **并且** hover 顶部边缘显示退出按钮

#### Scenario: Zen Mode with empty document [ADDED]

- **假设** 当前文档无内容
- **当** 用户进入禅模式
- **则** 显示标题（或占位符）
- **并且** 正文区域为空，带闪烁光标
- **并且** 字数显示 0

## Out of Scope

- OS 级全屏（仅应用内全屏覆盖层）
- 禅模式下的 AI 交互
- 禅模式专属快捷键（仅复用 F11/Escape）
