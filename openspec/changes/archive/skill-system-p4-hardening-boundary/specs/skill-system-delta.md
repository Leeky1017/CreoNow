# Skill System Specification Delta

## Change: skill-system-p4-hardening-boundary

### Requirement: 模块级可验收标准 [MODIFIED]

- `skill:execute` 响应 p95 < 120ms。
- 队列入队响应 p95 < 80ms。
- 取消指令生效 p95 < 300ms。
- TypeScript strict + zod，所有 `skill:*` 通道声明 request/response schema。
- 执行超时直接中断返回 `SKILL_TIMEOUT`。
- 可恢复失败允许一键重试（复用原参数）。
- 失败事件广播到 AI 面板和日志。

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

### Requirement: 异常与边界覆盖矩阵 [MODIFIED]

| 类别 | 最低覆盖要求 |
|---|---|
| 网络/IO 失败 | LLM 调用失败、流式通道断开 |
| 数据异常 | 自定义技能 schema 非法、prompt 模板缺失变量 |
| 并发冲突 | 并发取消与完成竞态、同名技能覆盖竞态 |
| 容量溢出 | 队列溢出、单输出超长 |
| 权限/安全 | 跨项目技能读取、未授权技能执行 |

#### Scenario: 同名技能覆盖竞态 [ADDED]

- **假设** 全局与项目级同时更新同名技能
- **当** 用户触发执行
- **则** 按 `project > global > builtin` 一致性解析
- **并且** 返回 `resolvedScope=project`

#### Scenario: 跨项目技能越权访问阻断 [ADDED]

- **假设** 项目 A 的技能 ID 被项目 B 请求执行
- **当** 主进程校验 `projectId`
- **则** 返回 `SKILL_SCOPE_VIOLATION`
- **并且** 写入安全审计日志

### Non-Functional Requirements [MODIFIED]

#### Scenario: 全局并发上限保护 [ADDED]

- **假设** 同时有 20 个会话请求执行技能
- **当** 系统达到并发上限 8
- **则** 其余请求进入待执行队列
- **并且** 无请求被静默丢弃

#### Scenario: 自定义技能容量超限 [ADDED]

- **假设** 当前项目已有 500 个自定义技能
- **当** 用户尝试再创建 1 个
- **则** 返回 `{ code: "SKILL_CAPACITY_EXCEEDED" }`
- **并且** 提示清理不再使用的技能

## Out of Scope

- 不新增功能特性
- 不修改已通过的外部行为契约
