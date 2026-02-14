## 1. Specification

- [x] 1.1 审阅并确认 C8 边界：仅新增 `aiContextLevel` 字段及其 migration/写入/UI 闭环。
- [x] 1.2 审阅并确认不可变契约：不扩展 matcher 与 fetcher 行为。
- [x] 1.3 审阅并确认验收阈值：CRUD + UI 交互测试覆盖字段新增路径。
- [x] 1.4 完成依赖同步检查（Dependency Sync Check）并记录“无漂移/已更新”结论。

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例。
- [x] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系。
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现。

### Scenario → 测试映射

| Scenario ID | 测试文件                                                                           | 测试名称                                                                | 断言要点                               |
| ----------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------- |
| KG-S2-CL-S1 | `apps/desktop/main/src/services/kg/__tests__/kgService.contextLevel.test.ts`       | `should default aiContextLevel to when_detected when omitted on create` | 创建实体未显式传值时使用默认上下文级别 |
| KG-S2-CL-S2 | `apps/desktop/main/src/services/kg/__tests__/kgService.contextLevel.test.ts`       | `should update aiContextLevel to always via entityUpdate patch`         | 更新路径返回并落库新上下文级别         |
| KG-S2-CL-S2 | `apps/desktop/main/src/services/kg/__tests__/kgService.contextLevel.test.ts`       | `should filter entities by aiContextLevel`                              | 查询路径可按上下文级别筛选验证         |
| KG-S2-CL-S2 | `apps/desktop/renderer/src/features/kg/KnowledgeGraphPanel.context-level.test.tsx` | `KG-S2-CL-S2 should save aiContextLevel from entity edit form`          | UI 编辑表单可修改并提交上下文级别      |

## 3. Red（先写失败测试）

- [x] 3.1 先写字段默认值的失败测试并确认 Red。
- [x] 3.2 先写更新/查询路径的失败测试并确认 Red。
- [x] 3.3 先写 UI 下拉交互失败测试并确认 Red。

## 4. Green（最小实现通过）

- [x] 4.1 仅实现使 Red 转绿的最小改动（migration + 写路径 + UI 绑定）。
- [x] 4.2 逐条使失败测试转绿，不引入无关行为。
- [x] 4.3 复跑映射测试，确认 Scenario 对应测试全部通过。

## 5. Refactor（保持绿灯）

- [x] 5.1 收敛重复枚举与默认值定义，保持单一来源。
- [x] 5.2 清理临时兼容逻辑，保持行为契约不变。
- [x] 5.3 回归执行后保持全绿。

## 6. Evidence

- [x] 6.1 在 RUN_LOG 记录 Red/Green 关键命令与输出。
- [x] 6.2 在 RUN_LOG 记录 Dependency Sync Check 输入、结论与后续动作。
- [x] 6.3 在 RUN_LOG 记录与 Scenario 映射一致的测试证据。
