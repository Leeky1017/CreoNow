# ai-service Specification Delta

## Change: aud-m1-ai-runtime-config-centralization

### Requirement: AI runtime quotas 必须集中由 runtime governance 配置驱动（Wave0 / M1）[ADDED]

系统必须将 AI runtime 的关键 quotas（限流/容量）从受控的 `runtimeGovernance` 配置读取，避免硬编码漂移。至少满足：

- AI runtime 配置必须通过 `resolveRuntimeGovernanceFromEnv` 等统一入口解析。
- IPC/服务层读取 quotas 必须来自 `runtimeGovernance.ai.*` 字段。
- 禁止保留硬编码常量作为真实生效来源。

#### Scenario: AIS-AUD-M1-S1 quotas 引用必须集中到 runtimeGovernance.ai.\* 且移除硬编码常量 [ADDED]

- **假设** 检查 AI IPC 层源码（例如 `apps/desktop/main/src/ipc/ai.ts`）
- **当** 查找 stream rate limit 与 chat capacity 的来源
- **则** 必须读取 `runtimeGovernance.ai.streamRateLimitPerSecond` 与 `runtimeGovernance.ai.chatMessageCapacity`
- **并且** 不得存在硬编码常量 `AI_STREAM_RATE_LIMIT_PER_SECOND` / `AI_CHAT_MESSAGE_CAPACITY`
