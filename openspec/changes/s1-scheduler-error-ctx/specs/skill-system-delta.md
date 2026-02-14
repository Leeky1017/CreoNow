# Skill System Specification Delta

## Change: s1-scheduler-error-ctx

### Requirement: Scheduler 错误上下文必须保留且终态收敛一致 [ADDED]

Skill Scheduler 在处理 `response` 与 `completion` 两条异步链路时，若任一路径发生异常，必须保留可诊断错误上下文，并以确定性方式收敛任务终态。

- `response`/`completion` 发生错误时，禁止仅保留 `failed` 结果而丢弃错误细节 [ADDED]
- 同一任务终态必须只收敛一次，禁止双路径竞态导致重复 finalize 或终态回写漂移 [ADDED]
- `skill_response_error` 与 `skill_completion_error` 必须记录完整结构化字段集合，支持跨日志检索 [ADDED]

#### Scenario: response/completion 失败时保留错误上下文 [ADDED]

- **假设** 某任务执行过程中，`response` 或 `completion` 任一路径抛出异常（如 `UPSTREAM_TIMEOUT`）
- **当** Scheduler 处理该异常路径
- **则** 任务终态收敛为 `failed`
- **并且** 错误上下文被保留用于后续诊断（至少包含错误来源路径与错误消息）
- **并且** 不得出现“只有 failed 状态、无错误细节”的静默降级

#### Scenario: response/completion 竞态下终态一致 [ADDED]

- **假设** `response` 与 `completion` 回调近同时到达，且至少一路径为异常
- **当** Scheduler 执行终态收敛
- **则** 同一任务只发生一次终态写入
- **并且** 终态结果与错误路径一致，不被后续回调覆盖为冲突状态

#### Scenario: 调度错误日志字段完整 [ADDED]

- **假设** Scheduler 触发 `skill_response_error` 或 `skill_completion_error` 日志事件
- **当** 写入结构化日志
- **则** 日志字段必须至少包含 `sessionKey`、`taskId`、`errorSource`、`errorMessage`
- **并且** 对可用上下文补充 `skillId`、`executionId`，用于跨会话排障检索

## Out of Scope

- 调度并发上限、队列容量、超时阈值等策略参数调整
- 技能执行结果 envelope 或 IPC 通道契约调整
- Scheduler 之外模块的架构重构
