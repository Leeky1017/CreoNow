## 1. Specification

- [x] 1.1 审阅并确认需求边界：仅增强 Story 测试断言，不改组件行为
- [x] 1.2 审阅并确认错误路径与边界路径：防止浅层断言导致“错误也通过”
- [x] 1.3 审阅并确认验收阈值：每个目标 Story 至少包含关键行为断言
- [x] 1.4 若存在上游依赖，先完成依赖同步检查（Dependency Sync Check）并记录“无漂移/已更新”；本 change 标注为独立项

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [x] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → 测试映射

| Scenario ID    | 测试文件                                                        | 测试名称（拟定）                                               | 断言要点                       |
| -------------- | --------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------ |
| `CMI-S2-SA-S1` | `apps/desktop/renderer/src/features/ai/AiPanel.stories.test.ts` | `[CMI-S2-SA-S1] asserts key render elements and initial state` | 关键元素和初始状态必须明确断言 |
| `CMI-S2-SA-S2` | `apps/desktop/renderer/src/features/ai/AiPanel.stories.test.ts` | `[CMI-S2-SA-S2] fails when interaction feedback regresses`     | 仅对象存在不足以通过测试       |

## 3. Red（先写失败测试）

- [x] 3.1 编写 `CMI-S2-SA-S1` 失败测试，先证明浅层断言不能覆盖关键行为
- [x] 3.2 编写 `CMI-S2-SA-S2` 失败测试，先证明行为回归时应触发失败
- [x] 3.3 运行对应测试并记录 Red 证据（失败输出与 Scenario ID 对应）

## 4. Green（最小实现通过）

- [x] 4.1 仅实现让 `CMI-S2-SA-S1/S2` 转绿的最小测试改动（补齐行为断言）
- [x] 4.2 保持断言可读性与稳定性，不引入与验收无关的断言噪音

## 5. Refactor（保持绿灯）

- [x] 5.1 统一 Story 测试断言风格，减少浅层断言复发
- [x] 5.2 合并重复断言片段，保持测试表达聚焦行为

## 6. Evidence

- [x] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）
- [x] 6.2 记录 Dependency Sync Check 的输入、核对结论与后续动作（无漂移/已更新）
- [x] 6.3 记录 Main Session Audit（Audit-Owner/Reviewed-HEAD-SHA=签字提交 HEAD^/三项 PASS/Blocking-Issues=0/Decision=ACCEPT），并确认签字提交仅变更当前任务 RUN_LOG
