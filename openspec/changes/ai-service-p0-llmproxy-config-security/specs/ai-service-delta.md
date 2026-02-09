# AI Service Specification Delta

## Change: ai-service-p0-llmproxy-config-security

### Requirement: LLM 代理调用 [MODIFIED]

系统必须在 P0 阶段先落地 `LLMProxy` 配置与安全基线，确保后续流式、面板与降级能力建立在可验证的配置契约之上。

- `LLMProxy` 必须抽象 provider 适配层，支持按配置切换 OpenAI 兼容 API 与 Anthropic API。
- `ai:config:get`、`ai:config:update`、`ai:config:test` 必须返回结构化 `ok: true | false` 响应。
- `apiKey` 必须仅通过 Electron `safeStorage` 加密存储，禁止明文持久化。
- 网络类错误必须应用指数退避（1s→2s→4s，最多 3 次）；超限必须返回可判定错误码。
- 默认速率限制基线为 60 req/min，超限返回 `AI_RATE_LIMITED`。

#### Scenario: 配置更新与加密存储闭环 [ADDED]

- **假设** 用户在设置中选择 provider 并输入 API Key
- **当** 渲染层调用 `ai:config:update`
- **则** 主进程仅保存加密后的 API Key（safeStorage）
- **并且** `ai:config:get` 返回脱敏配置（不回传明文 Key）

#### Scenario: 配置测试失败返回可判定错误码 [ADDED]

- **假设** 用户输入已失效 API Key 并点击「测试连接」
- **当** 主进程调用 `ai:config:test`
- **则** 返回 `{ ok: false, error: { code: "AI_AUTH_FAILED" } }`
- **并且** 不触发同 key 的重试风暴

#### Scenario: LLM 请求触发重试与限流基线 [ADDED]

- **假设** 请求在 1 分钟内达到 60 次且出现网络抖动
- **当** 新请求进入 `LLMProxy`
- **则** 网络失败按 1s/2s/4s 退避重试，最多 3 次
- **并且** 超过速率上限时立即返回 `AI_RATE_LIMITED`
