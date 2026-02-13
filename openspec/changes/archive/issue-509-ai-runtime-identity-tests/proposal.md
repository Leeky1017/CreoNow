# 提案：issue-509-ai-runtime-identity-tests

## 背景

在 P1+P2 集成复核中，已确认 `assembleSystemPrompt` 与 `GLOBAL_IDENTITY_PROMPT` 尚未进入 `aiService.runSkill` 的真实 LLM 请求组装路径。该缺口会导致运行时 system prompt 丢失 identity 层，影响技能行为一致性。与此同时，stream timeout done 收敛与全层 fetcher 降级行为虽已人工验证，但缺少自动化回归门禁。

## 变更内容

- 在 `aiService` 运行时请求组装中接入 `assembleSystemPrompt`，将 identity/rules/skill/mode/memory/context 层统一拼接后发送到 provider。
- 新增回归测试：
  - stream 路径 timeout 必须通过 `skill:stream:done` 收敛为 `SKILL_TIMEOUT`
  - Context Engine 在全层 fetcher 异常时仍返回可用 prompt 与 warnings

## 受影响模块

- ai-service — 运行时 system prompt 组装路径与流式终态回归测试
- context-engine — 全层降级回退行为回归测试

## 不做什么

- 不改动 provider failover/quota 策略
- 不引入多轮对话历史拼接（`buildLLMMessages` 主链路接入另立变更）
- 不调整现有 API Key 缺失错误码语义（本次仅记录现状并加测试）

## 审阅状态

- Owner 审阅：`PENDING`
