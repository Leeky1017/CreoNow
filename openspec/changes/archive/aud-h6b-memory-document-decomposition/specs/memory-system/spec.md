# memory-system Specification Delta

## Change: aud-h6b-memory-document-decomposition

### Requirement: 情景记忆服务拆分为可测试 helper 模块（Wave3 / H6B）[ADDED]

系统必须将 `episodicMemoryService` 中的纯函数逻辑拆分并沉降为独立 helper 模块，以缩小服务文件体积、降低耦合并提供可回归测试入口。

拆分后的 helper 模块必须满足：

- 导出稳定的 API（至少包含：`calculateDecayScore`、`classifyDecayLevel`、`resolveImplicitFeedback`、`assembleMemoryLayers`、`IMPLICIT_SIGNAL_WEIGHTS`）。
- helper 的输出在固定输入下必须确定性（不依赖真实时间、随机数、网络）。
- 拆分必须保持外部行为语义不漂移（仅限内部组织形态变化）。

#### Scenario: MS-AUD-H6B-S1 衰减分数与分级在固定输入下稳定 [ADDED]

- **假设** 给定固定的 `ageInDays/recallCount/importance`
- **当** 计算衰减分数并判定分级
- **则** `calculateDecayScore` 返回稳定分数（在可预期范围内）
- **并且** `classifyDecayLevel(score)` 返回稳定分级（例如 `to_compress`）

#### Scenario: MS-AUD-H6B-S2 隐式反馈信号映射确定且可回归 [ADDED]

- **假设** 发生“接受后撤销”等已定义的隐式反馈行为
- **当** 调用 `resolveImplicitFeedback`
- **则** 返回的 `signal` 与 `weight` 必须与 `IMPLICIT_SIGNAL_WEIGHTS` 一致
- **并且** 相同输入必定产生相同输出

#### Scenario: MS-AUD-H6B-S3 memory 降级态的 layer 组装可验证 [ADDED]

- **假设** `memoryDegraded=true` 且提供 `fallbackRules`
- **当** 调用 `assembleMemoryLayers`
- **则** 结果中 `settings.memoryDegraded=true`
- **并且** `settings.fallbackRules` 必须等于输入的 `fallbackRules`
