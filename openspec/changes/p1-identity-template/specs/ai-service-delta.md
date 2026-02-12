# AI Service Specification Delta

## Change: p1-identity-template

### Requirement: 全局 AI 身份提示词模板 [ADDED]

AI 服务**必须**提供全局身份提示词模板（`GLOBAL_IDENTITY_PROMPT` 常量），始终作为系统提示词的第一层注入。模板**必须**包含以下 5 个 XML 区块：

| 区块 | 标签 | 内容 |
|------|------|------|
| 身份定义 | `<identity>` | AI 创作伙伴核心身份，首要原则：尊重创作者风格和意图 |
| 写作素养 | `<writing_awareness>` | 叙事结构（narrative structure）、角色塑造（characterization）、场景 blocking、Show don't tell、POV 一致性、节奏控制、伏笔与回收 |
| 角色流动 | `<role_fluidity>` | ghostwriter（续写）、muse（头脑风暴）、editor（评审）、actor（扮演角色）、painter（描写）五个角色及切换规则 |
| 行为约束 | `<behavior>` | 中文回应、保持创作者风格、不确定时追问、纯文本/Markdown 输出、不重复用户输入 |
| 上下文感知 | `<context_awareness>` | 声明后续动态注入的上下文类型（项目、文档、光标、偏好、KG） |

REQ-ID: `REQ-AIS-IDENTITY`

#### Scenario: S1 模板包含五个 XML 区块 [ADDED]

- **假设** 导入 `GLOBAL_IDENTITY_PROMPT` 常量
- **当** 读取其值
- **则** `typeof GLOBAL_IDENTITY_PROMPT === "string"`
- **并且** 值包含 `"<identity>"` 和 `"</identity>"`
- **并且** 值包含 `"<writing_awareness>"` 和 `"</writing_awareness>"`
- **并且** 值包含 `"<role_fluidity>"` 和 `"</role_fluidity>"`
- **并且** 值包含 `"<behavior>"` 和 `"</behavior>"`
- **并且** 值包含 `"<context_awareness>"` 和 `"</context_awareness>"`

#### Scenario: S2 写作素养区块包含核心概念 [ADDED]

- **假设** 导入 `GLOBAL_IDENTITY_PROMPT` 常量
- **当** 提取 `<writing_awareness>` 与 `</writing_awareness>` 之间的内容
- **则** 内容包含 `"Show don't tell"` 或 `"展示而非叙述"`
- **并且** 内容包含 `"blocking"` 或 `"场景"`
- **并且** 内容包含 `"POV"` 或 `"叙事"` 或 `"第一人称"`

#### Scenario: S3 角色流动区块定义五个角色 [ADDED]

- **假设** 导入 `GLOBAL_IDENTITY_PROMPT` 常量
- **当** 提取 `<role_fluidity>` 与 `</role_fluidity>` 之间的内容
- **则** 内容包含 `"ghostwriter"`
- **并且** 内容包含 `"muse"`
- **并且** 内容包含 `"editor"`
- **并且** 内容包含 `"actor"`
- **并且** 内容包含 `"painter"`
