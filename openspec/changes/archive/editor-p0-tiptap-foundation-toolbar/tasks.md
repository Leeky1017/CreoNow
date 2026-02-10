## 1. Specification

- [x] 1.1 审阅主 spec `editor/spec.md` 中「富文本编辑器基础排版」「编辑器工具栏」「编辑器键盘快捷键」「自动保存」「文档加载与持久化（IPC）」五个 Requirement 的全部 Scenario
- [x] 1.2 审阅粘贴内容处理的边界路径（unsupported formatting strip）
- [x] 1.3 审阅 autosave 状态机四态转换、suppressRef、unmount flush
- [x] 1.4 审阅 `file:document:*` 五个 IPC 通道的 request/response schema
- [x] 1.5 依赖同步检查（Dependency Sync Check）：上游 IPC（Phase 0）+ Document Management（Phase 1）；核对 IPC 通道定义、错误码、数据结构

## 2. TDD Mapping（先测前提）

- [x] 2.0 设定门禁：未出现 Red（失败测试）不得进入实现
- [x] 2.1 S-基础排版「User applies heading format via toolbar」→ `apps/desktop/renderer/src/features/editor/EditorToolbar.test.tsx`
- [x] 2.2 S-基础排版「User toggles bold via keyboard shortcut」→ `apps/desktop/renderer/src/features/editor/EditorToolbar.test.tsx`
- [x] 2.3 S-基础排版「Unsupported paste content graceful handling」→ `apps/desktop/renderer/src/features/editor/EditorPane.test.tsx`
- [x] 2.4 S-工具栏「Toolbar reflects active formatting state」→ `apps/desktop/renderer/src/features/editor/EditorToolbar.test.tsx`
- [x] 2.5 S-工具栏「Undo button disabled when no history」→ `apps/desktop/renderer/src/features/editor/EditorToolbar.test.tsx`
- [x] 2.6 S-快捷键「Platform-appropriate shortcut displayed in tooltip」→ `apps/desktop/renderer/src/features/editor/EditorToolbar.test.tsx`
- [x] 2.7 S-快捷键「Shortcut triggers correct action regardless of focus」→ `apps/desktop/renderer/src/features/editor/EditorPane.test.tsx`
- [x] 2.8 S-IPC「Bootstrap loads existing project with current document」→ `apps/desktop/renderer/src/stores/editorStore.test.ts`
- [x] 2.9 S-IPC「Bootstrap creates document when project is empty」→ `apps/desktop/renderer/src/stores/editorStore.test.ts`
- [x] 2.10 S-IPC「Bootstrap handles IPC failure」→ `apps/desktop/renderer/src/stores/editorStore.test.ts`
- [x] 2.11 S-自动保存「Content change triggers debounced autosave」→ `apps/desktop/renderer/src/features/editor/useAutosave.test.tsx`
- [x] 2.12 S-自动保存「Autosave failure with retry」→ `apps/desktop/renderer/src/stores/editorStore.test.ts`
- [x] 2.13 S-自动保存「Autosave suppressed during document load」→ `apps/desktop/renderer/src/features/editor/useAutosave.test.tsx`

## 3. Red（先写失败测试）

- [x] 3.1 编写基础排版 + 工具栏 Scenario 的失败测试
- [x] 3.2 编写键盘快捷键 Scenario 的失败测试
- [x] 3.3 编写 IPC 加载 / bootstrap Scenario 的失败测试
- [x] 3.4 编写自动保存状态机 Scenario 的失败测试
- [x] 3.5 记录 Red 失败输出与关键日志至 RUN_LOG

## 4. Green（最小实现通过）

- [x] 4.1 最小实现 TipTap 2 编辑器初始化 + StarterKit + Underline 扩展
- [x] 4.2 最小实现 EditorToolbar 组件（分组按钮、active/disabled 状态）
- [x] 4.3 最小实现键盘快捷键绑定与平台检测
- [x] 4.4 最小实现 editorStore 的 bootstrapForProject / openDocument 流程
- [x] 4.5 最小实现 autosave 状态机（debounce、suppressRef、unmount flush）
- [x] 4.6 最小实现粘贴内容清洗逻辑

## 5. Refactor（保持绿灯）

- [x] 5.1 抽象工具栏按钮为可复用 `ToolbarButton` 组件
- [x] 5.2 统一快捷键注册与 tooltip 生成逻辑
- [x] 5.3 全量回归保持绿灯

## 6. Evidence

- [x] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）
- [x] 6.2 记录 Dependency Sync Check 的输入、核对结论与后续动作
