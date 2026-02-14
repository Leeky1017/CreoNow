## 1. Specification

- [x] 1.1 审阅并确认 C13 边界：memory preview 注入 prompt。
- [x] 1.2 审阅并确认职责分工：memory 服务提供 preview，settings fetcher 负责注入。
- [x] 1.3 审阅并确认验收场景：有记忆注入 + context 端到端可见。
- [x] 1.4 完成依赖同步检查（Dependency Sync Check）并记录“无漂移/已更新”结论。

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例。
- [x] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系。
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现。

### Scenario → 测试映射

| Scenario ID | 测试文件                                                                                        | 测试名称                                             | 断言要点                       |
| ----------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------ |
| MS-S2-MI-S1 | `apps/desktop/main/src/services/memory/__tests__/memoryService.previewInjection.test.ts`        | `injects memory snippets into preview prompt`        | 有记忆时 prompt 包含记忆片段   |
| MS-S2-MI-S2 | `apps/desktop/main/src/services/context/__tests__/settingsFetcher.memoryInjection.test.ts`      | `degrades gracefully when preview injection fails`   | 无记忆或异常时降级行为可验证   |
| MS-S2-MI-S3 | `apps/desktop/main/src/services/context/__tests__/layerAssemblyService.memoryInjection.test.ts` | `assembles context with memory injection end-to-end` | context 组装端到端包含记忆注入 |

## 3. Red（先写失败测试）

- [x] 3.1 先写“有记忆注入”失败测试并确认 Red。
- [x] 3.2 先写“异常降级”失败测试并确认 Red。
- [x] 3.3 先写“端到端可见性”失败测试并确认 Red。

## 4. Green（最小实现通过）

- [x] 4.1 仅实现使 Red 转绿的最小注入链路。
- [x] 4.2 逐条使失败测试转绿，不引入无关功能。
- [x] 4.3 复跑映射测试，确认 Scenario 对应测试全部通过。

## 5. Refactor（保持绿灯）

- [x] 5.1 收敛 preview 读取与格式化注入逻辑，避免重复路径。
- [x] 5.2 清理临时代码并保持外部契约不变。
- [x] 5.3 回归执行后保持全绿。

## 6. Evidence

- [x] 6.1 在 RUN_LOG 记录 Red/Green 关键命令与输出。
- [x] 6.2 在 RUN_LOG 记录 Dependency Sync Check 输入、结论与后续动作。
- [x] 6.3 在 RUN_LOG 记录与 Scenario 映射一致的测试证据。
