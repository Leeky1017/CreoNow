# Cross-Module Integration Specification Delta

## Change: s2-story-assertions

### Requirement: Story 测试必须包含行为级断言而非仅浅层存在断言 [ADDED]

Story 测试必须验证用户可见行为结果（关键元素、状态、必要交互反馈），不得仅以 `toBeDefined` 等浅层断言作为通过依据。

#### Scenario: CMI-S2-SA-S1 关键 Story 场景具备可验证行为断言 [ADDED]

- **假设** 存在仅做浅层断言的 Story 测试（包含 `AiPanel` 相关测试）
- **当** 为该测试补充关键元素与初始状态断言
- **则** 测试通过必须依赖行为结果匹配
- **并且** 不得以“对象已创建”替代行为正确性判定

#### Scenario: CMI-S2-SA-S2 行为回归时 Story 测试必须失败 [ADDED]

- **假设** Story 渲染或交互行为发生回归
- **当** 执行已补强断言的 Story 测试
- **则** 测试应明确失败并给出可定位的断言信息
- **并且** 不得出现“行为错误但测试仍通过”的浅断言漏检

## Out of Scope

- 修改 Story 对应组件的业务实现。
- 引入新的测试框架或改变测试运行器。
- 处理与 Story 断言无关的异步等待机制问题。
