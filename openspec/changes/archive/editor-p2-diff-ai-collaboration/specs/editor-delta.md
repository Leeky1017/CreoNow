# Editor Specification Delta

## Change: editor-p2-diff-ai-collaboration

### Requirement: 选中内容自动引用到 AI 对话输入框 [ADDED]

系统必须自动捕获编辑器文本选区并作为上下文引用呈现在 AI 面板输入区。

- `captureSelectionRef()` 捕获选区文本 + `SelectionRef`（range + selectionTextHash），写入 `aiStore.selectionText/selectionRef`。
- Reference card：截断预览（max 120 chars + "..."），`--color-bg-raised` 背景，关闭按钮（×）。
- Sticky 行为：选区折叠不自动消失。
- 四种清除条件：关闭按钮 / 发送请求 / 新建对话 / 新选区替换。
- 发送请求时 `selectionText` + `selectionRef` 传递为 context。
- 冲突检测：`applySelection()` 时若原文已变返回 `CONFLICT`。

#### Scenario: Selection creates reference card in AI panel [ADDED]

- **假设** AI 面板打开且编辑器有内容
- **当** 用户选中一段文本
- **则** AI 输入区上方出现 reference card，显示截断预览和关闭按钮

#### Scenario: User manually dismisses reference [ADDED]

- **假设** reference card 已显示
- **当** 用户点击关闭按钮（×）
- **则** card 消失，`aiStore` 中 `selectionText/selectionRef` 清为 null

#### Scenario: Sending AI request with reference [ADDED]

- **假设** reference card 已显示且用户输入了 prompt
- **当** 用户按 Enter 发送请求
- **则** AI 技能接收 `selectionText` 作为 context
- **并且** reference card 从输入区清除

#### Scenario: New selection replaces existing reference [ADDED]

- **假设** reference card 显示 "第一章的开头..."
- **当** 用户选中不同段落
- **则** card 更新为新选区文本，旧 `selectionRef` 被替换

#### Scenario: No reference card when no selection exists [ADDED]

- **假设** AI 面板打开且无文本选中
- **当** `aiStore.selectionText` 为 null 或空
- **则** AI 输入区正常渲染，无 reference card

### Requirement: AI 协作 Inline Diff [ADDED]

系统必须通过 inline diff 体验展示 AI 修改结果。

- `UnifiedDiffView` / `SplitDiffView` 两种模式。
- 删除：`--color-error-subtle` 背景 + 红色删除线；新增：`--color-success-subtle` 背景 + 绿色文字。
- `DiffStats` 统计增删行数。
- 逐块接受/拒绝 + 全部接受/拒绝（DiffFooter）。
- Previous/Next 导航，当前 hunk 高亮 `--color-accent`。
- `editorStore.compareMode` 控制进入/退出对比模式。

#### Scenario: AI suggestion displayed as inline diff [ADDED]

- **假设** 用户触发润色技能并获得 AI 返回
- **当** AI 返回修改版本
- **则** 进入 `compareMode: true`，`DiffViewPanel` 展示 unified diff
- **并且** diff footer 显示统计（如 "+12 lines, −3 lines"）

#### Scenario: User rejects AI suggestion [ADDED]

- **假设** DiffViewPanel 正展示 AI 建议
- **当** 用户点击 Close 按钮
- **则** 退出 `compareMode`，原文保持不变

#### Scenario: User accepts AI suggestion in bulk [ADDED]

- **假设** DiffViewPanel 展示多个 change hunks
- **当** 用户点击 "Accept All"
- **则** 所有 AI 修改替换文档对应部分，退出 compareMode

#### Scenario: User selectively accepts individual change hunks [ADDED]

- **假设** DiffViewPanel 展示 3 个 change hunks
- **当** 用户接受 hunk 1 和 3，拒绝 hunk 2
- **则** 仅接受的 hunks 应用到文档，被拒绝的保留原文

### Requirement: Diff 对比模式（多版本）[ADDED]

系统必须支持最多 4 版本同时对比。

- 两版本对比使用 `DiffViewPanel`（Unified / Split）。
- 3–4 版本使用 `MultiVersionCompare`（2×2 网格，3 版本时末格跨两列）。
- 同步滚动（`syncScroll`）。
- 版本标签 + 类型指示（`manual` | `auto` | `current`）。
- Diff 着色仅使用 semantic tokens，禁止 raw color。

#### Scenario: Two-version comparison with navigation [ADDED]

- **假设** 用户从版本历史选择对比
- **当** DiffViewPanel 渲染
- **则** header 显示版本选择器，导航显示 "Change 1 of N" + Previous/Next
- **并且** Next 滚动到下一个 hunk 并高亮

#### Scenario: Four-version simultaneous comparison [ADDED]

- **假设** 用户选择 4 个版本对比
- **当** `MultiVersionCompare` 渲染
- **则** 4 个 pane 以 2×2 网格布局，各显示版本标签和内容
- **并且** `syncScroll` 启用时滚动同步

#### Scenario: Empty diff when versions are identical [ADDED]

- **假设** 用户对比两个相同版本
- **当** DiffViewPanel 渲染
- **则** 显示 "No changes to display"，统计 "+0 lines, −0 lines"

## Out of Scope

- 版本快照存储（→ version-control-p0）
- 版本历史 UI（→ version-control-p0）
- 版本回滚流程（→ version-control-p2）
- 禅模式（→ editor-p3）
