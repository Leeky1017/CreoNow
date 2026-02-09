# Context Engine Delta — context-engine-p0-layer-assembly-api

## [MODIFIED] Requirement: 四层上下文架构

系统必须将四层上下文输出统一为可验证契约，并固定组装顺序为 `Rules -> Settings -> Retrieved -> Immediate`。

四层统一数据契约（所有层必填）：

- `layer`: `rules | settings | retrieved | immediate`
- `content`: `string`
- `source`: `string[]`（来源标识，如 `kg:entities`、`memory:semantic`、`rag:retrieve`、`editor:cursor-window`）
- `tokenCount`: `number`
- `truncated`: `boolean`
- `warnings?`: `string[]`

约束：

- 任一层输出缺失 `source` 或 `tokenCount` 视为契约失败。
- 组装时某层数据源不可用，必须降级继续并将原因写入 `warnings`。
- 降级不得阻断 `context:prompt:assemble` 的成功返回（除非发生不可恢复输入错误）。

### Scenario: CE1-R1-S1 四层契约完整组装 [ADDED]

- **假设** 项目具备 KG、语义记忆、RAG 与当前文档上下文
- **当** Context Engine 执行层级组装
- **则** 返回的 `layers.rules/settings/retrieved/immediate` 均包含 `source` 与 `tokenCount`
- **并且** `assemblyOrder` 固定为 `rules -> settings -> retrieved -> immediate`

### Scenario: CE1-R1-S2 单层数据源不可用时降级组装 [ADDED]

- **假设** KG 服务暂时不可用
- **当** Context Engine 组装 Rules 层
- **则** Rules 层仅保留可用来源数据并继续组装
- **并且** `warnings` 包含 `KG_UNAVAILABLE`

## [MODIFIED] Requirement: 上下文组装 API

`context:prompt:assemble` 与 `context:prompt:inspect` 必须返回统一结构，确保 AI Service 与调试端可消费。

`context:prompt:assemble` 响应新增/固化字段：

- `prompt: string`
- `tokenCount: number`
- `stablePrefixHash: string`
- `stablePrefixUnchanged: boolean`
- `warnings: string[]`
- `layers`：四层对象，且每层至少包含 `source`、`tokenCount`、`truncated`

`context:prompt:inspect` 响应固化字段：

- `layersDetail`: 四层明细（含 `content`、`source`、`tokenCount`、`truncated`）
- `totals`: `{ tokenCount, warningsCount }`
- `inspectMeta`: `{ debugMode, requestedBy, requestedAt }`

### Scenario: CE1-R2-S1 context:prompt:assemble 返回结构可直接消费 [ADDED]

- **假设** AI Service 发起一次续写请求
- **当** 调用 `context:prompt:assemble`
- **则** 返回结构包含 `prompt/tokenCount/stablePrefixHash/stablePrefixUnchanged/warnings`
- **并且** 四层返回均包含 `source` 与 `tokenCount`

### Scenario: CE1-R2-S2 context:prompt:inspect 返回调试明细且不注入 prompt [ADDED]

- **假设** 调试模式下请求上下文明细
- **当** 调用 `context:prompt:inspect`
- **则** 返回四层明细与 token 分布
- **并且** 返回体不包含最终拼接 `prompt`

## Out of Scope

- Token 预算比例、最小保障与裁剪顺序定义。
- Stable Prefix Hash 的确定性策略与 cache 命中/失效规则。
- Constraints CRUD 与约束注入优先级。
- 性能、容量、并发、安全硬化指标。
