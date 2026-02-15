# Context Engine Specification Delta

## Change: s3-synopsis-injection

### Requirement: 续写上下文必须支持章节摘要持久化与注入 [ADDED]

Context Engine 必须支持将章节摘要持久化到本地存储，并在续写请求组装时注入前几章摘要；注入失败不得静默。

#### Scenario: S3-SYN-INJ-S1 续写时按章节顺序注入前几章摘要 [ADDED]

- **假设** 项目已有多章摘要被持久化
- **当** 用户触发续写并执行上下文组装
- **则** 系统必须按章节顺序注入最近若干章摘要到上下文
- **并且** 注入内容可被 token 预算策略统一裁剪

#### Scenario: S3-SYN-INJ-S2 无摘要数据时续写流程保持正常 [ADDED]

- **假设** 项目尚未生成任何摘要
- **当** 用户触发续写并组装上下文
- **则** synopsis 注入层应为空，不得注入伪造摘要
- **并且** 续写流程保持可用，不返回错误

#### Scenario: S3-SYN-INJ-S3 存储或检索失败时返回结构化降级信号 [ADDED]

- **假设** synopsis 存储或读取发生数据库异常
- **当** 系统执行摘要注入流程
- **则** 系统必须返回结构化 warning/error 信号并记录日志
- **并且** 不得以静默方式吞错或伪造成功注入结果

## Out of Scope

- `synopsis` 技能定义与输出质量约束（由 `s3-synopsis-skill` 负责）
- Context Engine token 预算核心算法重写
- 摘要展示类 UI 与交互面板扩展
