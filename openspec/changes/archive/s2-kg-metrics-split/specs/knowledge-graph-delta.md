# Knowledge Graph Specification Delta

## Change: s2-kg-metrics-split

### Requirement: KG 识别任务指标必须拆分成功/失败/完成计数 [MODIFIED]

KG 识别运行时指标必须同时维护 `succeeded`、`failed`、`completed` 三个计数器，并满足以下可验证约束：

- 任务成功时：`succeeded += 1` 且 `completed += 1`。
- 任务失败时：`failed += 1`，`completed` 不增加。
- 任一任务结束后，计数更新只发生一次，避免重复累加。

#### Scenario: 识别任务成功时更新 succeeded 与 completed [ADDED]

- **假设** 一个识别任务在执行周期内正常完成
- **当** 运行时写入任务指标
- **则** `succeeded` 增加 1
- **并且** `completed` 增加 1
- **并且** `failed` 保持不变

#### Scenario: 识别任务失败时仅更新 failed [ADDED]

- **假设** 一个识别任务在执行周期内抛出错误
- **当** 运行时写入任务指标
- **则** `failed` 增加 1
- **并且** `completed` 保持不变
- **并且** 不产生成功计数误报

## Out of Scope

- 识别算法、重试策略与调度并发参数
- 指标上报目标与可视化展示层
