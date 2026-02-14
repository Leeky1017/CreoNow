## 1. Specification

- [x] 1.1 审阅并确认 C10 边界：匹配引擎替换 mock recognizer。
- [x] 1.2 审阅并确认输入来源：实体名 + aliases。
- [x] 1.3 审阅并确认性能与边界阈值：100×1000<10ms、重叠名称/中文/空输入。
- [x] 1.4 完成依赖同步检查（Dependency Sync Check）并记录“无漂移/已更新”结论。

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例。
- [x] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系。
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现。

### Scenario → 测试映射

| Scenario ID | 测试文件                                                            | 测试名称                                        | 断言要点                       |
| ----------- | ------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------ |
| KG-S2-EM-S1 | `apps/desktop/main/src/services/kg/__tests__/entityMatcher.test.ts` | `matches entity names and aliases`              | 名字与别名均可触发匹配         |
| KG-S2-EM-S2 | `apps/desktop/main/src/services/kg/__tests__/entityMatcher.test.ts` | `matches 100 entities in 1000 chars under 10ms` | 100×1000 性能阈值可验证        |
| KG-S2-EM-S3 | `apps/desktop/main/src/services/kg/__tests__/entityMatcher.test.ts` | `handles overlap cn text and empty input`       | 重叠名称/中文/空输入边界可验证 |

## 3. Red（先写失败测试）

- [x] 3.1 先写基础匹配失败测试并确认 Red。
- [x] 3.2 先写性能阈值失败测试并确认 Red。
- [x] 3.3 先写边界场景失败测试并确认 Red。

## 4. Green（最小实现通过）

- [x] 4.1 仅实现使 Red 转绿的最小匹配逻辑。
- [x] 4.2 逐条使失败测试转绿，不引入无关能力。
- [x] 4.3 复跑映射测试，确认 Scenario 对应测试全部通过。

## 5. Refactor（保持绿灯）

- [x] 5.1 对热点路径做最小重构，避免过度抽象。
- [x] 5.2 清理临时实现并保持测试全绿。
- [x] 5.3 回归执行后保持全绿。

## 6. Evidence

- [x] 6.1 在 RUN_LOG 记录 Red/Green 关键命令与输出。
- [x] 6.2 在 RUN_LOG 记录 Dependency Sync Check 输入、结论与后续动作。
- [x] 6.3 在 RUN_LOG 记录与 Scenario 映射一致的测试证据。
