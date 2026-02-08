# Memory System Delta — memory-system-p1-distillation-decay-conflict

## [ADDED] Requirement: 语义记忆蒸馏（批量/空闲/手动/冲突触发）

系统必须基于 MS-1 的 episode 数据执行异步蒸馏，并通过 LLM 生成语义规则。

蒸馏流程必须固定为：

1. 聚类分析（按 sceneType + skillUsed）
2. 模式提取（统计显著偏好）
3. 自然语言规则生成（LLM）

触发条件必须覆盖：

- 批量触发：新增 episode 达到 50
- 空闲触发：用户离开编辑器 > 5 分钟
- 手动触发：用户主动点击更新偏好
- 冲突触发：检测到新旧规则冲突

IPC 约束：

- `memory:semantic:list|update|delete|add|distill` 使用 Request-Response
- `memory:distill:progress` 使用 Main→Renderer 推送

### Scenario: MS2-R1-S1 批量触发蒸馏并推送进度

- **假设** 系统累积 50 条新 episode
- **当** 下一次技能执行完成
- **则** 后台异步启动蒸馏
- **并且** 通过 `memory:distill:progress` 推送进度
- **并且** 编辑器主流程不被阻塞

### Scenario: MS2-R1-S2 蒸馏生成新语义规则

- **假设** 最近 50 条 episode 中动作场景偏好短句占显著多数
- **当** 蒸馏流程完成
- **则** 生成规则「动作场景偏好短句」
- **并且** 规则携带 `confidence/supportingEpisodes/contradictingEpisodes`
- **并且** `userConfirmed=false`

### Scenario: MS2-R1-S3 LLM 不可用时蒸馏降级重试

- **假设** 蒸馏调用 LLM 失败
- **当** 后台蒸馏执行
- **则** 返回可观测错误 `MEMORY_DISTILL_LLM_UNAVAILABLE`
- **并且** 保持已有语义规则不变
- **并且** 在下一个触发窗口自动重试

## [ADDED] Requirement: 记忆衰减与生命周期管理（纯函数）

衰减计算必须由纯函数实现并可单测验证：

- `decay = min(1.0, baseDecay × recallBoost × importanceBoost)`
- `baseDecay = exp(-0.1 × ageInDays)`
- `recallBoost = 1 + 0.2 × recallCount`
- `importanceBoost = 1 + 0.3 × importance`

状态分级：活跃/衰减中/待压缩/待淘汰；待压缩条目按约 200 tokens 摘要压缩。

### Scenario: MS2-R2-S1 记忆衰减到待压缩后进入压缩队列

- **假设** 一条久未召回 episode 的衰减分数降到 0.25
- **当** 每日衰减重算执行
- **则** 条目进入待压缩队列
- **并且** 下次周任务将其压缩为约 200 tokens 摘要

### Scenario: MS2-R2-S2 召回后记忆重新激活

- **假设** 一条处于衰减中（0.5）的 episode 被召回
- **当** 系统更新 `recallCount` 和 `lastRecalledAt`
- **则** 衰减分数重算后回升到活跃区间

### Scenario: MS2-R2-S3 用户确认规则免衰减

- **假设** 某语义规则 `userConfirmed=true`
- **当** 衰减重算任务执行
- **则** 该规则跳过衰减
- **并且** 置信度保持不变

## [ADDED] Requirement: 记忆冲突检测与解决（自动 + 用户确认）

冲突类型与处理边界必须明确：

- 时间迁移：自动以近 30 天 episode 为准更新规则
- 作用域重叠：项目级覆盖全局级
- 直接矛盾：先降权，再进入用户确认决策

### Scenario: MS2-R3-S1 时间迁移冲突自动更新

- **假设** 旧规则偏好华丽辞藻，近 30 天 episode 显示偏好简洁
- **当** 蒸馏后冲突检测执行
- **则** 系统自动更新为简洁风格规则
- **并且** 标记 `recentlyUpdated=true`

### Scenario: MS2-R3-S2 直接矛盾需用户选择

- **假设** 新增规则同时出现「偏好长句」与「偏好短句」
- **当** 冲突检测完成
- **则** 两条规则先降置信度并标记冲突
- **并且** 进入用户确认队列等待选择

## [ADDED] Requirement: 模块级可验收与异常覆盖（MS-2 范围）

本 change 必须覆盖异常矩阵中的以下范围：

- 并发冲突：并发蒸馏与写入冲突
- 数据异常：置信度越界

### Scenario: MS2-X-S1 并发蒸馏与写入冲突隔离

- **假设** 蒸馏任务正在批量读取 episode
- **当** 新 episode 并发写入
- **则** 写入先进入 WAL 队列并立即返回
- **并且** 蒸馏使用一致性快照继续执行

### Scenario: MS2-X-S2 置信度越界时拒绝落库

- **假设** 蒸馏结果给出 `confidence=1.2` 或 `confidence=-0.1`
- **当** 系统准备写入语义规则
- **则** 返回 `MEMORY_CONFIDENCE_OUT_OF_RANGE`
- **并且** 拒绝写入异常数据

## Out of Scope

- 记忆面板 UI 与 Storybook。
- 记忆溯源展示与反馈。
- 记忆隔离清除与全量清除交互。
- 降级策略分档细节。
