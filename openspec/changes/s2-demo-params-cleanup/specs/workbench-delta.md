# Workbench Specification Delta

## Change: s2-demo-params-cleanup

### Requirement: AI 对话组件必须移除 demo-only 参数并回归真实回调驱动 [MODIFIED]

`AiInlineConfirm` 与 `AiErrorCard` 的生产组件契约不得包含 demo-only 控制参数，组件行为必须由外部回调与真实状态驱动：

- 生产组件 props 中移除 `simulateDelay`、`initialState`、`retryWillSucceed` 等 demo-only 参数。
- 组件确认/重试结果由调用方回调决定，不以内置 demo 分支短路。
- Story 演示控制参数仅存在于 Story 层，不污染生产组件 API。

#### Scenario: 生产组件在无 demo 参数下按回调驱动状态 [ADDED]

- **假设** 页面以生产配置渲染 `AiInlineConfirm` 或 `AiErrorCard`
- **当** 用户触发确认或重试动作
- **则** 组件状态变化由外部回调结果驱动
- **并且** 不依赖 demo-only 参数分支

#### Scenario: Story 演示参数不进入生产组件契约 [ADDED]

- **假设** 开发者维护组件 stories
- **当** 通过 Story args 调整演示效果
- **则** 调整仅发生在 Story 层
- **并且** 生产组件类型定义中不暴露 demo-only 参数

## Out of Scope

- AI 失败重试策略本身与后端错误处理链路
- 新增组件视觉状态或交互入口
