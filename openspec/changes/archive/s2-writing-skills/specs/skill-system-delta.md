# Skill System Specification Delta

## Change: s2-writing-skills

### Requirement: 写作类内置技能文档必须完整且可被加载发现 [ADDED]

系统必须补齐 `write`、`expand`、`describe`、`shrink`、`dialogue` 五个写作类内置技能文档，并确保与 Skill Loader 的发现与校验路径一致。

- 每个技能目录必须存在结构一致的 `SKILL.md`，且包含最小必需字段（技能目标、输入、输出、约束）。
- 技能标识必须稳定且唯一，禁止同义别名混入主标识。
- 写作技能必须纳入加载与校验测试，避免“文档存在但不可发现”的假通过。

#### Scenario: skill loader 可发现全部写作技能 [ADDED]

- **假设** 系统已包含 5 个写作技能目录及对应 `SKILL.md`
- **当** Skill Loader 执行内置技能扫描
- **则** 返回结果包含 `write`、`expand`、`describe`、`shrink`、`dialogue`
- **并且** 每个技能都带有可用于调用的稳定标识

#### Scenario: 缺失字段会触发可诊断失败而非静默跳过 [ADDED]

- **假设** 某写作技能 `SKILL.md` 缺失必需字段
- **当** Skill Loader 对该技能执行解析与校验
- **则** 返回结构化失败结果（含技能 ID 与缺失字段信息）
- **并且** 不得以静默忽略方式通过加载流程

## Out of Scope

- 写作技能执行链路（LLM 调用、调度策略、超时策略）改造
- 编辑器侧写作技能入口 UI 与交互
