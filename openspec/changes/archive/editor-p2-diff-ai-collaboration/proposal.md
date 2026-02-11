# 提案：editor-p2-diff-ai-collaboration

## 背景

编辑器基础就绪后，需要建立 AI 协作的核心交互链路：用户选中文本 → 引用到 AI 面板 → AI 返回修改 → Inline Diff 展示 → 用户逐块接受/拒绝。同时建立多版本 Diff 对比组件（DiffViewPanel / MultiVersionCompare），供版本控制模块复用。

## 变更内容

- 实现「选中内容自动引用到 AI 对话输入框」：
  - `captureSelectionRef()` 捕获选区文本 + 位置哈希，写入 `aiStore.selectionText/selectionRef`。
  - Reference card 组件：截断预览（max 120 chars）、关闭按钮、sticky 行为（选区折叠不自动消失）。
  - 四种清除条件：关闭按钮 / 发送请求 / 新建对话 / 新选区替换。
  - AI 请求发送时传递 `selectionText` + `selectionRef` 作为 context。
  - 冲突检测：`applySelection()` 时若原文已变返回 `CONFLICT`。
- 实现「AI 协作 Inline Diff」：
  - `DiffViewPanel` 组件：UnifiedDiffView / SplitDiffView 两种模式。
  - Diff 着色：删除 `--color-error-subtle` + 红色删除线，新增 `--color-success-subtle` + 绿色文字。
  - `DiffStats` 统计增删行数。
  - 逐块接受/拒绝（per hunk）+ 全部接受/拒绝。
  - Previous/Next 导航，当前 hunk 高亮 `--color-accent`。
  - `editorStore.compareMode` 状态管理。
- 实现「Diff 对比模式（多版本）」：
  - `MultiVersionCompare` 组件：2×2 网格布局，支持 2–4 版本同时对比。
  - 3 版本时末格跨两列。
  - 同步滚动（`syncScroll`）。
  - 版本标签与类型指示（`manual` | `auto` | `current`）。

## 受影响模块

- Editor（`renderer/src/features/editor/`、`renderer/src/features/diff/`、`renderer/src/stores/editorStore.tsx`）
- AI Store（`renderer/src/stores/aiStore.ts` — selectionText/selectionRef 字段）

## 依赖关系

- 上游依赖：
  - `editor-p0-tiptap-foundation-toolbar`（编辑器实例、editorStore）
  - AI Service（Phase 3，已归档）— AI 面板、流式响应、AI Store
- 下游依赖：
  - `version-control-p2-diff-rollback`（复用 DiffViewPanel / MultiVersionCompare 组件）
  - `editor-p4-a11y-hardening`

## 不做什么

- 不实现版本快照存储（→ version-control-p0）
- 不实现版本历史 UI（→ version-control-p0）
- 不实现版本回滚流程（→ version-control-p2）
- 不实现禅模式（→ editor-p3）

## 审阅状态

- Owner 审阅：`PENDING`
