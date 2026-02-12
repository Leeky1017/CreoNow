# Skill System Specification Delta

## Change: skill-system-p3-scheduler-concurrency-timeout

### Requirement: 多技能并发调度、超时与依赖管理 [ADDED]

技能系统必须提供可预测的调度器。

- 同会话仅允许 1 个运行中技能（FIFO）。
- 全局并发上限 8。
- 每个技能定义 `timeoutMs`（默认 30,000，最大 120,000）。
- 依赖声明：`dependsOn: string[]`，缺失依赖时阻断执行。
- 每会话队列上限 20，超限直接拒绝。
- 队列状态实时推送到 AI 面板。
- 错误码：`SKILL_TIMEOUT`、`SKILL_DEPENDENCY_MISSING`、`SKILL_QUEUE_OVERFLOW`。

#### Scenario: 多技能并发请求按队列执行 [ADDED]

- **假设** 用户在同一会话连续触发 `rewrite`、`expand`、`polish`
- **当** 调度器接收请求
- **则** `rewrite` 立即执行，其余按 FIFO 排队
- **并且** 队列状态实时推送到 AI 面板

#### Scenario: 技能依赖缺失阻断执行 [ADDED]

- **假设** 自定义技能 `chapter-outline-refine` 依赖 `summarize`
- **当** `summarize` 被停用或不存在
- **则** 返回 `{ code: "SKILL_DEPENDENCY_MISSING", details: ["summarize"] }`
- **并且** 不发起 LLM 调用

### Requirement: 模块级可验收标准（调度器相关）[ADDED]

调度器实现的超时中断与队列溢出行为必须可验证。

#### Scenario: 超时中断可验证 [ADDED]

- **假设** 某技能运行超过 30,000ms
- **当** 到达 timeout
- **则** 调度器中断执行并返回 `SKILL_TIMEOUT`
- **并且** 资源（连接/流）被释放

#### Scenario: 队列溢出被拒绝 [ADDED]

- **假设** 会话队列已满 20 条
- **当** 用户继续触发技能
- **则** 返回 `{ code: "SKILL_QUEUE_OVERFLOW" }`
- **并且** 不影响已有排队任务

## Out of Scope

- 不修改已有内置技能定义与 I/O 结构
- 技能优先级插队（仅 FIFO + 系统重试例外）
- 跨节点分布式调度
