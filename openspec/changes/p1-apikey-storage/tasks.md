## 1. Specification

- [ ] 1.1 审阅并确认需求边界：`AiProxySettingsService` 提供 `get`/`getRaw`/`update`/`test` 四个操作；三种 provider 模式独立 baseUrl + apiKey；公开接口不返回明文 key
- [ ] 1.2 审阅并确认错误路径与边界路径：空 key trim 后过滤为 null；加密不可用返回 UNSUPPORTED；空 patch 返回 INVALID_ARGUMENT；测试连接超时返回 TIMEOUT
- [ ] 1.3 审阅并确认验收阈值与不可变契约：API Key 禁止明文存储到 SQLite；加密前缀 `__safe_storage_v1__:`；测试连接超时 2000ms
- [ ] 1.4 无上游依赖，标注 N/A

## 2. TDD Mapping（先测前提）

- [ ] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [ ] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [ ] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → Test 映射

| Scenario ID | 测试文件 | 测试用例名 | 断言要点 |
|-------------|---------|-----------|----------|
| S1 | `apps/desktop/main/src/ipc/__tests__/ai-config-ipc.test.ts` | `should store and retrieve provider config` | `data.providerMode === "openai-byok"`, `data.openAiByokApiKeyConfigured === true` |
| S2 | `apps/desktop/main/src/ipc/__tests__/ai-config-ipc.test.ts` | `should return apiKeyConfigured false when no key stored` | `data.openAiByokApiKeyConfigured === false` |
| S3 | `apps/desktop/main/src/ipc/__tests__/ai-config-ipc.test.ts` | `should store different provider keys independently` | 两个 provider 的 apiKeyConfigured 均为 true |
| S4 | `apps/desktop/main/src/ipc/__tests__/ai-config-ipc.test.ts` | `should reject empty api key` | raw 数据中 apiKey 为 null |
| S5 | `apps/desktop/main/src/ipc/__tests__/ai-config-ipc.test.ts` | `should return UNSUPPORTED when encryption unavailable` | `error.code === "UNSUPPORTED"` |
| S6 | `apps/desktop/main/src/ipc/__tests__/ai-config-ipc.test.ts` | `should return ok true when test connection succeeds` | `data.ok === true`, `typeof data.latencyMs === "number"` |
| S7 | `apps/desktop/main/src/ipc/__tests__/ai-config-ipc.test.ts` | `should return AI_AUTH_FAILED on 401` | `data.error.code === "AI_AUTH_FAILED"` |

## 3. Red（先写失败测试）

<!-- Codex 填写 -->

## 4. Green（最小实现通过）

<!-- Codex 填写 -->

## 5. Refactor（保持绿灯）

<!-- Codex 填写 -->

## 6. Evidence

<!-- Codex 填写 -->
