# AI Service Specification Delta

## Change: ai-service-p2-panel-chat-apply-flow

### Requirement: AI 面板交互 [MODIFIED]

系统必须先完成 AI 面板聊天与应用链路的契约闭环，确保项目隔离、状态可见与编辑器应用可回退。

- `ai:chat:list|send|clear` 必须以 `projectId` 隔离数据域，禁止跨项目读取。
- AI 面板结构必须包含：历史区、输出区、操作按钮区、输入区。
- 「应用到编辑器」必须先进入 Inline Diff，由用户确认后才写入文档。
- 面板组件必须提供 Storybook 四态：默认态、空态、生成中态、错误态。

#### Scenario: chat IPC 按项目隔离 [ADDED]

- **假设** 用户在项目 A 和项目 B 都存在聊天历史
- **当** 渲染层以项目 A 调用 `ai:chat:list`
- **则** 返回仅包含项目 A 的历史消息
- **并且** 不泄露项目 B 记录

#### Scenario: AI 输出应用到编辑器需经 Inline Diff [ADDED]

- **假设** AI 输出已生成且用户点击「应用到编辑器」
- **当** 系统执行应用流程
- **则** 编辑器进入 compare 模式展示 Inline Diff
- **并且** 只有用户确认接受后才会写入最终内容

#### Scenario: AI 面板四态在 Storybook 可独立验证 [ADDED]

- **假设** 开发者打开 AI 面板 Storybook
- **当** 切换默认/空/生成中/错误四种状态
- **则** 每个状态均显示规范化结构和文案
- **并且** 不依赖真实网络或真实 LLM
