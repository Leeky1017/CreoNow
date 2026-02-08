## 1. Specification

- [x] 1.1 审阅并确认 `模块级可验收标准` 的采样规模与统计口径
- [x] 1.2 审阅并确认 Request-Response / Push / Zod 三类指标的独立验收路径
- [x] 1.3 审阅并确认阈值违反时的门禁行为与输出报告字段

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [x] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → Test 映射

- [x] S1 `Request-Response 延迟指标达标 [ADDED]`
  - 测试：`apps/desktop/tests/perf/ipc-request-response.acceptance.spec.ts`
  - 用例：`should keep request-response latency under p95/p99 thresholds on 10000 calls`
- [x] S2 `Push 投递延迟指标达标 [ADDED]`
  - 测试：`apps/desktop/tests/perf/ipc-push.acceptance.spec.ts`
  - 用例：`should keep push delivery latency under p95 threshold`
- [x] S3 `Zod 校验耗时指标达标 [ADDED]`
  - 测试：`apps/desktop/tests/perf/ipc-validation.acceptance.spec.ts`
  - 用例：`should keep zod validation latency under p95 threshold`
- [x] S4 `阈值违规时输出可判定报告并阻断 [ADDED]`
  - 测试：`apps/desktop/tests/perf/ipc-acceptance-gate.spec.ts`
  - 用例：`should fail gate with metric summary when any threshold is violated`

## 3. Red（先写失败测试）

- [x] 3.1 编写“RR 延迟阈值”失败测试并确认先失败
- [x] 3.2 编写“Push 延迟阈值”失败测试并确认先失败
- [x] 3.3 编写“阈值违规门禁阻断”失败测试并确认先失败

## 4. Green（最小实现通过）

- [x] 4.1 实现 IPC acceptance 基准测试与统一统计器
- [x] 4.2 实现阈值判定与报告输出
- [x] 4.3 将门禁接入 CI，使新增 Red 用例转绿

## 5. Refactor（保持绿灯）

- [x] 5.1 去重基准测试夹具与统计逻辑，保持测试全绿
- [x] 5.2 保持阈值定义与输出格式稳定，避免报告解析破坏

## 6. Evidence

- [x] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）
