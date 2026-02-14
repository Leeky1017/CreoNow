## 1. Specification

- [x] 1.1 审阅 `unified-roadmap` 中 AR-C15 的范围、边界与依赖
- [x] 1.2 审阅 `skill-system` 主 spec 中内置技能约束与加载契约
- [x] 1.3 完成 `skill-system-delta.md` 的 Requirement/Scenario 固化
- [x] 1.4 完成依赖同步检查（Dependency Sync Check）并记录 `NO_DRIFT/DRIFT` 结论

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 每个 Scenario 映射为至少一个测试
- [x] 2.2 为测试标注 Scenario ID（S2-CS-1/2）并建立追踪关系
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

## 3. Red（先写失败测试）

- [x] 3.1 编写“3 个对话技能均可被 loader 发现”的失败测试
- [x] 3.2 编写“对话技能文档字段缺失时抛出可诊断失败”的失败测试
- [x] 3.3 运行目标测试并记录 Red 失败证据

## 4. Green（最小实现通过）

- [x] 4.1 补齐 brainstorm/roleplay/critique 的 SKILL.md
- [x] 4.2 仅实现让 Red 转绿所需的最小改动
- [x] 4.3 复跑映射测试并确认全部转绿

## 5. Refactor（保持绿灯）

- [x] 5.1 统一对话技能文档结构与命名，去除噪音描述
- [x] 5.2 校准对话技能职责边界，避免与写作技能重叠
- [x] 5.3 复跑相关回归测试确保无行为回退

## 6. Evidence

- [x] 6.1 在 RUN_LOG 记录 Red/Green 命令与关键输出
- [x] 6.2 记录依赖同步检查（Dependency Sync Check）的输入、结论与后续动作
- [x] 6.3 记录 Scenario→测试映射与防治标签落实结果
