# Context Engine Specification Delta

## Change: s2-fetcher-detected

### Requirement: Retrieved fetcher 必须按文本检测注入 when_detected 实体 [ADDED]

系统必须在 Retrieved 层将文本检测结果映射为实体注入内容，仅注入符合策略的实体。

#### Scenario: CE-S2-FD-S1 文本命中时注入目标实体 [ADDED]

- **假设** 输入文本命中某个 `when_detected` 实体名称或别名
- **当** retrieved fetcher 执行匹配并查询完整实体
- **则** 输出包含该实体的格式化注入内容
- **并且** 注入来源可追踪到检测结果

#### Scenario: CE-S2-FD-S2 never 实体不注入 [ADDED]

- **假设** 某实体 `aiContextLevel=never`
- **当** 输入文本命中该实体名称
- **则** 该实体不得被注入 Retrieved 层
- **并且** 其余符合条件实体仍按规则注入

#### Scenario: CE-S2-FD-S3 异常路径显式降级 [ADDED]

- **假设** 匹配引擎或实体查询链路出现异常
- **当** retrieved fetcher 执行
- **则** 返回可恢复的降级结果而非中断流程
- **并且** 输出包含可追踪的告警标识以避免 silent failure
