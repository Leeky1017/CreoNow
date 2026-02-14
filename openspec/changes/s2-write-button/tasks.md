## 1. Specification

- [ ] 1.1 审阅 `unified-roadmap` 中 AR-C16 的范围、依赖与执行建议
- [ ] 1.2 审阅 `editor`/`skill-system` 主 spec 的调用契约与边界
- [ ] 1.3 完成 `editor-delta.md` 的 Requirement/Scenario 固化
- [ ] 1.4 完成依赖同步检查（Dependency Sync Check）并记录 `NO_DRIFT/DRIFT` 结论

## 2. TDD Mapping（先测前提）

- [ ] 2.1 将 delta spec 每个 Scenario 映射为至少一个测试
- [ ] 2.2 为测试标注 Scenario ID（S2-WB-1/2）并建立追踪关系
- [ ] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

## 3. Red（先写失败测试）

- [ ] 3.1 编写“文本位置满足条件时显示续写按钮组”的失败测试
- [ ] 3.2 编写“点击续写按钮触发 write 技能调用”的失败测试
- [ ] 3.3 运行目标测试并记录 Red 失败证据

## 4. Green（最小实现通过）

- [ ] 4.1 实现 WriteButton 组件与最小集成逻辑
- [ ] 4.2 对齐 C14 技能标识并使 Red 用例转绿
- [ ] 4.3 复跑映射测试并确认全部通过

## 5. Refactor（保持绿灯）

- [ ] 5.1 收敛组件结构，避免过度抽象与重复中间层
- [ ] 5.2 保持调用参数与 UI 状态逻辑清晰可追踪
- [ ] 5.3 复跑相关回归测试确保无行为回退

## 6. Evidence

- [ ] 6.1 在 RUN_LOG 记录 Red/Green 命令与关键输出
- [ ] 6.2 记录依赖同步检查（Dependency Sync Check）的输入、结论与后续动作
- [ ] 6.3 记录 Scenario→测试映射与防治标签落实结果
