# Context Engine Delta — context-engine-p1-token-budget-truncation

## [MODIFIED] Requirement: Token 预算管理

系统必须固定预算比例、最小保障与裁剪顺序，并通过预算 IPC 契约提供可审计配置能力。

预算默认值（按总可用输入预算计算）：

| 层级      | 预算比例 | 最小保障 |
| --------- | -------- | -------- |
| Rules     | 15%      | 500      |
| Settings  | 10%      | 200      |
| Retrieved | 25%      | 0        |
| Immediate | 50%      | 2000     |

预算与裁剪规则：

- 裁剪顺序固定为：`Retrieved -> Settings -> Immediate`。
- `Rules` 不可裁剪；若 `Rules` 超过其预算线，仅允许触发警告与降级筛选，不得按通用裁剪链路截断。
- 预算计算必须使用与目标模型一致的 tokenizer（相同 `tokenizerId` 与 `tokenizerVersion`）。

预算 IPC 契约：

- `context:budget:get`
  - 返回：当前预算比例、最小保障、版本号、tokenizer 元数据。
- `context:budget:update`
  - 输入：预算配置 + `version`（乐观锁）。
  - 返回：更新后的预算配置。

失败码：

- `CONTEXT_BUDGET_INVALID_RATIO`
- `CONTEXT_BUDGET_INVALID_MINIMUM`
- `CONTEXT_BUDGET_CONFLICT`
- `CONTEXT_TOKENIZER_MISMATCH`

### Scenario: CE2-R1-S1 总量在预算内时不触发裁剪 [ADDED]

- **假设** 总预算为 6000 tokens，四层总和为 5500 tokens
- **当** Context Engine 执行预算分配与校验
- **则** 四层内容完整注入
- **并且** 返回结果中所有层 `truncated=false`

### Scenario: CE2-R1-S2 超预算时按固定顺序裁剪 [ADDED]

- **假设** 四层总和为 7500 tokens 且 `Rules` 未超自身预算线
- **当** Context Engine 执行裁剪
- **则** 先裁剪 `Retrieved`，再裁剪 `Settings`，最后裁剪 `Immediate`
- **并且** `Rules` 层保持不被通用裁剪链路修改

### Scenario: CE2-R1-S3 预算更新冲突或 tokenizer 不一致时失败 [ADDED]

- **假设** 请求携带旧版本号或错误 tokenizer 元数据
- **当** 调用 `context:budget:update`
- **则** 返回 `CONTEXT_BUDGET_CONFLICT` 或 `CONTEXT_TOKENIZER_MISMATCH`
- **并且** 既有预算配置保持不变

## Out of Scope

- Stable Prefix Hash 的计算与缓存命中策略。
- Constraints 注入策略与约束优先级。
- `context:inspect` 权限模型与调试约束。
