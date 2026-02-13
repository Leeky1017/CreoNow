# AI Service Specification Delta

## Change: issue-513-p1p2-integration-closeout

### Requirement: 缺失 Provider 凭据错误语义统一 [MODIFIED]

`aiService.runSkill` 在无法解析可用 provider 凭据（尤其缺失 API Key）时，必须返回 `AI_PROVIDER_UNAVAILABLE`，避免同一失败语义在 `AI_NOT_CONFIGURED` 与 `AI_PROVIDER_UNAVAILABLE` 间漂移。

#### Scenario: AIS-ERR-S1 缺失 API Key 返回统一错误码 [ADDED]

- **假设** provider 为非 proxy 且未配置 API Key
- **当** 调用 `runSkill`
- **则** 返回 `ok=false`
- **并且** `error.code = AI_PROVIDER_UNAVAILABLE`

### Requirement: 运行时 LLM 消息组装必须接入多轮历史 [MODIFIED]

运行时 provider 请求消息必须由 `buildLLMMessages` 组装，历史存储由 `chatMessageManager` 维护，满足：

- system + current user 强保留
- 历史按 token budget 从最旧到最新裁剪
- 成功轮次写入 user/assistant 历史

#### Scenario: AIS-HISTORY-S1 运行时请求包含上一轮历史 [ADDED]

- **假设** 同一会话已成功执行至少 1 轮 skill run
- **当** 发起下一轮请求
- **则** provider 请求 messages 包含前序 user/assistant 历史
- **并且** 最后一条仍为当前 user 输入

#### Scenario: AIS-HISTORY-S2 历史按预算裁剪最旧轮次 [ADDED]

- **假设** 同一会话累计历史超过历史 token budget
- **当** 发起新一轮请求
- **则** system 与当前 user 输入仍保留
- **并且** 最旧历史优先被裁掉，仅保留预算内的最近历史
