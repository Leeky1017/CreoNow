# IPC Delta — ai-model-catalog-discovery

## [ADDED] Requirement: 动态模型目录查询通道

系统必须提供 `ai:models:list` Request-Response 通道，返回当前生效 provider/proxy 配置下的可用模型目录。

### Scenario: Proxy 模式返回模型目录

- **Given** Proxy 设置已启用且 `baseUrl` 可访问
- **When** 渲染层调用 `ai:models:list`
- **Then** 返回 `{ ok: true, data: { source: "proxy", items: [...] } }`
- **And** `items` 中每项至少包含 `id/name/provider`

### Scenario: 非 Proxy（BYOK）返回模型目录

- **Given** `CREONOW_AI_PROVIDER` + BYOK 配置生效
- **When** 渲染层调用 `ai:models:list`
- **Then** 返回当前 provider 的模型目录
- **And** 若上游失败返回确定性错误码（如 `UPSTREAM_ERROR` / `PERMISSION_DENIED`）

## [MODIFIED] Requirement: Proxy Settings 通道扩展 provider 模式

`ai:proxysettings:get` / `ai:proxysettings:update` 必须支持 provider 模式与分 provider BYOK 配置字段。

### Scenario: Settings 保存 providerMode 并即时生效

- **Given** 用户在设置页切换 provider 模式（openai-compatible/openai-byok/anthropic-byok）
- **When** 调用 `ai:proxysettings:update`
- **Then** 返回包含 `providerMode` 与对应配置状态的最新设置
- **And** 后续 `ai:models:list` 与 `ai:skill:run` 使用该模式

## [MODIFIED] Requirement: `ai:skill:run` 模型字段

`ai:skill:run.request.model` 从固定枚举扩展为字符串，以兼容动态模型 ID。

### Scenario: 面板选择动态模型 ID 仍可通过契约

- **Given** ModelPicker 选择来自 `ai:models:list` 的 `modelId`
- **When** 发起 `ai:skill:run`
- **Then** 契约校验通过并透传到主进程
