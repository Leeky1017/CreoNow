## 1. Specification

- [x] 1.1 审阅并确认 CE-5 覆盖 Requirement：模块级可验收标准 / 异常与边界覆盖矩阵 / Non-Functional Requirements
- [x] 1.2 审阅并确认关键阈值：p95/p99、容量上限、并发上限与日志脱敏策略
- [x] 1.3 审阅并确认关键错误码与 `context:inspect` 权限约束
- [x] 1.4 完成依赖同步检查（Dependency Sync Check）：上游 `CE-3`、`CE-4` 结论 `NO_DRIFT`

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [x] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → Test 映射

- [x] CE5-R1-S1 → `apps/desktop/tests/integration/context/context-slo-thresholds.test.ts`
- [x] CE5-R1-S2 → `apps/desktop/tests/unit/context/context-inspect-permission.test.ts`
- [x] CE5-R2-S1 → `apps/desktop/tests/unit/context/context-budget-update-conflict.test.ts`
- [x] CE5-R2-S2 → `apps/desktop/tests/unit/context/context-scope-violation.test.ts`
- [x] CE5-R3-S1 → `apps/desktop/tests/unit/context/context-input-too-large.test.ts`
- [x] CE5-R3-S2 → `apps/desktop/tests/integration/context/context-backpressure-redaction.test.ts`

## 3. Red（先写失败测试）

- [x] 3.1 编写性能阈值与 inspect 权限失败测试并确认先失败
- [x] 3.2 编写预算冲突与跨项目注入阻断失败测试并确认先失败
- [x] 3.3 编写超大输入/背压/日志脱敏失败测试并确认先失败

## 4. Green（最小实现通过）

- [x] 4.1 仅实现让 CE-5 Red 转绿的最小保护与错误码链路
- [x] 4.2 实现 `context:inspect` 调试门禁与审计日志最小闭环

## 5. Refactor（保持绿灯）

- [x] 5.1 抽离边界保护与错误映射组件，避免分散分支判断
- [x] 5.2 统一可观测字段，确保不改变外部错误契约

## 6. Evidence

- [x] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）
- [x] 6.2 记录依赖同步检查（Dependency Sync Check）的输入、核对结论与后续动作（`NO_DRIFT`）
