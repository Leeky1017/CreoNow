# Skill System Specification Delta

## Change: skill-system-p0-builtin-skills-executor

### Requirement: 内置技能清单与 I/O 定义 [ADDED]

系统必须预装 8 个文字创作类内置技能，scope 为 `builtin`，不可删除可停用。

| 技能 ID          | 名称     | 输入                | 输出           | 上下文规则                         |
| ---------------- | -------- | ------------------- | -------------- | ---------------------------------- |
| `polish`         | 润色     | 选中文本            | 润色后文本     | 保持原意、优化表达、不改变叙事视角 |
| `rewrite`        | 改写     | 选中文本 + 改写指令 | 改写后文本     | 遵循改写指令、保持上下文连贯       |
| `continue`       | 续写     | 当前文档上下文      | 续写段落       | 匹配前文风格、遵守知识图谱约束     |
| `expand`         | 扩写     | 选中文本            | 扩展后文本     | 丰富细节、保持原有结构和节奏       |
| `condense`       | 缩写     | 选中文本            | 精简后文本     | 保留核心信息、去除冗余描述         |
| `style-transfer` | 风格迁移 | 选中文本 + 目标风格 | 风格迁移后文本 | 保持叙事内容、仅改变语言风格       |
| `translate`      | 翻译     | 选中文本 + 目标语言 | 翻译后文本     | 保持文学表达、非逐字直译           |
| `summarize`      | 摘要     | 选中文本或整章      | 摘要文本       | 提取核心事件和关键信息             |

- 执行必须通过 `SkillExecutor` 统一调度。
- 执行前必须校验输入满足技能要求。
- 结果以 `SkillResult` 返回：`output`、`metadata`（token 用量、模型标识）、`traceId`。

#### Scenario: 用户触发润色技能 [ADDED]

- **假设** 用户在编辑器中选中文本，AI 面板已打开
- **当** 用户点击「润色」技能按钮
- **则** 通过 `ai:skill:run` 将选中文本和技能 ID 发送到主进程
- **并且** `SkillExecutor` 校验输入非空，组装上下文并调用 LLM
- **并且** 结果以流式响应返回渲染进程

#### Scenario: 续写技能使用文档上下文 [ADDED]

- **假设** 用户正在编辑第十章，光标位于段落末尾
- **当** 用户触发「续写」技能
- **则** 系统捕获当前文档上下文（光标前内容）作为输入
- **并且** Context Engine 按优先级注入四层上下文
- **并且** 续写结果追加到光标位置

#### Scenario: 技能执行输入校验失败 [ADDED]

- **假设** 用户未选中任何文本
- **当** 用户点击「润色」按钮
- **则** 返回 `{ code: "SKILL_INPUT_EMPTY", message: "请先选中需要润色的文本" }`
- **并且** AI 面板展示错误提示，不发起 LLM 调用

### Requirement: 技能执行与流式响应 [ADDED]

技能执行必须支持流式响应。

- `ai:skill:run`（Request-Response）→ 返回 `executionId`。
- `skill:stream:chunk`（Push Notification）→ 逐步推送生成内容。
- `skill:stream:done`（Push Notification）→ 推送完成信号 + 完整 `SkillResult`。
- `ai:skill:cancel`（Request-Response）→ 中断 LLM 调用、释放资源。
- LLM 失败/超时必须返回结构化错误，不可静默失败。

#### Scenario: 技能流式执行正常完成 [ADDED]

- **假设** 用户触发「续写」技能
- **当** 主进程开始调用 LLM
- **则** 渲染进程收到 `executionId` 确认执行已开始
- **并且** 通过 `skill:stream:chunk` 逐步接收内容
- **并且** 最终收到 `skill:stream:done`，包含完整结果和 metadata

#### Scenario: 用户取消正在执行的技能 [ADDED]

- **假设** 技能正在流式执行中
- **当** 用户点击「停止生成」按钮
- **则** 通过 `ai:skill:cancel` 发送取消信号
- **并且** 主进程中断 LLM 调用、释放资源
- **并且** AI 面板显示「生成已取消」，已接收部分内容保留

#### Scenario: 技能执行失败的错误处理 [ADDED]

- **假设** 用户触发「改写」技能
- **当** LLM API 返回错误
- **则** 通过 `skill:stream:done` 推送 `{ success: false, error: { code: "LLM_API_ERROR", message } }`
- **并且** AI 面板展示错误 Toast，用户可点击「重试」

## Out of Scope

- 技能触发 UI / 技能选择面板（→ skill-system-p1）
- 自定义技能 CRUD（→ skill-system-p2）
- 作用域管理（→ skill-system-p1）
- 并发调度 / 超时 / 队列管理（→ skill-system-p3）
