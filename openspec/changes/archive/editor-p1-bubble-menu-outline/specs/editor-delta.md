# Editor Specification Delta

## Change: editor-p1-bubble-menu-outline

### Requirement: 选中文本浮动工具栏（Bubble Menu）[ADDED]

系统必须提供基于 `@tiptap/extension-bubble-menu` 的浮动工具栏。

- 可见性：非空选区出现，折叠选区/Code Block 内/只读模式时隐藏。
- 定位：默认选区上方，空间不足时翻转到下方。
- 操作集：Bold、Italic、Underline、Strikethrough、Inline Code、Link（仅 inline marks）。
- 与固定工具栏双向同步 active 状态。
- 样式：`--color-bg-raised`、`--shadow-lg`、`--radius-md`、`z-index: var(--z-dropdown)`。

#### Scenario: Selection triggers Bubble Menu appearance [ADDED]

- **假设** 编辑器处于正常编辑模式
- **当** 用户拖选一段文本
- **则** Bubble Menu 在 100ms 内出现于选区上方
- **并且** 包含 Bold、Italic、Underline、Strikethrough、Inline Code、Link 按钮

#### Scenario: Applying format via Bubble Menu preserves selection [ADDED]

- **假设** Bubble Menu 可见且有文本选区
- **当** 用户点击 Bubble Menu 的 Bold 按钮
- **则** 选中文本包裹 bold mark，选区保持活跃
- **并且** Bubble Menu 和固定工具栏的 Bold 按钮同步显示 active

#### Scenario: Bubble Menu hides when selection is collapsed [ADDED]

- **假设** Bubble Menu 可见
- **当** 用户点击编辑器其他位置（折叠选区）
- **则** Bubble Menu 消失，不触发格式化操作

#### Scenario: Bubble Menu suppressed inside Code Block [ADDED]

- **假设** 文档包含代码块
- **当** 用户在代码块内选中文本
- **则** Bubble Menu 不出现
- **并且** 固定工具栏的 inline 格式按钮 disabled

#### Scenario: Bubble Menu repositions to avoid window boundary [ADDED]

- **假设** 用户在编辑器第一行（靠近顶部边缘）选中文本
- **当** 选区上方空间不足
- **则** Bubble Menu 渲染到选区下方
- **并且** 不被窗口边界裁剪

### Requirement: 大纲视图（Outline View）[ADDED]

系统必须提供基于文档标题的大纲视图。

- `deriveOutline()` 从 TipTap JSON 提取 H1–H3，忽略 H4–H6，空标题显示 "(untitled heading)"。
- 分级缩进：H1 14px/600、H2 缩进 32px/13px/400、H3 缩进 48px/12px/400。
- 点击导航、当前标题高亮（`--color-accent` 左边条）。
- 交互：展开/折叠、搜索过滤、拖拽重排、多选、键盘导航、行内重命名。

#### Scenario: Outline generated from document headings [ADDED]

- **假设** 文档含 H1 "第一章"、H2 "场景一"、H3 "对话"、H2 "场景二"
- **当** 调用 `deriveOutline(doc)`
- **则** 返回 4 个 `OutlineItem`，级别分别为 h1/h2/h3/h2
- **并且** 每项有基于 level+position+title hash 的稳定 ID

#### Scenario: Outline navigation scrolls editor to heading [ADDED]

- **假设** 大纲面板显示长文档条目
- **当** 用户点击 "场景二" 条目
- **则** 编辑器滚动到 "场景二" 标题位置
- **并且** "场景二" 条目显示 active 指示器

#### Scenario: Empty document shows empty state [ADDED]

- **假设** 文档无标题（仅段落）
- **当** 大纲面板渲染
- **则** 显示空状态图标和 "No outline yet. Headings appear here automatically."

#### Scenario: Outline search filters items [ADDED]

- **假设** 大纲有 10 个条目
- **当** 用户在搜索框输入 "场景"
- **则** 仅显示标题含 "场景" 的条目
- **并且** 清空搜索恢复全部条目

## Out of Scope

- AI 相关交互（→ editor-p2）
- 大纲与版本对比联动（→ version-control）
- Link 编辑弹窗（仅 toggle link mark）
