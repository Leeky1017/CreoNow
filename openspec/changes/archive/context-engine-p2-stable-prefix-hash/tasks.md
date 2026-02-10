## 1. Specification

- [x] 1.1 审阅并确认 CE-3 仅覆盖 Stable Prefix Hash Requirement
- [x] 1.2 审阅并确认 canonicalize 与 SHA-256 的确定性规则
- [x] 1.3 审阅并确认 `stablePrefixUnchanged` 命中/失效条件
- [x] 1.4 完成依赖同步检查（Dependency Sync Check）：上游 `CE-2` 结论 `NO_DRIFT`

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [x] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → Test 映射

- [x] CE3-R1-S1 → `apps/desktop/tests/unit/context/stable-prefix-hash-hit.test.ts`
- [x] CE3-R1-S2 → `apps/desktop/tests/unit/context/stable-prefix-hash-invalidation.test.ts`

## 3. Red（先写失败测试）

- [x] 3.1 编写 hash 稳定命中失败测试并确认先失败
- [x] 3.2 编写 prefix 变化导致失效失败测试并确认先失败
- [x] 3.3 编写非确定性字段污染防护失败测试并确认先失败

## 4. Green（最小实现通过）

- [x] 4.1 实现最小 canonicalize + SHA-256 逻辑使 Red 转绿
- [x] 4.2 实现 `stablePrefixUnchanged` 判定与缓存命中标记

## 5. Refactor（保持绿灯）

- [x] 5.1 抽离 hash 输入归一化逻辑，保证复用与可测
- [x] 5.2 统一缓存命中/失效日志字段，保持行为不变

## 6. Evidence

- [x] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）
- [x] 6.2 记录依赖同步检查（Dependency Sync Check）的输入、核对结论与后续动作（`NO_DRIFT`）
