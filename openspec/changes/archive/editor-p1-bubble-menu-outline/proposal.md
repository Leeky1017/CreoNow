# 提案：editor-p1-bubble-menu-outline

## 背景

基础编辑器（editor-p0）就绪后，需要补齐两个高频交互功能：选中文本浮动工具栏（Bubble Menu）和文档大纲视图（Outline View）。Bubble Menu 提供就近格式化入口，大纲视图提供文档结构导航与重组能力。

## 变更内容

- 集成 `@tiptap/extension-bubble-menu`，实现浮动工具栏：
  - 可见性规则：非空选区时出现，折叠选区/Code Block 内/只读模式时隐藏。
  - 定位：默认在选区上方，空间不足时自动翻转到下方。
  - 操作集：Bold、Italic、Underline、Strikethrough、Inline Code、Link（仅 inline marks，不含 block 操作）。
  - 与固定工具栏双向同步 active 状态。
- 实现 `OutlinePanel` 组件：
  - `deriveOutline()` 从 TipTap JSON 提取 H1–H3 生成 `OutlineItem[]`（忽略 H4–H6，空标题显示 "(untitled heading)"）。
  - 分级缩进显示（H1/H2/H3），当前光标所在标题高亮。
  - 点击导航滚动到对应标题位置。
  - 展开/折叠、搜索过滤、拖拽重排、多选、键盘导航、行内重命名。
- 编写 Storybook Stories：Bubble Menu（visible/active/hidden）、OutlinePanel（default/empty/search/drag-and-drop/multi-select）。

## 受影响模块

- Editor（`renderer/src/features/editor/`、`renderer/src/features/outline/`）

## 依赖关系

- 上游依赖：
  - `editor-p0-tiptap-foundation-toolbar`（TipTap 编辑器实例、工具栏 active 状态 hook）
- 下游依赖：无直接下游（editor-p2+ 不强依赖本 change）

## 不做什么

- 不实现 AI 相关交互（Inline Diff / 选中引用 → editor-p2）
- 不实现大纲与版本对比联动（→ version-control）
- 不实现 Link 编辑弹窗（仅 toggle link mark）

## 审阅状态

- Owner 审阅：`PENDING`
