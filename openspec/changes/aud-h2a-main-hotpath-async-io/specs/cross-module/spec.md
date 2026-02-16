# cross-module Specification Delta

## Change: aud-h2a-main-hotpath-async-io

### Requirement: 移除主进程热路径同步 I/O [ADDED]

系统 MUST 在该 change 范围内引入可验证的行为约束，避免审计问题再次出现。

#### Scenario: Core Path Stabilized [ADDED]

- **假设** 进入该能力的主路径
- **当** 执行标准输入流程
- **则** 必须得到可预期且可验证的成功结果
- **并且** 不得出现静默失败或状态漂移

#### Scenario: Error Path Deterministic [ADDED]

- **假设** 触发已知错误路径
- **当** 系统处理失败分支
- **则** 必须返回结构化错误结果与可追踪错误码
- **并且** 状态必须回收到一致终态
