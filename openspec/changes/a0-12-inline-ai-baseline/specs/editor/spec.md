# Editor Specification Delta

## Change: a0-12-inline-ai-baseline

### Requirement: Inline AI（行内 AI 快捷路径） [ADDED]

编辑器**必须**提供 Inline AI 功能，允许用户在编辑器内直接调用 AI 对选中文本进行操作，无需离开编辑区域。

**触发方式：**

- 用户选中文本后按 `Cmd/Ctrl+K`
- 弹出轻量输入层（浮动输入框），用户输入指令

**交互流程：**

1. 用户选中文本
2. 按 `Cmd/Ctrl+K`，弹出浮动输入框
3. 用户输入自然语言指令（如"改成更正式的语气"）
4. AI 执行后，以 inline diff 方式预览修改结果
5. 用户可接受（应用修改）、拒绝（恢复原文）或重新生成

**约束：**

- 无选中文本时，`Cmd/Ctrl+K` 不触发
- Inline AI 不在禅模式中可用（禅模式保持纯手动写作）
- AI 执行复用已有 skill 链路，不引入独立 LLM 调用路径
- 选中文本到应用修改的完整路径不超过 4 步

#### Scenario: User triggers Inline AI with selection [ADDED]

- **假设** 用户在编辑器中选中了一段文本
- **当** 用户按下 `Cmd/Ctrl+K`
- **则** 在选中文本附近弹出浮动输入框
- **并且** 输入框获得焦点，用户可立即输入指令

#### Scenario: User accepts AI modification [ADDED]

- **假设** AI 已完成处理，inline diff 正在预览
- **当** 用户点击"接受"或按快捷键确认
- **则** AI 修改应用到文档中，替换原始选中文本
- **并且** 浮动输入框关闭

#### Scenario: User rejects AI modification [ADDED]

- **假设** AI 已完成处理，inline diff 正在预览
- **当** 用户点击"拒绝"或按 Escape
- **则** 原始文本恢复，AI 修改被丢弃
- **并且** 浮动输入框关闭

#### Scenario: Cmd+K without selection does nothing [ADDED]

- **假设** 编辑器中没有选中文本
- **当** 用户按下 `Cmd/Ctrl+K`
- **则** 不弹出任何 UI
