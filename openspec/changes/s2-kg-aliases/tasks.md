## 1. Specification

- [ ] 1.1 审阅并确认 C9 边界：`aliases` 字段读写、UI 编辑与边界测试。
- [ ] 1.2 审阅并确认不可变契约：不扩展 matcher/fetcher 行为。
- [ ] 1.3 审阅并确认边界清单：空、超长、重复 alias。
- [ ] 1.4 完成依赖同步检查（Dependency Sync Check）并记录“无漂移/已更新”结论。

## 2. TDD Mapping（先测前提）

- [ ] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例。
- [ ] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系。
- [ ] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现。

### Scenario → 测试映射

| Scenario ID | 测试文件                                                                     | 测试名称                                   | 断言要点                              |
| ----------- | ---------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------- |
| KG-S2-AL-S1 | `apps/desktop/main/src/services/kg/__tests__/kgWriteService.aliases.test.ts` | `persists aliases on create and read`      | aliases 在创建/读取链路保持一致       |
| KG-S2-AL-S2 | `apps/desktop/main/src/services/kg/__tests__/kgWriteService.aliases.test.ts` | `handles empty long and duplicate aliases` | 空/超长/重复 aliases 的边界行为可验证 |

## 3. Red（先写失败测试）

- [ ] 3.1 先写 aliases 创建与读取失败测试并确认 Red。
- [ ] 3.2 先写 aliases 更新失败测试并确认 Red。
- [ ] 3.3 先写边界场景失败测试并确认 Red。

## 4. Green（最小实现通过）

- [ ] 4.1 仅实现使 Red 转绿的最小改动（写路径 + UI 绑定）。
- [ ] 4.2 逐条使失败测试转绿，不引入无关功能。
- [ ] 4.3 复跑映射测试，确认 Scenario 对应测试全部通过。

## 5. Refactor（保持绿灯）

- [ ] 5.1 收敛 aliases 标准化/校验逻辑到单一路径。
- [ ] 5.2 清理临时代码，保持外部契约不变。
- [ ] 5.3 回归执行后保持全绿。

## 6. Evidence

- [ ] 6.1 在 RUN_LOG 记录 Red/Green 关键命令与输出。
- [ ] 6.2 在 RUN_LOG 记录 Dependency Sync Check 输入、结论与后续动作。
- [ ] 6.3 在 RUN_LOG 记录与 Scenario 映射一致的测试证据。
