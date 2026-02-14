# Context Engine Specification Delta

## Change: s2-fetcher-always

### Requirement: Rules fetcher 必须注入 aiContextLevel=always 的实体 [ADDED]

系统必须在 Rules 层查询并注入 `aiContextLevel="always"` 的实体信息，确保核心设定稳定进入上下文。

#### Scenario: CE-S2-FA-S1 always 实体注入 Rules 层 [ADDED]

- **假设** KG 中存在一个或多个 `aiContextLevel="always"` 的实体
- **当** rules fetcher 组装 Rules 层
- **则** 结果中包含这些实体的格式化 chunks
- **并且** 每个 chunk 可追踪来源信息

#### Scenario: CE-S2-FA-S2 无 always 实体时不注入额外内容 [ADDED]

- **假设** KG 查询结果中无 `aiContextLevel="always"` 实体
- **当** rules fetcher 执行
- **则** 返回不包含额外实体注入内容
- **并且** Context 组装流程继续可用

#### Scenario: CE-S2-FA-S3 查询异常时必须显式降级 [ADDED]

- **假设** KG 查询发生异常
- **当** rules fetcher 执行
- **则** 返回可恢复的降级结果而非中断组装
- **并且** 输出包含可追踪的告警标识以避免 silent failure
