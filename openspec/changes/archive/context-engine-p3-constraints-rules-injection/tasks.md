## 1. Specification

- [x] 1.1 审阅并确认 CE-4 仅覆盖 Constraints Requirement
- [x] 1.2 审阅并确认 `constraints:policy:*` 契约与错误码集合（命名符合 `<domain>:<resource>:<action>`）
- [x] 1.3 审阅并确认 Rules 注入优先级与膨胀裁剪日志策略
- [x] 1.4 完成依赖同步检查（Dependency Sync Check）：上游 `CE-2` 结论 `NO_DRIFT`

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [x] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → Test 映射

- [x] CE4-R1-S1 → `apps/desktop/tests/unit/context/constraints-crud-contract.test.ts`
- [x] CE4-R1-S2 → `apps/desktop/tests/unit/context/constraints-priority-injection.test.ts`
- [x] CE4-R1-S3 → `apps/desktop/tests/unit/context/constraints-overbudget-trim.test.ts`

## 3. Red（先写失败测试）

- [x] 3.1 编写 Constraints CRUD 成功/失败路径测试并确认先失败
- [x] 3.2 编写优先级注入排序失败测试并确认先失败
- [x] 3.3 编写约束膨胀裁剪与日志失败测试并确认先失败

## 4. Green（最小实现通过）

- [x] 4.1 实现 `constraints:policy:*` 最小可用契约使 Red 转绿
- [x] 4.2 实现 Rules 注入与裁剪最小闭环，不引入 Judge 逻辑

## 5. Refactor（保持绿灯）

- [x] 5.1 抽离约束优先级排序与裁剪决策函数
- [x] 5.2 统一约束错误码与日志字段，保持外部契约稳定

## 6. Evidence

- [x] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）
- [x] 6.2 记录依赖同步检查（Dependency Sync Check）的输入、核对结论与后续动作（`NO_DRIFT`）
