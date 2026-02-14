## 1. Specification

- [ ] 1.1 审阅并确认 C12 边界：retrieved fetcher 仅处理 when-detected 注入链路。
- [ ] 1.2 审阅并确认不可变契约：不扩展 matcher 本体与 rules fetcher 责任。
- [ ] 1.3 审阅并确认验收场景：文本命中注入、never 不注入。
- [ ] 1.4 完成依赖同步检查（Dependency Sync Check）并记录“无漂移/已更新”结论。

## 2. TDD Mapping（先测前提）

- [ ] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例。
- [ ] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系。
- [ ] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现。

### Scenario → 测试映射

| Scenario ID | 测试文件                                                                             | 测试名称                                         | 断言要点                          |
| ----------- | ------------------------------------------------------------------------------------ | ------------------------------------------------ | --------------------------------- |
| CE-S2-FD-S1 | `apps/desktop/main/src/services/context/__tests__/retrievedFetcher.detected.test.ts` | `injects when-detected entity when text matches` | 文本命中时注入 when-detected 实体 |
| CE-S2-FD-S2 | `apps/desktop/main/src/services/context/__tests__/retrievedFetcher.detected.test.ts` | `skips entities with aiContextLevel never`       | `aiContextLevel=never` 不被注入   |
| CE-S2-FD-S3 | `apps/desktop/main/src/services/context/__tests__/retrievedFetcher.detected.test.ts` | `returns degradable warning when matcher fails`  | 查询/匹配异常时返回可追踪告警     |

## 3. Red（先写失败测试）

- [ ] 3.1 先写“文本命中注入”失败测试并确认 Red。
- [ ] 3.2 先写“never 不注入”失败测试并确认 Red。
- [ ] 3.3 先写降级告警失败测试并确认 Red。

## 4. Green（最小实现通过）

- [ ] 4.1 仅实现使 Red 转绿的最小接入逻辑。
- [ ] 4.2 逐条使失败测试转绿，不引入无关功能。
- [ ] 4.3 复跑映射测试，确认 Scenario 对应测试全部通过。

## 5. Refactor（保持绿灯）

- [ ] 5.1 收敛匹配结果到实体注入的转换逻辑，避免重复。
- [ ] 5.2 清理临时兼容路径并保持外部契约不变。
- [ ] 5.3 回归执行后保持全绿。

## 6. Evidence

- [ ] 6.1 在 RUN_LOG 记录 Red/Green 关键命令与输出。
- [ ] 6.2 在 RUN_LOG 记录 Dependency Sync Check 输入、结论与后续动作。
- [ ] 6.3 在 RUN_LOG 记录与 Scenario 映射一致的测试证据。
