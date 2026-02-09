# AI Service Specification Delta

## Change: ai-service-p5-failover-quota-hardening

### Requirement: Provider 降级切换与额度保护 [MODIFIED]

- 主 provider 连续失败 3 次后必须标记为 `degraded` 并切换到备用 provider。
- 15 分钟后必须执行 half-open 探测，探测成功才允许切回主 provider。
- 切换全过程必须保持同一 `traceId` 审计连续性。
- 会话 token 预算超限必须返回 `AI_SESSION_TOKEN_BUDGET_EXCEEDED`。
- 请求速率超限必须返回 `AI_RATE_LIMITED`。

#### Scenario: 主备切换与 half-open 探测闭环 [ADDED]

- **假设** 主 provider 连续 3 次 5xx，备用 provider 可用
- **当** 系统触发降级策略
- **则** 立即切换到备用 provider 并记录 `traceId` 连续审计
- **并且** 15 分钟后执行 half-open 探测，成功后再切回主 provider

#### Scenario: 会话预算与速率限制双阈值阻断 [ADDED]

- **假设** 会话 token 接近上限且请求速率已触顶
- **当** 用户继续发送请求
- **则** 系统优先返回触发阈值对应错误码（预算超限或速率超限）
- **并且** 不发起上游 provider 调用

### Requirement: 模块级可验收标准（适用于本模块全部 Requirement） [MODIFIED]

- 全 provider 异常时必须进入可用降级态并返回 `AI_PROVIDER_UNAVAILABLE`。
- 降级态下编辑器保持可编辑，AI 面板给出可重试提示。

#### Scenario: 全 provider 不可用进入降级态 [ADDED]

- **假设** 主备 provider 同时不可用
- **当** 用户触发 AI 请求
- **则** 返回 `AI_PROVIDER_UNAVAILABLE`
- **并且** 编辑器可持续编辑，AI 面板显示降级说明与重试入口

#### Scenario: 降级恢复后审计链路连续 [ADDED]

- **假设** 系统从降级态恢复到可用态
- **当** 新请求再次成功
- **则** 审计日志可关联完整恢复路径
- **并且** `traceId` 链路不中断

### Requirement: 异常与边界覆盖矩阵 [MODIFIED]

- 必须覆盖 API Key 失效、并发竞态、容量溢出与权限边界。
- `AI_AUTH_FAILED` 必须阻断同 key 重试并提示重新配置。

#### Scenario: 同会话并发入队遵循单执行上限 [ADDED]

- **假设** 同一会话并发提交 3 个技能请求
- **当** 第一请求执行中
- **则** 后续请求入队且不产生并行执行
- **并且** 队列状态可观察

#### Scenario: 会话消息容量超限被阻断且不丢失历史 [ADDED]

- **假设** 会话消息数已达到 2000 条
- **当** 用户继续发送消息
- **则** 请求被阻断并提示归档旧会话
- **并且** 既有消息完整保留
