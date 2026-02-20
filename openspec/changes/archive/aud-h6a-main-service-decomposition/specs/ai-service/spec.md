# ai-service Specification Delta

## Change: aud-h6a-main-service-decomposition

### Requirement: AI payload parser helpers 必须被拆分为可回归的纯函数模块（Wave2 / H6A）[ADDED]

系统必须将 AI Service 的 payload 解析与提取逻辑从 `aiService.ts` 中拆分为独立 helper 模块，满足：

- helper API 稳定且可被直接单元测试回归（无需构造 service/IPC harness）。
- 对“输入 shape 不符合预期”的情况必须确定性收敛（返回 `null`/空数组），不得抛异常导致 silent crash。
- 行为等价：拆分仅改变组织形态，不改变对外语义与结果。

拆分后的 helper 模块必须至少提供以下能力（名称以实现为准）：

- OpenAI-compatible：`extractOpenAiText` / `extractOpenAiDelta` / `extractOpenAiContentText`
- Anthropic：`extractAnthropicText` / `extractAnthropicDelta`
- Model catalog：`extractOpenAiModels`（去重 + 稳定排序）
- UI 展示：`providerDisplayName`

#### Scenario: AIS-AUD-H6A-S1 helper 行为等价且在固定输入下确定 [ADDED]

- **假设** 给定固定的 OpenAI-compatible `content`（string / array parts / nested content）与 streaming `delta` 输入
- **当** 调用 `extractOpenAiContentText` / `extractOpenAiText` / `extractOpenAiDelta`
- **则** 返回的文本必须可预测且可验证（例如 parts 拼接为稳定字符串）
- **并且** 输入不符合预期 shape 时返回 `null`（而非抛异常）

- **假设** 给定固定的 Anthropic `content[]` 与 streaming `delta` 输入
- **当** 调用 `extractAnthropicText` / `extractAnthropicDelta`
- **则** 返回文本必须确定性

- **假设** 给定 OpenAI-compatible `/v1/models` 响应（包含重复 `id` 与 `name/display_name` 混合字段）
- **当** 调用 `extractOpenAiModels`
- **则** 返回结果必须对 `id` 去重，并按展示名稳定排序

- **假设** provider 分别为 `proxy/openai/anthropic`
- **当** 调用 `providerDisplayName`
- **则** 返回展示名必须稳定映射（`Proxy/OpenAI/Anthropic`）
