# 提案：ai-service-p0-llmproxy-config-security

## 背景

`AI Service` 主 spec 已定义 `LLMProxy`、多 provider 与安全存储要求，但当前缺少可执行的分阶段落地边界，尤其是 `ai:config:get/update/test` 契约细节、错误码映射、重试退避与速率限制基线未形成可追踪 change。

## 变更内容

- 固化 `LLMProxy` 抽象的最小接口与 provider 切换语义（OpenAI 兼容 / Anthropic）。
- 细化 `ai:config:get`、`ai:config:update`、`ai:config:test` 的请求/响应与失败路径。
- 明确 API Key 使用 Electron `safeStorage` 加密存储，不允许明文落盘。
- 将网络重试（1s/2s/4s，最多 3 次）与默认速率限制（60 req/min）写入 delta 作为 P0 基线。

## 受影响模块

- AI Service（`openspec/specs/ai-service/spec.md`）
- IPC（`openspec/specs/ipc/spec.md`）
- Workbench 设置入口（AI 配置页跳转）

## 依赖关系

- 上游依赖：无活跃 change 前置；依赖主 spec 的既有约束（AI Service / IPC / Workbench）。
- 下游依赖：
  - `ai-service-p1-streaming-cancel-lifecycle`
  - `ai-service-p5-failover-quota-hardening`

## Dependency Sync Check

- 结论：`NO_DRIFT`
- 核对项：
  - 数据结构：`LLMProxy` 配置字段（provider/model/apiKey/baseUrl/maxTokens/temperature）与主 spec 一致。
  - IPC 契约：`ai:config:get|update|test` 命名符合 `<domain>:<resource>:<action>`。
  - 错误码：延用 `AI_NOT_CONFIGURED`、`AI_AUTH_FAILED`、`LLM_API_ERROR`，无冲突新增。
  - 阈值：重试 3 次（1s/2s/4s）、速率限制 60 req/min 与主 spec 一致。

## Out-of-scope

- 流式 UI 与停止生成状态机。
- Judge 评估流程。
- 候选方案与使用统计。

## 审阅状态

- Owner 审阅：`PENDING`
