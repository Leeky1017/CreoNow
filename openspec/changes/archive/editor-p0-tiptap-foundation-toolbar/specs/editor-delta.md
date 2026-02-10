# Editor Specification Delta

## Change: editor-p0-tiptap-foundation-toolbar

### Requirement: 富文本编辑器基础排版 [ADDED]

系统必须基于 TipTap 2 提供所见即所得的富文本编辑器，底层存储格式为 TipTap JSON。

- 必须支持 Inline marks：Bold、Italic、Underline、Strikethrough、Inline Code。
- 必须支持 Block nodes：H1–H3、Bullet List、Ordered List、Blockquote、Code Block、Horizontal Rule。
- 必须支持 Undo / Redo。
- 使用 `@tiptap/starter-kit` + `@tiptap/extension-underline`。
- 正文使用 `--font-family-body`、`--text-editor-size`（16px）、`--text-editor-line-height`（1.8）。

#### Scenario: User applies heading format via toolbar [ADDED]

- **假设** 光标位于一段文本内
- **当** 用户点击 H1 工具栏按钮
- **则** 段落转为 H1 标题节点
- **并且** H1 按钮进入 active 状态（`bg-[var(--color-bg-selected)]`）

#### Scenario: User toggles bold via keyboard shortcut [ADDED]

- **假设** 用户选中一段文本
- **当** 用户按下 `Cmd/Ctrl+B`
- **则** 选中文本包裹 bold mark
- **并且** 再次按下 `Cmd/Ctrl+B` 取消 bold（toggle）

#### Scenario: Unsupported paste content graceful handling [ADDED]

- **假设** 用户从外部复制含不支持格式的内容
- **当** 用户粘贴到编辑器
- **则** 系统剥离不支持格式，保留纯文本结构
- **并且** 保留可支持的格式（bold/italic/lists/headings），不抛错

### Requirement: 编辑器工具栏 [ADDED]

系统必须在编辑器内容区上方渲染 `EditorToolbar` 组件，按分组展示格式化按钮。

- 分组：Text formatting / Headings / Lists / Blocks / History。
- 每个按钮必须有 `aria-label`、tooltip（含快捷键）、active 状态反映光标位置、disabled 状态。
- 分组间用 `ToolbarSeparator`（1px 竖线 `--color-border-default`）分隔。
- 工具栏背景 `--color-bg-surface`，底边框 `--color-border-default`。

#### Scenario: Toolbar reflects active formatting state [ADDED]

- **假设** 光标位于 bold H2 标题内
- **当** 工具栏渲染
- **则** Bold 按钮和 H2 按钮显示 active 状态
- **并且** 其余按钮为默认非活跃态

#### Scenario: Undo button disabled when no history [ADDED]

- **假设** 文档刚创建无编辑历史
- **当** 工具栏渲染
- **则** Undo 按钮 disabled（`cursor-not-allowed`、`opacity: 0.4`）
- **并且** 点击无响应

### Requirement: 编辑器键盘快捷键 [ADDED]

系统必须支持平台自适应的编辑器快捷键，与 `DESIGN_DECISIONS.md` §10.2 一致。

- Bold `Cmd/Ctrl+B`、Italic `Cmd/Ctrl+I`、Save `Cmd/Ctrl+S`、Undo `Cmd/Ctrl+Z` 等。
- `Cmd/Ctrl+B` 保留给 Bold，侧边栏切换使用 `Cmd/Ctrl+\`。
- F11 为禅模式入口（占位，本 change 不实现禅模式）。

#### Scenario: Platform-appropriate shortcut displayed in tooltip [ADDED]

- **假设** 用户在 macOS
- **当** 鼠标悬停 Bold 按钮
- **则** tooltip 显示 "Bold (⌘B)"

#### Scenario: Shortcut triggers correct action regardless of focus [ADDED]

- **假设** 编辑器有焦点
- **当** 用户按 `Cmd/Ctrl+S`
- **则** 触发手动保存 `actor: "user"`、`reason: "manual-save"`
- **并且** 不影响 autosave timer

### Requirement: 文档加载与持久化（IPC）[ADDED]

编辑器必须通过 typed IPC channels 加载和持久化文档内容。

- `file:document:getCurrent`、`file:document:list`、`file:document:create`、`file:document:read`、`file:document:save`。
- `editorStore` 的 `bootstrapForProject` → `openDocument` 流程。

#### Scenario: Bootstrap loads existing project with current document [ADDED]

- **假设** 项目已打开且设有当前文档
- **当** 调用 `bootstrapForProject(projectId)`
- **则** 调用 `file:document:getCurrent` 获取文档 ID → `file:document:read` 加载内容
- **并且** `bootstrapStatus` 设为 `ready`

#### Scenario: Bootstrap creates document when project is empty [ADDED]

- **假设** 项目无文档
- **当** 调用 `bootstrapForProject(projectId)`
- **则** `getCurrent` 返回 `NOT_FOUND` → `list` 返回空 → `create` 创建默认文档
- **并且** `bootstrapStatus` 设为 `ready`

#### Scenario: Bootstrap handles IPC failure [ADDED]

- **假设** 主进程不可达或返回错误
- **当** 调用 `bootstrapForProject(projectId)`
- **则** `bootstrapStatus` 设为 `error`
- **并且** 错误暴露到 UI，不静默吞没

### Requirement: 自动保存 [ADDED]

系统必须在内容变更后自动保存到数据库。

- 500ms debounce。
- 状态机：`idle → saving → saved | error`。
- `suppressRef` 防加载时误触发。
- 卸载时 flush pending。
- 手动保存 `actor: "user"`、`reason: "manual-save"`。

#### Scenario: Content change triggers debounced autosave [ADDED]

- **假设** autosave 已启用且文档已加载
- **当** 用户键入字符
- **则** 500ms 无操作后触发 IPC save
- **并且** 成功后状态转为 `saved`

#### Scenario: Autosave failure with retry [ADDED]

- **假设** autosave 已启用
- **当** IPC save 返回错误
- **则** 状态转为 `error`，错误信息存入 `autosaveError`
- **并且** 用户可触发 `retryLastAutosave()` 重试

#### Scenario: Autosave suppressed during document load [ADDED]

- **假设** 编辑器正通过 `setContent()` 加载新文档
- **当** `suppressRef` 在 setContent 前后设为 true/false
- **则** 内容替换不触发 autosave
- **并且** 后续用户编辑正常触发 autosave

## Out of Scope

- Bubble Menu / 大纲视图（→ editor-p1）
- AI 选中引用 / Inline Diff / 多版本 Diff（→ editor-p2）
- 禅模式实现（→ editor-p3，本 change 仅占位 F11 快捷键）
- 无障碍硬化 / 性能指标 / 异常矩阵（→ editor-p4）
