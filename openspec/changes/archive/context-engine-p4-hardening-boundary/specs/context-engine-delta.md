# Context Engine Delta — context-engine-p4-hardening-boundary

## [MODIFIED] Requirement: 模块级可验收标准

系统必须提供可量化的验收阈值，并将 `context:inspect` 限制在授权调试场景。

验收阈值：

- `context:assemble`: p95 < 250ms，p99 < 500ms
- `context:inspect`: p95 < 180ms，p99 < 350ms
- token 预算计算: p95 < 80ms，p99 < 150ms

容量与并发：

- 单次组装输入上限：64k tokens
- Retrieved chunk 上限：200
- 同文档并发组装上限：4

`context:inspect` 访问约束：

- 必须满足 `debugMode=true` 且 `callerRole in {owner, maintainer}`。
- 未授权访问必须返回 `CONTEXT_INSPECT_FORBIDDEN`。

### Scenario: CE5-R1-S1 性能与容量阈值达标 [ADDED]

- **假设** 压测场景下连续执行 `context:assemble` 与 `context:inspect`
- **当** 请求规模达到模块目标容量
- **则** 关键路径满足 p95/p99 阈值
- **并且** 无输入超限请求被静默吞掉

### Scenario: CE5-R1-S2 inspect 权限与调试门禁生效 [ADDED]

- **假设** 非授权角色在非调试模式请求 `context:inspect`
- **当** 请求到达主进程
- **则** 返回 `CONTEXT_INSPECT_FORBIDDEN`
- **并且** 审计日志记录拒绝原因与调用者标识

## [MODIFIED] Requirement: 异常与边界覆盖矩阵

系统必须覆盖并可判定以下关键边界错误码：

- `CONTEXT_BUDGET_FALLBACK`
- `CONTEXT_SCOPE_VIOLATION`
- `CONTEXT_INPUT_TOO_LARGE`
- `CONTEXT_BACKPRESSURE`
- `CONTEXT_BUDGET_CONFLICT`

边界约束：

- 并发预算更新使用乐观锁版本号；版本漂移必须返回 `CONTEXT_BUDGET_CONFLICT`。
- 任意跨项目层数据注入必须阻断并返回 `CONTEXT_SCOPE_VIOLATION`。

### Scenario: CE5-R2-S1 并发预算更新冲突可判定 [ADDED]

- **假设** 两个客户端并发更新预算，后到请求携带旧版本号
- **当** 调用 `context:budget:update`
- **则** 后到请求返回 `CONTEXT_BUDGET_CONFLICT`
- **并且** 先到请求结果保持有效

### Scenario: CE5-R2-S2 跨项目注入被阻断 [ADDED]

- **假设** 请求 `projectId=A`，但输入层数据来源于 `projectId=B`
- **当** Context Engine 执行组装
- **则** 请求被拒绝并返回 `CONTEXT_SCOPE_VIOLATION`
- **并且** 安全日志记录跨项目注入阻断事件

## [MODIFIED] Requirement: Non-Functional Requirements

日志与可观测性：

- 默认只记录摘要、hash 与计数，不记录全文 prompt。
- 仅在显式调试会话中允许受控采样，采样内容需脱敏（实体名、原文片段、用户输入）。

超限保护：

- 输入超过 64k tokens 返回 `CONTEXT_INPUT_TOO_LARGE`。
- 并发超过上限时排队或返回 `CONTEXT_BACKPRESSURE`，不得 silent failure。

### Scenario: CE5-R3-S1 超大输入触发硬保护 [ADDED]

- **假设** 单次输入预估 token 为 90k
- **当** 调用 `context:assemble`
- **则** 返回 `CONTEXT_INPUT_TOO_LARGE`
- **并且** 返回体提供可执行的缩减建议

### Scenario: CE5-R3-S2 背压与日志脱敏同时生效 [ADDED]

- **假设** 同文档并发请求超过上限且触发背压
- **当** 系统处理超限请求
- **则** 返回 `CONTEXT_BACKPRESSURE` 或进入有界队列
- **并且** 相关日志不包含未脱敏全文内容

## Out of Scope

- Owner 固定优先级与默认预算比例调整。
- Stable Prefix / Constraints 业务规则重定义。
- Judge 算法实现与模型选型。
