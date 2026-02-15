# AI Service Specification Delta

## Change: s3-trace-persistence

### Requirement: AI 生成链路必须持久化 trace 与 feedback 并保证失败可观测 [ADDED]

AI Service 在每次生成完成后，必须将生成 trace 持久化到本地存储，并支持关联 feedback 写入；持久化失败不得静默。

#### Scenario: S3-TRACE-S1 AI 生成完成后持久化 trace 并返回可追踪 `traceId` [ADDED]

- **假设** 一次技能或自由对话生成流程正常完成
- **当** AI Service 处理完成结果
- **则** 系统必须写入 `generation_traces` 并返回可追踪的 `traceId`
- **并且** 该 `traceId` 可用于后续查询与审计

#### Scenario: S3-TRACE-S2 trace feedback 与 `traceId` 建立稳定关联 [ADDED]

- **假设** 用户对某次生成结果提交反馈
- **当** 系统写入 feedback
- **则** 反馈记录必须关联到存在的 `traceId`
- **并且** 查询 trace 记录时可检索到对应 feedback

#### Scenario: S3-TRACE-S3 trace 持久化失败时输出结构化降级信号 [ADDED]

- **假设** 数据库异常导致 trace 写入失败
- **当** AI Service 完成生成并尝试持久化
- **则** 系统必须输出结构化降级信号（含错误码与日志字段）
- **并且** 不得静默吞错或伪造“已持久化成功”状态

## Out of Scope

- Trace 可视化界面或分析报表功能
- Judge 评分算法与提示词策略变更
- 外部遥测平台对接与数据上报链路
