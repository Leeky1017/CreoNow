# Knowledge Graph Specification Delta

## Change: s2-kg-aliases

### Requirement: 实体别名字段必须可维护且边界可验证 [ADDED]

系统必须为 KG 实体提供 `aliases: string[]` 的可维护能力，并确保创建、更新、读取和 UI 编辑结果一致。

#### Scenario: KG-S2-AL-S1 别名读写一致 [ADDED]

- **假设** 用户在实体编辑中输入一个或多个别名
- **当** 保存实体并重新读取
- **则** 返回的 `aliases` 列表与保存结果一致
- **并且** 列表顺序与标准化策略在测试中可验证

#### Scenario: KG-S2-AL-S2 别名边界行为可验证 [ADDED]

- **假设** 输入包含空 alias、超长 alias 或重复 alias
- **当** 执行保存与读取
- **则** 系统按既定边界策略处理并返回可预测结果
- **并且** 不得因边界输入导致实体写入链路失败
