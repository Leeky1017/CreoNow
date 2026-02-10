# Version Control Specification Delta

## Change: version-control-p1-ai-mark-preview

### Requirement: AI 修改标记与区分显示 [ADDED]

AI 修改和用户修改默认不区分显示。用户可在设置中开启区分显示。

- 开启后：版本历史中 AI 版本标注「AI 修改」标签（`--color-info` 背景）。
- 开启后：Diff 对比中 AI 修改使用虚线下划线，用户修改使用实线下划线。
- 偏好持久化到 `creonow.editor.showAiMarks`。

#### Scenario: 用户开启 AI 修改区分显示 [ADDED]

- **假设** 用户在设置中开启「区分 AI 修改」
- **当** 用户查看版本历史
- **则** AI 生成的版本记录额外显示「AI 修改」标签
- **并且** Diff 对比中 AI 修改部分使用虚线下划线

#### Scenario: 默认模式不区分 AI 修改 [ADDED]

- **假设** 用户未开启「区分 AI 修改」（默认）
- **当** 用户查看版本历史
- **则** 所有版本记录统一显示，不特殊标注 AI 修改

### Requirement: 版本预览 [ADDED]

用户必须能够点击任意历史版本进行只读预览。

- 点击版本记录 → 主编辑区切换为只读预览模式。
- 预览模式顶部提示条：「正在预览 [时间] 的版本」+ 「恢复到此版本」按钮 + 「返回当前版本」按钮。
- 提示条样式：`--color-bg-raised` 背景、`--color-border-default` 下边框。
- 预览模式下编辑器工具栏禁用。

#### Scenario: 用户预览历史版本 [ADDED]

- **假设** 版本历史面板显示多个版本
- **当** 用户点击「2 小时前」的版本记录
- **则** 编辑区切换为只读模式，显示该版本内容
- **并且** 顶部提示条显示「正在预览 2 小时前的版本」
- **并且** 编辑器工具栏按钮全部禁用

#### Scenario: 用户从预览返回当前版本 [ADDED]

- **假设** 用户正在预览历史版本
- **当** 用户点击「返回当前版本」
- **则** 编辑区恢复为当前版本内容
- **并且** 提示条消失，编辑器恢复可编辑状态

## Out of Scope

- 版本 Diff 对比（→ version-control-p2）
- 版本回滚完整流程（→ version-control-p2，本 change 仅提供按钮入口占位）
- Diff 中 AI 修改虚线下划线的实际渲染（→ version-control-p2 配合 editor-p2）
