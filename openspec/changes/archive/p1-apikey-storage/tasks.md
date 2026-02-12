## 1. Specification

- [x] 1.1 审阅并确认需求边界：`AiProxySettingsService` 提供 `get`/`getRaw`/`update`/`test` 四个操作；三种 provider 模式独立 baseUrl + apiKey；公开接口不返回明文 key
- [x] 1.2 审阅并确认错误路径与边界路径：空 key trim 后过滤为 null；加密不可用返回 UNSUPPORTED；空 patch 返回 INVALID_ARGUMENT；测试连接超时返回 TIMEOUT
- [x] 1.3 审阅并确认验收阈值与不可变契约：API Key 禁止明文存储到 SQLite；加密前缀 `__safe_storage_v1__:`；测试连接超时 2000ms
- [x] 1.4 无上游依赖，依赖同步检查（Dependency Sync Check）结论：`N/A`

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [x] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → Test 映射

| Scenario ID | 测试文件                                                    | 测试用例名                                                | 断言要点                                                                          |
| ----------- | ----------------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------- |
| S1          | `apps/desktop/main/src/ipc/__tests__/ai-config-ipc.test.ts` | `should store and retrieve provider config`               | `data.providerMode === "openai-byok"`, `data.openAiByokApiKeyConfigured === true` |
| S2          | `apps/desktop/main/src/ipc/__tests__/ai-config-ipc.test.ts` | `should return apiKeyConfigured false when no key stored` | `data.openAiByokApiKeyConfigured === false`                                       |
| S3          | `apps/desktop/main/src/ipc/__tests__/ai-config-ipc.test.ts` | `should store different provider keys independently`      | 两个 provider 的 apiKeyConfigured 均为 true                                       |
| S4          | `apps/desktop/main/src/ipc/__tests__/ai-config-ipc.test.ts` | `should reject empty api key`                             | raw 数据中 apiKey 为 null                                                         |
| S5          | `apps/desktop/main/src/ipc/__tests__/ai-config-ipc.test.ts` | `should return UNSUPPORTED when encryption unavailable`   | `error.code === "UNSUPPORTED"`                                                    |
| S6          | `apps/desktop/main/src/ipc/__tests__/ai-config-ipc.test.ts` | `should return ok true when test connection succeeds`     | `data.ok === true`, `typeof data.latencyMs === "number"`                          |
| S7          | `apps/desktop/main/src/ipc/__tests__/ai-config-ipc.test.ts` | `should return AI_AUTH_FAILED on 401`                     | `data.error.code === "AI_AUTH_FAILED"`                                            |

## 3. Red（先写失败测试）

- [x] 3.1 先扩展 `apps/desktop/main/src/ipc/__tests__/ai-config-ipc.test.ts` 为 S1-S7 场景矩阵与边界用例（含缺失 patch）
- [x] 3.2 执行 Red：
  - Command: `pnpm exec tsx apps/desktop/main/src/ipc/__tests__/ai-config-ipc.test.ts`
  - 失败摘要：`[Boundary should return INVALID_ARGUMENT when patch is missing] Cannot convert undefined or null to object`
  - 结论：`ai:config:update` 在 payload 缺少 `patch` 时发生运行时异常，Red 成立

```
/home/leeky/work/CreoNow/.worktrees/issue-470-p1-apikey-storage/apps/desktop/main/src/ipc/__tests__/ai-config-ipc.test.ts:136
Error: [Boundary should return INVALID_ARGUMENT when patch is missing] Cannot convert undefined or null to object
```

## 4. Green（最小实现通过）

- [x] 4.1 最小修复 `apps/desktop/main/src/ipc/aiProxy.ts`：
  - 新增 `normalizeProxySettingsPatch(payload)` 归一化函数
  - `ai:config:update` handler 改为接收 `unknown` payload，并将非法 payload 归一为 `{}` 交给 service 返回 `INVALID_ARGUMENT`
- [x] 4.2 重新执行目标测试：
  - `pnpm exec tsx apps/desktop/main/src/ipc/__tests__/ai-config-ipc.test.ts` ✅
  - `pnpm exec tsx apps/desktop/main/src/services/ai/__tests__/llm-proxy-config.test.ts` ✅

## 5. Refactor（保持绿灯）

- [x] 5.1 保持单一职责：IPC 层仅做 payload 边界归一，错误码仍由 service 层统一输出
- [x] 5.2 测试重构为场景化矩阵（S1-S7），并通过内存 DB mock 避免 native 依赖漂移
- [x] 5.3 保持契约稳定：`ai:config:get|update|test` 通道名与响应 envelope 未变

## 6. Evidence

- [x] 6.1 OPEN Issue：`#470`
- [x] 6.2 Rulebook task：`rulebook/tasks/issue-470-p1-apikey-storage`（validate 通过）
- [x] 6.3 RUN_LOG：`openspec/_ops/task_runs/ISSUE-470.md`（记录命令与关键信息）
- [x] 6.4 变更完成后归档到 `openspec/changes/archive/p1-apikey-storage`
