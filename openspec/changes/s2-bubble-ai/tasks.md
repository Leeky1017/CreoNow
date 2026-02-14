## 1. Specification

- [ ] 1.1 审阅 `unified-roadmap` 中 AR-C17 的范围、依赖与执行建议
- [ ] 1.2 审阅 `editor`/`skill-system` 主 spec 的 Bubble Menu 与技能调用约束
- [ ] 1.3 完成 `editor-delta.md` 的 Requirement/Scenario 固化
- [ ] 1.4 完成依赖同步检查（Dependency Sync Check）并记录 `NO_DRIFT/DRIFT` 结论

## 2. TDD Mapping（先测前提）

- [ ] 2.1 将 delta spec 每个 Scenario 映射为至少一个测试
- [ ] 2.2 为测试标注 Scenario ID（S2-BA-1/2）并建立追踪关系
- [ ] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

## 3. Red（先写失败测试）

- [ ] 3.1 编写“选中文本时显示 Bubble AI 菜单”的失败测试
- [ ] 3.2 编写“点击菜单项触发目标技能调用”的失败测试
- [ ] 3.3 运行目标测试并记录 Red 失败证据

## 4. Green（最小实现通过）

- [ ] 4.1 实现 BubbleAiMenu 组件与最小集成逻辑
- [ ] 4.2 对齐技能标识与调用参数并使 Red 用例转绿
- [ ] 4.3 复跑映射测试并确认全部通过

## 5. Refactor（保持绿灯）

- [ ] 5.1 收敛组件边界，避免不必要抽象层与重复适配代码
- [ ] 5.2 保持菜单状态与选区状态同步逻辑可追踪
- [ ] 5.3 复跑相关回归测试确保无行为回退

## 6. Evidence

- [ ] 6.1 在 RUN_LOG 记录 Red/Green 命令与关键输出
- [ ] 6.2 记录依赖同步检查（Dependency Sync Check）的输入、结论与后续动作
- [ ] 6.3 记录 Scenario→测试映射与防治标签落实结果
