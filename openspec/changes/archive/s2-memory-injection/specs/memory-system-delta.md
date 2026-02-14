# Memory System Specification Delta

## Change: s2-memory-injection

### Requirement: Memory preview 必须可注入 AI prompt [ADDED]

系统必须提供可调用的 memory preview 注入路径，并确保其可被 Context 组装链路消费。

#### Scenario: MS-S2-MI-S1 有记忆时注入 prompt [ADDED]

- **假设** 项目存在可用于 preview 的记忆片段
- **当** settings fetcher 调用 memory preview 接口
- **则** 返回内容被注入到 AI prompt 对应层
- **并且** 注入文本可在 context 检查结果中验证

#### Scenario: MS-S2-MI-S2 无记忆或异常时可恢复降级 [ADDED]

- **假设** preview 返回空结果或读取异常
- **当** settings fetcher 执行注入
- **则** 系统返回可恢复的降级结果而非中断组装
- **并且** 输出包含可追踪的告警标识以避免 silent failure

#### Scenario: MS-S2-MI-S3 context 端到端可见 [ADDED]

- **假设** memory preview 注入链路已接入 context 组装
- **当** 执行端到端上下文组装验证
- **则** 组装结果包含 memory 注入片段
- **并且** 该结果与 memory preview 输出内容一致
