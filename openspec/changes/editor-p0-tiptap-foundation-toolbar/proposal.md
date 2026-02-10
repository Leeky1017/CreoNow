# 提案：editor-p0-tiptap-foundation-toolbar

## 背景

Editor 是 CreoNow 的核心交互模块。本 change 建立编辑器的基础层：TipTap 2 富文本引擎集成、格式化工具栏、键盘快捷键体系、文档 IPC 加载/持久化和自动保存状态机。后续所有编辑器高级功能（Bubble Menu、大纲、AI Diff、禅模式等）均依赖本 change。

## 变更内容

- 集成 TipTap 2（`@tiptap/starter-kit` + `@tiptap/extension-underline`），实现 Inline marks（Bold/Italic/Underline/Strikethrough/Inline Code）和 Block nodes（H1–H3/Bullet List/Ordered List/Blockquote/Code Block/Horizontal Rule/Undo/Redo）。
- 实现 `EditorToolbar` 组件：分组按钮（Text formatting / Headings / Lists / Blocks / History），active 状态反映光标位置，disabled 状态（如无历史时 Undo 禁用），`aria-label` + tooltip + 快捷键提示。
- 实现编辑器键盘快捷键体系（Cmd/Ctrl+B/I/S/Z 等，F11 禅模式入口占位），平台自适应提示。
- 实现文档 IPC 加载与持久化：`editorStore` 的 `bootstrapForProject` → `openDocument` 流程，调用 `file:document:getCurrent/list/create/read/save` 五个 IPC 通道。
- 实现自动保存状态机：`idle → saving → saved | error`，500ms debounce，`suppressRef` 防加载时误触发，unmount flush，手动保存 `actor:"user"`。
- 处理不支持格式的粘贴内容（strip unsupported formatting，保留支持的格式）。

## 受影响模块

- Editor（`renderer/src/features/editor/`、`renderer/src/stores/editorStore.tsx`）
- IPC（复用已有 `file:document:*` 通道定义）

## 依赖关系

- 上游依赖：
  - IPC（Phase 0，已归档）
  - Document Management（Phase 1，已归档）— 提供 `file:document:*` IPC 通道实现
- 下游依赖：editor-p1 ~ p4、version-control-p0（版本快照触发依赖保存事件）

## 不做什么

- 不实现 Bubble Menu（→ editor-p1）
- 不实现大纲视图（→ editor-p1）
- 不实现 AI Inline Diff / 选中引用 / 多版本 Diff（→ editor-p2）
- 不实现禅模式（→ editor-p3）
- 不实现无障碍性硬化（→ editor-p4）

## 审阅状态

- Owner 审阅：`PENDING`
