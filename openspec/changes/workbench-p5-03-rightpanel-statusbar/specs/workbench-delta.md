# Workbench Specification Delta

## Change: workbench-p5-03-rightpanel-statusbar

### Requirement: 右侧面板（AI 面板 / Info 面板 / Quality 面板）[MODIFIED]

RightPanel 结构修正——消除双层 Tab 嵌套：

- RightPanel 外层 tab 为 AI / Info / Quality（由 Change 00 确认）[MODIFIED]
- AiPanel **禁止**内部嵌套 sub-tab [ADDED]
- AiPanel 仅渲染 AI 对话交互功能（对话历史、技能按钮、AI 建议展示）[MODIFIED]
- AiPanel 内部的占位 InfoPanel 函数**必须删除** [REMOVED]
- `Cmd/Ctrl+L` 从折叠状态打开时**必须**强制显示 AI tab [MODIFIED]
- `activeRightPanel` **必须**持久化到 `creonow.layout.activeRightPanel` [ADDED]

#### Scenario: RightPanel 无双层 Tab 嵌套 [ADDED]

- **假设** 右侧面板展开，当前 tab 为 AI
- **当** 检查 AiPanel 渲染内容
- **则** AiPanel 内部无 sub-tab header（无 "ASSISTANT" / "INFO" 标签）
- **并且** AiPanel 直接渲染 AI 对话交互区

#### Scenario: Cmd/Ctrl+L 从折叠打开默认 AI tab [MODIFIED]

- **假设** 右侧面板处于折叠状态，用户之前查看的是 Info tab
- **当** 用户按下 `Cmd/Ctrl+L`
- **则** 右侧面板展开并强制切换到 AI tab
- **并且** 再次按下 `Cmd/Ctrl+L` 折叠面板

#### Scenario: activeRightPanel 持久化与恢复 [ADDED]

- **假设** 用户将右侧面板切换到 Info tab
- **当** 应用重启
- **则** 右侧面板恢复为 Info tab（从 `creonow.layout.activeRightPanel` 读取）
- **并且** 若持久化值非法，回退默认值 `ai`

---

### Requirement: 底部状态栏 [MODIFIED]

StatusBar 信息补齐：

- **左侧**：当前项目名称 + 当前文档名称 [ADDED 实现]
- **右侧**：字数统计 + 保存状态指示器 + 当前时间 [ADDED 实现]

保存状态指示器完整状态机：

| 状态    | 显示文字     | 样式                        | 持续时间          |
| ------- | ------------ | --------------------------- | ----------------- |
| idle    | （空）       | —                           | 默认              |
| saving  | 「保存中...」| `--color-fg-muted`          | 直到完成          |
| saved   | 「已保存」   | `--color-fg-muted`          | 2s 后清除回 idle  |
| error   | 「保存失败」 | `--color-error`，可点击重试 | 持续直到重试/成功 |

当前时间格式：`HH:mm`，每分钟刷新。

#### Scenario: StatusBar 显示完整信息 [ADDED]

- **假设** 用户在项目「暗流」中编辑文档「第三章」
- **当** StatusBar 渲染
- **则** 左侧显示「暗流」和「第三章」
- **并且** 右侧显示字数统计（如「3,250 字」）、保存状态、当前时间

#### Scenario: StatusBar 保存状态完整状态机 [MODIFIED]

- **假设** 用户正在编辑文档
- **当** 自动保存触发
- **则** 指示器显示「保存中...」（`--color-fg-muted`）
- **当** 保存成功
- **则** 指示器显示「已保存」，2s 后清除回空
- **当** 保存失败
- **则** 指示器显示「保存失败」（`--color-error`），点击可触发重试

#### Scenario: StatusBar 保存错误可重试 [ADDED]

- **假设** 自动保存失败，StatusBar 显示「保存失败」
- **当** 用户点击「保存失败」指示器
- **则** 触发保存重试
- **并且** 指示器切换为「保存中...」

---

## Out of Scope

- AiPanel AI 对话功能本身（不修改）
- `Cmd/Ctrl+L` 去抖（→ workbench-p5-05）
- zod 校验（→ workbench-p5-05）
- 右侧面板折叠按钮（→ workbench-p5-05）
