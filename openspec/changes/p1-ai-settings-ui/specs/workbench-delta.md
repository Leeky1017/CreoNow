# Workbench Specification Delta

## Change: p1-ai-settings-ui

### Requirement: AI 配置设置面板 [ADDED]

设置面板**必须**包含 AI 配置区组件 `AiSettingsSection`，包含：

| 元素 | 类型 | data-testid | 说明 |
|------|------|-------------|------|
| Provider 选择 | `<select>` | `ai-provider-mode` | openai-compatible / openai-byok / anthropic-byok |
| Base URL 输入 | `<input>` | `ai-base-url` | URL 输入框 |
| API Key 输入 | `<input type="password">` | `ai-api-key` | 密码类型，placeholder 显示配置状态 |
| 保存按钮 | `<button>` | `ai-save-btn` | 调用 `ai:config:update` |
| 测试连接按钮 | `<button>` | `ai-test-btn` | 调用 `ai:config:test` |
| 错误显示 | `<span>` | `ai-error` | 错误文案 |
| 测试结果 | `<span>` | `ai-test-result` | 成功/失败状态文案 |

REQ-ID: `REQ-WB-AICONFIG`

### Requirement: 无 API Key 时降级体验 [ADDED]

无可用 API Key 时，AI 面板发送区**应该**显示配置引导文案和跳转链接，而非报错。

REQ-ID: `REQ-WB-AI-DEGRADATION`

#### Scenario: S0 无 API Key 时 placeholder 显示引导文案 [ADDED]

- **假设** mock `ai:config:get` 返回所有 provider 的 `apiKeyConfigured` 均为 `false`
- **当** 渲染 `<AiSettingsSection />`
- **则** API Key 输入框的 placeholder 为 `"未配置"`
- **并且** 页面不显示 `data-testid="ai-error"` 的错误元素（未配置不是错误状态）

#### Scenario: S1 面板渲染所有必要元素 [ADDED]

- **假设** mock `ai:config:get` 返回 `{ ok: true, data: { providerMode: "openai-compatible", openAiCompatibleBaseUrl: "", openAiCompatibleApiKeyConfigured: false, ... } }`
- **当** 渲染 `<AiSettingsSection />`
- **则** 页面包含 `data-testid="ai-provider-mode"` 的 select 元素
- **并且** 页面包含 `data-testid="ai-api-key"` 的 password 输入框
- **并且** 页面包含 `data-testid="ai-base-url"` 的输入框
- **并且** 页面包含 `data-testid="ai-save-btn"` 的保存按钮
- **并且** 页面包含 `data-testid="ai-test-btn"` 的测试连接按钮

#### Scenario: S2 测试连接调用 IPC 并显示成功 [ADDED]

- **假设** 渲染 `<AiSettingsSection />`，初始加载完成
- **并且** mock `ai:config:test` 返回 `{ ok: true, data: { ok: true, latencyMs: 42 } }`
- **当** 用户点击 `data-testid="ai-test-btn"` 按钮
- **则** `ai:config:test` IPC 被调用 1 次
- **并且** 页面显示 `data-testid="ai-test-result"` 元素，内容包含 `"连接成功"` 和 `"42ms"`

#### Scenario: S3 测试连接失败显示错误 [ADDED]

- **假设** mock `ai:config:test` 返回 `{ ok: true, data: { ok: false, latencyMs: 100, error: { code: "AI_AUTH_FAILED", message: "Proxy unauthorized" } } }`
- **当** 用户点击测试连接按钮
- **则** 页面显示 `data-testid="ai-test-result"` 元素，内容包含 `"AI_AUTH_FAILED"`

#### Scenario: S4 保存配置调用 IPC [ADDED]

- **假设** 渲染 `<AiSettingsSection />`，用户选择 provider 为 `"openai-byok"`，输入 Base URL 和 API Key
- **并且** mock `ai:config:update` 返回 `{ ok: true, data: { providerMode: "openai-byok", openAiByokApiKeyConfigured: true, ... } }`
- **当** 用户点击 `data-testid="ai-save-btn"` 按钮
- **则** `ai:config:update` IPC 被调用 1 次
- **并且** 调用参数 patch 包含 `providerMode: "openai-byok"`

#### Scenario: S5 API Key placeholder 显示配置状态 [ADDED]

- **假设** mock `ai:config:get` 返回 `{ ok: true, data: { providerMode: "openai-byok", openAiByokApiKeyConfigured: true, ... } }`
- **当** 渲染 `<AiSettingsSection />`
- **则** API Key 输入框的 placeholder 为 `"已配置"`

#### Scenario: S6 未配置 key 时 placeholder 显示未配置 [ADDED]

- **假设** mock `ai:config:get` 返回 `{ ok: true, data: { providerMode: "openai-byok", openAiByokApiKeyConfigured: false, ... } }`
- **当** 渲染 `<AiSettingsSection />`
- **则** API Key 输入框的 placeholder 为 `"未配置"`
