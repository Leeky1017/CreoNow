# 提案：ai-service-p5-failover-quota-hardening

## 背景

`AI Service` 在主 spec 中已经定义 provider 降级、额度保护、模块验收阈值与异常矩阵，但这些条目分散在多个 Requirement。需要单一收口 change 统一硬化：主备切换审计连续性、会话预算与速率保护、全 provider 异常降级态和 NFR 并发/容量场景。

## 变更内容

- 固化主备切换、half-open 探测、同 `traceId` 审计连续性。
- 固化会话 token 上限与请求速率限制的阻断语义。
- 补齐全 provider 不可用时的可用降级态与错误码。
- 将异常矩阵与 NFR 场景（同会话并发入队、消息容量上限）绑定到可测条目。
- 锁定关键错误码：
  - `AI_PROVIDER_UNAVAILABLE`
  - `AI_SESSION_TOKEN_BUDGET_EXCEEDED`
  - `AI_RATE_LIMITED`
  - `AI_AUTH_FAILED`

## 受影响模块

- AI Service（provider 健康管理、预算/限流、异常矩阵）
- IPC（统一错误码返回）
- Skill System（同会话并发入队行为）

## 依赖关系

- 上游依赖：
  - `ai-service-p0-llmproxy-config-security`
  - `ai-service-p1-streaming-cancel-lifecycle`
  - `ai-service-p3-judge-quality-pipeline`
  - `ai-service-p4-candidates-usage-stats`
- 下游依赖：无（AI 服务阶段收口 change）。

## Dependency Sync Check

- 结论：`NO_DRIFT`
- 核对项：
  - 数据结构：provider 状态（healthy/degraded/half-open）、traceId、会话 token 计数一致。
  - IPC 契约：错误响应继续使用 `{ ok: false, error: { code, message } }`。
  - 错误码：四个硬化错误码与主 spec/IPC 字典无重名冲突。
  - 阈值：`maxTokens<=4096`、会话上限 `200000`、`60 req/min` 与主 spec 一致。

## Out-of-scope

- UI 视觉重设计。
- 新增 provider 类型。

## 审阅状态

- Owner 审阅：`PENDING`
