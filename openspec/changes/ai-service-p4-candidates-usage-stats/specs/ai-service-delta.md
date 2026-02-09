# AI Service Specification Delta

## Change: ai-service-p4-candidates-usage-stats

### Requirement: AI 多候选方案 [MODIFIED]

- 候选方案数量配置必须限制在 `1-5`，默认值保持 `1`。
- 面板必须以卡片展示候选摘要，支持展开完整内容并选择应用。
- 用户点击「全部不满意，重新生成」时必须复用同参数重新请求。
- 负反馈必须通过可判定接口写入记忆系统（标记 `feedback=strong_negative`）。

#### Scenario: 候选卡片选择并应用到编辑器 [ADDED]

- **假设** 用户将候选数量设置为 3
- **当** 系统返回 3 个候选并用户选择方案 B
- **则** 面板展示 B 的完整内容并允许「应用到编辑器」
- **并且** 应用链路仍遵循 Inline Diff 确认流程

#### Scenario: 全部不满意触发重生成与负反馈落盘 [ADDED]

- **假设** 用户拒绝当前全部候选
- **当** 点击「全部不满意，重新生成」
- **则** 系统使用相同参数重新生成候选
- **并且** 将强负反馈写入记忆系统接口

### Requirement: AI 使用统计 [MODIFIED]

- 每次请求完成后必须返回并展示 `promptTokens`、`completionTokens`、`sessionTotalTokens`。
- 当模型价格可用时可选展示估算费用；价格缺失时不得显示费用字段。

#### Scenario: 会话 token 统计可见且口径一致 [ADDED]

- **假设** 用户完成一次 AI 请求
- **当** 面板渲染统计栏
- **则** 显示 prompt/completion/sessionTotal 三项 token 数据
- **并且** 与主进程返回 metadata 一致

#### Scenario: 未配置模型价格时隐藏费用 [ADDED]

- **假设** 当前模型未配置价格
- **当** 渲染统计信息
- **则** 仅显示 token 数据
- **并且** 不显示费用估算字段
