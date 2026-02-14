# Skill System Specification Delta

## Change: s2-conversation-skills

### Requirement: 对话类内置技能文档必须完整且职责边界清晰 [ADDED]

系统必须补齐 `brainstorm`、`roleplay`、`critique` 三个对话类内置技能文档，并保证可发现性与职责边界明确。

- 每个对话技能必须提供统一结构 `SKILL.md`（目标、输入、输出、约束）。
- 对话技能必须与写作技能在用途描述上可区分，避免职责重叠。
- 对话技能必须纳入加载与校验测试，覆盖成功与失败路径。

#### Scenario: skill loader 可发现全部对话技能 [ADDED]

- **假设** 系统中已存在 `brainstorm`、`roleplay`、`critique` 对话技能文档
- **当** Skill Loader 执行内置技能扫描
- **则** 返回结果包含上述 3 个技能标识
- **并且** 每个技能都可被后续调用流程识别

#### Scenario: 对话技能职责描述不得与写作技能混淆 [ADDED]

- **假设** 对话技能与写作技能共存于内置技能清单
- **当** 系统校验技能元数据与用途描述
- **则** 对话技能保留“对话引导/角色交互/批判反馈”语义边界
- **并且** 不得把“续写/扩写/描写”定义写入对话技能主职责

## Out of Scope

- 对话技能具体提示词策略与执行参数调优
- 编辑器或 AI 面板触发入口实现
