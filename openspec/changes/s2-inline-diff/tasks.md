## 1. Specification

- [ ] 1.1 审阅并确认 `s2-inline-diff` 只覆盖 decoration 与接受/拒绝交互。
- [ ] 1.2 审阅并确认 `specs/editor-delta.md` 的渲染、接受、拒绝场景完整。
- [ ] 1.3 审阅并确认边界：不扩展到版本历史或回滚治理。
- [ ] 1.4 完成 依赖同步检查（Dependency Sync Check）并记录 `NO_DRIFT` 结论。

## 2. TDD Mapping（先测前提）

- [ ] 2.1 将每个 Scenario 映射为至少一个行为测试。
- [ ] 2.2 为每个测试标注 Scenario ID，建立可追踪关系。
- [ ] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现。

## 3. Red（先写失败测试）

- [ ] 3.1 编写“AI 输出后渲染 inline diff 标注”的失败测试并确认先失败。
- [ ] 3.2 编写“点击接受后应用差异”的失败测试并确认先失败。
- [ ] 3.3 编写“点击拒绝后保留原文”的失败测试并确认先失败。

## 4. Green（最小实现通过）

- [ ] 4.1 仅实现使 diff 渲染相关测试转绿的最小代码。
- [ ] 4.2 仅实现接受/拒绝所需最小应用逻辑，不引入无关能力。

## 5. Refactor（保持绿灯）

- [ ] 5.1 收敛 decoration 与控制组件的共享状态结构。
- [ ] 5.2 保持对外行为不变前提下清理重复补丁计算逻辑。

## 6. Evidence

- [ ] 6.1 在 RUN_LOG 记录 Red/Green 命令及关键输出。
- [ ] 6.2 记录 Dependency Sync Check 输入、核对项与结论。
- [ ] 6.3 记录 Main Session Audit 结果并确认签字提交仅变更当前任务 RUN_LOG。
