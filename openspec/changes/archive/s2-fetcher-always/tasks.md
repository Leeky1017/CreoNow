## 1. Specification

- [x] 1.1 审阅并确认 C11 边界：仅处理 `always` 实体查询与注入。
- [x] 1.2 审阅并确认不可变契约：不触达 detected 注入路径。
- [x] 1.3 审阅并确认验收场景：有实体注入、无实体不注入。
- [x] 1.4 完成依赖同步检查（Dependency Sync Check）并记录“无漂移/已更新”结论。

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例。
- [x] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系。
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现。

### Scenario → 测试映射

| Scenario ID | 测试文件                                                                | 测试名称                                                           | 断言要点                       |
| ----------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------ |
| CE-S2-FA-S1 | `apps/desktop/main/src/services/context/__tests__/rulesFetcher.test.ts` | `CE-S2-FA-S1 injects always entities into rules context chunks`    | always 实体被注入 Rules 层     |
| CE-S2-FA-S2 | `apps/desktop/main/src/services/context/__tests__/rulesFetcher.test.ts` | `CE-S2-FA-S2 does not inject chunks when no always entities exist` | 无 always 实体时不注入额外内容 |
| CE-S2-FA-S3 | `apps/desktop/main/src/services/context/__tests__/rulesFetcher.test.ts` | `CE-S2-FA-S3 degrades with explicit warning on KG query failure`   | 异常降级返回可追踪告警         |

## 3. Red（先写失败测试）

- [x] 3.1 先写“有 always 实体”失败测试并确认 Red。
- [x] 3.2 先写“无 always 实体”失败测试并确认 Red。
- [x] 3.3 先写降级告警失败测试并确认 Red。

## 4. Green（最小实现通过）

- [x] 4.1 仅实现使 Red 转绿的最小查询与格式化逻辑。
- [x] 4.2 逐条使失败测试转绿，不引入无关功能。
- [x] 4.3 复跑映射测试，确认 Scenario 对应测试全部通过。

## 5. Refactor（保持绿灯）

- [x] 5.1 收敛格式化与告警拼装逻辑，避免重复实现。
- [x] 5.2 清理临时代码并保持行为契约不变。
- [x] 5.3 回归执行后保持全绿。

## 6. Evidence

- [x] 6.1 在 RUN_LOG 记录 Red/Green 关键命令与输出。
- [x] 6.2 在 RUN_LOG 记录 Dependency Sync Check 输入、结论与后续动作。
- [x] 6.3 在 RUN_LOG 记录与 Scenario 映射一致的测试证据。
