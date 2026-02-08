# AI Service Delta — ai-model-catalog-discovery

## [ADDED] Requirement: 模型目录发现能力

AI Service 必须支持按当前运行配置发现上游模型目录，并返回可用于 UI 选择的标准化列表。

### Scenario: OpenAI-compatible 目录解析

- **Given** 上游 `GET /v1/models` 返回 OpenAI-compatible 响应
- **When** AI Service 执行模型目录查询
- **Then** 返回去重且可展示的模型项
- **And** 保留 provider 展示信息

### Scenario: 模型目录查询失败映射

- **Given** 上游返回 401/403/429/5xx
- **When** 执行模型目录查询
- **Then** AI Service 按统一错误码映射返回失败

### Scenario: 非 JSON 上游响应返回确定性错误

- **Given** 上游返回 `text/html` 或非法 JSON
- **When** 执行模型目录查询或技能运行
- **Then** 返回确定性错误 `{ code: "UPSTREAM_ERROR", message: "Non-JSON upstream response" }`
- **And** 不泄漏上游 HTML 原文

### Scenario: 带路径前缀的 baseUrl 可正确拼接端点

- **Given** `baseUrl` 为 `https://example.com/api/v1`
- **When** AI Service 请求模型目录或执行技能
- **Then** 请求路径保留 `/api/v1` 前缀
- **And** 不出现路径截断或重复根路径

## [ADDED] Requirement: Provider 模式与 BYOK 生效

AI Service 必须根据设置页选择的 provider 模式生效对应上游与鉴权：

- `openai-compatible`（代理）
- `openai-byok`
- `anthropic-byok`

### Scenario: OpenAI BYOK 使用独立配置

- **Given** provider 模式为 `openai-byok`
- **When** 执行模型目录查询或技能运行
- **Then** 使用 OpenAI BYOK 的 `baseUrl/apiKey`
- **And** 不读取 OpenAI-compatible 代理开关

### Scenario: Anthropic BYOK 使用独立配置

- **Given** provider 模式为 `anthropic-byok`
- **When** 执行模型目录查询或技能运行
- **Then** 使用 Anthropic BYOK 的 `baseUrl/apiKey`
- **And** 请求包含 Anthropic 必需头

## [ADDED] Requirement: AI 面板模型选择器可发现性

AI 面板 ModelPicker 必须提升可发现性并支持高密度模型列表导航。

### Scenario: 模型选择器支持搜索与分组

- **Given** 模型列表包含多个 provider 与大量模型
- **When** 用户打开 ModelPicker
- **Then** 可按关键字搜索
- **And** 可切换分组视图（按 provider）

### Scenario: 模型选择器支持最近使用

- **Given** 用户已选择过多个模型
- **When** 再次打开 ModelPicker
- **Then** 顶部展示 Recently Used 分组
- **And** 最近使用项优先于普通列表展示

## [MODIFIED] Requirement: 模型参数透传

`runSkill` 的 `model` 参数改为字符串，保持“UI 选择值即请求值”的透传语义。

### Scenario: 动态模型透传

- **Given** 用户选择非静态内建模型 ID（如网关新增模型）
- **When** 触发技能运行
- **Then** 上游请求 body 的 `model` 字段使用该 ID
