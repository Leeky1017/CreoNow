## 1. Specification

- [ ] 1.1 审阅并确认 CE-2 仅覆盖 Token 预算管理 Requirement
- [ ] 1.2 审阅并确认预算比例/最小保障：`15/10/25/50` + `500/200/0/2000`
- [ ] 1.3 审阅并确认裁剪顺序与 Rules 不可裁剪契约
- [ ] 1.4 完成依赖同步检查（Dependency Sync Check）：上游 `CE-1` 结论 `NO_DRIFT`

## 2. TDD Mapping（先测前提）

- [ ] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [ ] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [ ] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → Test 映射

- [ ] CE2-R1-S1 → `apps/desktop/tests/unit/context/token-budget-within-limit.test.ts`
- [ ] CE2-R1-S2 → `apps/desktop/tests/unit/context/token-budget-truncation-order.test.ts`
- [ ] CE2-R1-S3 → `apps/desktop/tests/unit/context/token-budget-update-conflict.test.ts`

## 3. Red（先写失败测试）

- [ ] 3.1 编写预算内不裁剪失败测试并确认先失败
- [ ] 3.2 编写超预算裁剪顺序失败测试并确认先失败
- [ ] 3.3 编写预算更新冲突/tokenizer 不一致失败测试并确认先失败

## 4. Green（最小实现通过）

- [ ] 4.1 实现最小预算计算与裁剪链路使 Red 转绿
- [ ] 4.2 实现 `context:budget:get` / `context:budget:update` 最小闭环

## 5. Refactor（保持绿灯）

- [ ] 5.1 抽离预算配置校验与 tokenizer 一致性校验组件
- [ ] 5.2 统一预算错误码与告警日志字段

## 6. Evidence

- [ ] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）
- [ ] 6.2 记录依赖同步检查（Dependency Sync Check）的输入、核对结论与后续动作（`NO_DRIFT`）
