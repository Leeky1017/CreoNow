## 1. Specification

- [x] 1.1 审阅并确认 CE-1 覆盖 Requirement：四层上下文架构 / 上下文组装 API
- [x] 1.2 审阅并确认层级契约必填字段：`source`、`tokenCount`、`truncated`
- [x] 1.3 审阅并确认降级策略：单层不可用时继续组装并写入 `warnings`
- [x] 1.4 本 change 为 CE 链路首项；依赖同步检查（Dependency Sync Check）结论：`NO_DRIFT`

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [x] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → Test 映射

- [x] CE1-R1-S1 → `apps/desktop/tests/unit/context/layer-assembly-contract.test.ts`
- [x] CE1-R1-S2 → `apps/desktop/tests/unit/context/layer-degrade-warning.test.ts`
- [x] CE1-R2-S1 → `apps/desktop/tests/unit/context/context-assemble-contract.test.ts`
- [x] CE1-R2-S2 → `apps/desktop/tests/unit/context/context-inspect-contract.test.ts`

## 3. Red（先写失败测试）

- [x] 3.1 编写四层契约完整性失败测试并确认先失败
- [x] 3.2 编写单层不可用降级失败测试并确认先失败
- [x] 3.3 编写 `context:prompt:assemble`/`context:prompt:inspect` 契约失败测试并确认先失败

## 4. Green（最小实现通过）

- [x] 4.1 仅实现让 CE-1 Red 转绿的最小契约组装逻辑
- [x] 4.2 逐条使 Scenario 对应失败测试通过，不引入预算/哈希/约束逻辑

## 5. Refactor（保持绿灯）

- [x] 5.1 抽离层契约校验与 warnings 归并逻辑，避免重复
- [x] 5.2 保持 `context:prompt:assemble` 与 `context:prompt:inspect` 对外契约不变

## 6. Evidence

- [x] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）
- [x] 6.2 记录依赖同步检查（Dependency Sync Check）的输入、核对结论与后续动作（`NO_DRIFT`）
