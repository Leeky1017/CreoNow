# Context Engine Specification Delta

## Change: issue-509-ai-runtime-identity-tests

### Requirement: 全层 fetcher 异常时仍需返回可消费上下文 [MODIFIED]

Context Engine 在 `rules/settings/retrieved/immediate` 四层 fetcher 均不可用时，必须降级返回可消费的 prompt，而不是抛出异常或中断调用。

降级输出要求：

- 返回体 `prompt` 非空（可为 `(none)` 占位结构）
- `warnings` 至少包含各层不可用原因
- 各层 `tokenCount` 可为 0，但结构必须完整

#### Scenario: CE-DEGRADE-S1 全层异常时继续组装并返回 warnings [ADDED]

- **假设** `rules/settings/retrieved/immediate` 四个 fetcher 全部抛出异常
- **当** 调用 `context:prompt:assemble`
- **则** 返回 `ok=true`，且 `prompt` 非空
- **并且** `warnings` 包含 `KG_UNAVAILABLE`、`SETTINGS_UNAVAILABLE`、`RAG_UNAVAILABLE`、`IMMEDIATE_UNAVAILABLE`
