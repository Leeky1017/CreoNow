# IPC Specification Delta

## Change: s2-dual-field-migrate

### Requirement: 双字段迁移期必须兼容旧字段并输出弃用告警 [ADDED]

IPC 处理层在迁移 `executionId/runId` 与 `id/skillId` 双字段时，必须满足兼容与可观测并存：

- 请求携带新字段时按新字段执行，不输出弃用告警。
- 请求携带旧字段时允许继续处理，但必须记录 `deprecated_field` 告警并标注字段名。
- 同时出现新旧字段时优先采用新字段值，旧字段仅用于兼容读取与告警。

#### Scenario: 仅新字段输入时正常处理且无弃用告警 [ADDED]

- **假设** 请求只携带 `executionId`（或 `id`）
- **当** IPC handler 执行参数解析
- **则** 请求按新字段正常处理
- **并且** 不记录 `deprecated_field` 告警

#### Scenario: 旧字段输入时兼容处理并记录告警 [ADDED]

- **假设** 请求携带 `runId`（或 `skillId`）旧字段
- **当** IPC handler 执行参数解析
- **则** 请求仍可完成处理
- **并且** 记录一次 `deprecated_field` 告警且包含对应字段名

## Out of Scope

- 迁移期结束后的旧字段彻底删除策略
- IPC 通道命名与通信模式调整
