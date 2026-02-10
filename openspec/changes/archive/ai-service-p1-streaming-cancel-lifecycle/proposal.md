# 提案：ai-service-p1-streaming-cancel-lifecycle

## 背景

主 spec 已定义 `skill:stream:chunk` / `skill:stream:done` 与「停止生成」能力，但缺少生命周期状态机与竞态裁决规则的阶段化落地文档，容易造成取消、完成、网络中断并发下的行为漂移。

## 变更内容

- 固化流式推送协议（chunk/done 的事件序列、字段最小集、错误信号）。
- 定义生成中状态机（`idle -> generating -> done|cancelled|error`）。
- 明确「停止生成」与网络中断重试语义（完整 prompt 重试，非断点续传）。
- 定义取消与完成竞态优先级（取消优先）。

## 受影响模块

- AI Service（流式执行与状态机）
- Skill System（`skill:execute/cancel/stream:*` 协同）
- IPC（Push Notification 协议与响应信封）

## 依赖关系

- 上游依赖：`ai-service-p0-llmproxy-config-security`（配置、重试、限流基线）。
- 下游依赖：
  - `ai-service-p2-panel-chat-apply-flow`
  - `ai-service-p5-failover-quota-hardening`

## Dependency Sync Check

- 结论：`NO_DRIFT`
- 核对项：
  - 数据结构：`executionId`、`traceId`、chunk payload 与 `SkillResult` 对齐 Skill System 主 spec。
  - IPC 契约：Push 通道使用 `skill:stream:chunk`、`skill:stream:done`，命名合法。
  - 错误码：沿用 `LLM_API_ERROR` / `AI_RATE_LIMITED`，取消态不伪装为成功。
  - 阈值：流式 TTFT/chunk 延迟指标不变（AI Service 模块验收标准）。

## Out-of-scope

- 面板聊天持久化。
- Judge 质量评估。

## 审阅状态

- Owner 审阅：`PENDING`
