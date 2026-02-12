# 提案：p1-apikey-storage

## 背景

后端有 provider 配置逻辑（OpenAI / Anthropic），但 API Key 存储缺乏安全保障。用户完全无法通过 UI 配置 AI 提供商，意味着 AI 功能从安装到首次使用之间存在不可跨越的断层。

需要实现 API Key 的加密存储（通过 `SecretStorageAdapter` 封装 Electron `safeStorage`），并注册对应的 IPC 通道供渲染进程调用。

审计来源：`docs/audit/06-onboarding-ux-config.md` §3.1

不改的风险：用户无法配置 AI 提供商，AI 功能完全不可用。

## 变更内容

- 创建 `apps/desktop/main/src/services/ai/aiProxySettingsService.ts`，导出 `createAiProxySettingsService()` 工厂函数
- API Key 通过 `SecretStorageAdapter`（封装 Electron `safeStorage`）加密后存储到 SQLite
- 支持三种 provider 模式：`openai-compatible`（代理）、`openai-byok`（OpenAI 直连）、`anthropic-byok`（Anthropic 直连）
- 每种模式独立存储 baseUrl 和 apiKey
- IPC 通道：
  - `ai:config:get` → 获取配置（不返回明文 key，仅返回 `apiKeyConfigured: boolean`）
  - `ai:config:update` → 更新配置（含加密存储 API Key）
  - `ai:config:test` → 测试连接（GET `/v1/models`，返回 `{ok, latencyMs, error?}`）
- 空 key 拒绝存储（`normalizeApiKey` trim 后为空返回 null）
- 加密不可用时返回 `UNSUPPORTED` 错误码

## 受影响模块

- workbench delta：`openspec/changes/p1-apikey-storage/specs/workbench-delta.md`
- 实现文件：`apps/desktop/main/src/services/ai/aiProxySettingsService.ts`、`apps/desktop/main/src/ipc/aiProxy.ts`

## 不做什么

- 不实现前端 UI（由 C7 负责）
- 不实现 provider 降级切换逻辑（已在 `aiService.ts` 中独立实现）
- 不实现 Onboarding 引导流程（Phase 6）

## 依赖关系

- 上游依赖：无
- 下游依赖：`p1-ai-settings-ui`（C7 使用本服务的 IPC 通道）

## Dependency Sync Check

- 核对输入：无上游依赖，N/A
- 结论：`N/A`

## Codex 实现指引

- 目标文件路径：
  - 服务：`apps/desktop/main/src/services/ai/aiProxySettingsService.ts`
  - IPC 注册：`apps/desktop/main/src/ipc/aiProxy.ts`
- 测试文件路径：`apps/desktop/main/src/ipc/__tests__/ai-config-ipc.test.ts`
- 验证命令：`pnpm vitest run apps/desktop/main/src/ipc/__tests__/ai-config-ipc.test.ts`
- Mock 要求：
  - 必须 mock `SecretStorageAdapter`（`isEncryptionAvailable`/`encryptString`/`decryptString`），禁止依赖真实 Electron `safeStorage`
  - 必须 mock `better-sqlite3` 数据库或使用内存 SQLite
  - 测试连接需 mock `fetch`

## 审阅状态

- Owner 审阅：`PENDING`
