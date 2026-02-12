# Workbench Specification Delta

## Change: p1-apikey-storage

### Requirement: API Key 加密存储与配置管理 [ADDED]

API Key **必须**通过 `SecretStorageAdapter`（封装 Electron `safeStorage` API）加密存储到 SQLite，**禁止**明文存储。

支持的 provider 模式：

| 模式 | 值 | 说明 |
|------|-----|------|
| OpenAI 兼容代理 | `"openai-compatible"` | 自建/第三方代理，需 baseUrl |
| OpenAI 直连 | `"openai-byok"` | 用户自有 OpenAI API Key |
| Anthropic 直连 | `"anthropic-byok"` | 用户自有 Anthropic API Key |

每种模式独立存储 `baseUrl` 和 `apiKey`。

IPC 通道：

| IPC 通道 | 通信模式 | 方向 | 用途 |
|----------|---------|------|------|
| `ai:config:get` | Request-Response | Renderer → Main | 获取 AI 配置（不返回明文 key） |
| `ai:config:update` | Request-Response | Renderer → Main | 更新 AI 配置（含加密存储 key） |
| `ai:config:test` | Request-Response | Renderer → Main | 测试连接有效性 |

`ai:config:get` 返回的公开数据结构：
```typescript
type AiProxySettings = {
  enabled: boolean;
  baseUrl: string;
  apiKeyConfigured: boolean;        // 仅告知是否已配置，不返回明文
  providerMode: "openai-compatible" | "openai-byok" | "anthropic-byok";
  openAiCompatibleBaseUrl: string;
  openAiCompatibleApiKeyConfigured: boolean;
  openAiByokBaseUrl: string;
  openAiByokApiKeyConfigured: boolean;
  anthropicByokBaseUrl: string;
  anthropicByokApiKeyConfigured: boolean;
};
```

REQ-ID: `REQ-WB-KEYSAFE`

#### Scenario: S1 存储并读取配置 [ADDED]

- **假设** 调用 `update({ patch: { providerMode: "openai-byok", openAiByokBaseUrl: "https://api.openai.com", openAiByokApiKey: "sk-test-abc123" } })`
- **当** 然后调用 `get()`
- **则** 返回 `{ ok: true, data }` 且 `data.providerMode === "openai-byok"`
- **并且** `data.openAiByokBaseUrl === "https://api.openai.com"`
- **并且** `data.openAiByokApiKeyConfigured === true`（不返回明文 key）

#### Scenario: S2 未存储时 apiKeyConfigured 为 false [ADDED]

- **假设** 未执行任何 `update` 操作
- **当** 调用 `get()`
- **则** 返回 `{ ok: true, data }` 且 `data.openAiByokApiKeyConfigured === false`
- **并且** `data.anthropicByokApiKeyConfigured === false`

#### Scenario: S3 不同 provider 模式独立存储 [ADDED]

- **假设** 执行 `update({ patch: { providerMode: "openai-byok", openAiByokApiKey: "sk-openai" } })`
- **并且** 执行 `update({ patch: { providerMode: "anthropic-byok", anthropicByokApiKey: "sk-anthropic" } })`
- **当** 调用 `get()`
- **则** `data.openAiByokApiKeyConfigured === true`
- **并且** `data.anthropicByokApiKeyConfigured === true`

#### Scenario: S4 空 key 拒绝存储 [ADDED]

- **假设** 调用 `update({ patch: { openAiByokApiKey: "" } })`
- **当** 读取内部 raw 数据
- **则** `openAiByokApiKey` 为 `null`（空字符串被 `normalizeApiKey` 过滤）

#### Scenario: S5 加密不可用时返回错误 [ADDED]

- **假设** `SecretStorageAdapter.isEncryptionAvailable()` 返回 `false`
- **当** 调用 `update({ patch: { openAiByokApiKey: "sk-test" } })`
- **则** 返回 `{ ok: false, error: { code: "UNSUPPORTED", message: "safeStorage is required to persist API key securely" } }`

#### Scenario: S6 测试连接成功 [ADDED]

- **假设** provider 配置了有效的 baseUrl 和 apiKey，`GET /v1/models` 返回 200
- **当** 调用 `test()`
- **则** 返回 `{ ok: true, data: { ok: true, latencyMs: <number> } }`

#### Scenario: S7 测试连接失败——认证错误 [ADDED]

- **假设** `GET /v1/models` 返回 401
- **当** 调用 `test()`
- **则** 返回 `{ ok: true, data: { ok: false, latencyMs: <number>, error: { code: "AI_AUTH_FAILED" } } }`
