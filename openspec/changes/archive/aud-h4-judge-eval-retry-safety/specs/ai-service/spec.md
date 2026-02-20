# ai-service Specification Delta

## Change: aud-h4-judge-eval-retry-safety

### Requirement: Judge 自动评估失败后必须可安全重试（Wave1 / H4）[ADDED]

当 AI 面板启用自动评估（auto-eval）时，如果对某个 `runId` 的评估调用失败，系统不得把该 run 永久锁死为“已评估”；必须允许在后续合适的状态转换中再次触发评估调用，以避免 silent skip。

#### Scenario: AIS-AUD-H4-S2（test tag: AISVC-AUD-H4-S2）首次 auto-eval 失败后，同一 runId 必须可再次触发评估 [ADDED]

- **假设** `lastRunId` 为固定值（例如 `run-locked-1`），且第一次 `judge:quality:evaluate` 返回 `ok:false`
- **当** store 状态从 `running -> idle` 再次进入可评估窗口
- **则** 系统必须对同一 `runId` 再次调用 `judge:quality:evaluate`
- **并且** 该重试不得导致无限循环调用（以状态窗口/幂等守卫约束重试频率）
