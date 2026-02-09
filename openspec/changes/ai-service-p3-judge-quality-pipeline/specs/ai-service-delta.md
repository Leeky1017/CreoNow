# AI Service Specification Delta

## Change: ai-service-p3-judge-quality-pipeline

### Requirement: 输出质量判定（Judge） [MODIFIED]

系统必须将 Judge 结果建模为可传输、可分级、可降级的标准结构，以支持面板非阻塞反馈。

- `judge:evaluate` 请求必须包含 `projectId`、`traceId`、待评估文本与上下文摘要。
- `judge:result` 推送必须包含 `severity`（`high|medium|low`）、`labels[]`、`summary`。
- 当高级判定不可用时，基础规则引擎必须继续执行并标记 `partialChecksSkipped=true`。

#### Scenario: Judge 输出严重度标签可被面板消费 [ADDED]

- **假设** Judge 检测到第一人称约束违反
- **当** `judge:result` 推送到渲染层
- **则** 结果包含 `severity: "high"` 与可读标签
- **并且** AI 面板显示警告标签与后续操作入口

#### Scenario: Judge 全通过时返回通过态 [ADDED]

- **假设** 生成内容通过全部规则与高级判定
- **当** Judge 完成评估
- **则** 返回 `severity: "low"` 且 `labels` 为空或仅含通过标记
- **并且** 面板显示「质量校验通过」状态

#### Scenario: 高级判定不可用时规则兜底并显式标记 [ADDED]

- **假设** 高级判定模型调用失败
- **当** Judge 进入降级路径
- **则** 基础规则校验仍执行并产出结果
- **并且** 返回 `partialChecksSkipped=true` 与提示文案「部分校验已跳过」
