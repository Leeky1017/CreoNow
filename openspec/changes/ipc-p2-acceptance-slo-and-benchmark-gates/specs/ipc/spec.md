# IPC Specification Delta

## Change: ipc-p2-acceptance-slo-and-benchmark-gates

### Requirement: 模块级可验收标准（适用于本模块全部 Requirement） [MODIFIED]

IPC 模块必须提供可执行 acceptance 套件，使用固定样本量与统一统计口径验证以下阈值：

- Request-Response：p95 < 100ms，p99 < 300ms
- Push 通知：p95 < 80ms
- Zod 校验：p95 < 10ms

验收套件必须输出结构化报告，最小字段集：

- `metric`（指标名称）
- `sampleSize`（样本量）
- `p50` / `p95` / `p99`
- `threshold`
- `result`（PASS/FAIL）

任一指标失败时，门禁必须返回非零退出码并阻断合并流程。

#### Scenario: Request-Response 延迟指标达标 [ADDED]

- **假设** 执行 10,000 次 request-response 调用
- **当** 统计延迟分位
- **则** p95 < 100ms 且 p99 < 300ms
- **并且** 结果报告标记为 PASS

#### Scenario: Push 投递延迟指标达标 [ADDED]

- **假设** 在固定事件速率下执行 push 投递基准
- **当** 统计 push 延迟分位
- **则** p95 < 80ms
- **并且** 结果报告包含通道维度指标

#### Scenario: Zod 校验耗时指标达标 [ADDED]

- **假设** 对标准请求样本执行 schema 校验
- **当** 统计校验耗时
- **则** p95 < 10ms
- **并且** 输出报告包含 schema 名称与样本规模

#### Scenario: 阈值违规时输出可判定报告并阻断 [ADDED]

- **假设** 某指标超过阈值
- **当** acceptance 门禁执行
- **则** 门禁返回非零退出码
- **并且** 输出失败指标、实测值与阈值，供 RUN_LOG 与 CI 追踪
