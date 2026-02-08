# Memory System Delta — memory-system-p2-panel-provenance

## [ADDED] Requirement: 记忆面板（Memory Panel）用户可见与可控

Memory Panel 必须作为 Memory System 的唯一直接交互入口，位于左侧栏并支持作用域切换（全局/本项目）。

面板结构必须包含：

- 作用域切换
- 分类规则列表（style/structure/character/pacing/vocabulary）
- 规则操作按钮（确认/修改/删除）
- 底部信息区（交互记录数、最近更新时间）
- 功能按钮（手动添加、更新偏好、暂停学习）

设计 token 约束：

- 面板背景：`--color-bg-surface`
- 规则卡片：`--color-bg-raised`
- 圆角：`--radius-sm`
- 暂停学习与冲突提示：`--color-warning`

Storybook 必须覆盖 4 态：默认、空、暂停学习、冲突通知。

### Scenario: MS3-R1-S1 用户确认偏好规则

- **假设** 面板中存在未确认规则「动作场景偏好短句」
- **当** 用户点击“确认”
- **则** 规则标记 `userConfirmed=true`
- **并且** 该规则不再被自动覆盖

### Scenario: MS3-R1-S2 用户修改规则文本

- **假设** 规则语义方向正确但表述不准确
- **当** 用户编辑规则文本并保存
- **则** 规则标记 `userModified=true`
- **并且** 新版本号 `version` 增长

### Scenario: MS3-R1-S3 用户删除错误偏好规则

- **假设** 规则内容与用户偏好明显不符
- **当** 用户点击“删除”并确认
- **则** 系统通过 `memory:semantic:delete` 删除规则
- **并且** 对应支撑 episode 标记负向反馈避免立即再生

### Scenario: MS3-R1-S4 用户手动添加规则（含空状态入口）

- **假设** 新用户打开面板时规则列表为空
- **当** 用户通过空状态 CTA 或功能按钮手动添加规则
- **则** 通过 `memory:semantic:add` 创建规则
- **并且** 新规则默认 `confidence=1.0`、`userConfirmed=true`

### Scenario: MS3-R1-S5 用户暂停与恢复学习

- **假设** 用户希望暂时阻断偏好学习
- **当** 用户点击“暂停学习”
- **则** 新 episode 继续记录但不触发蒸馏
- **并且** 面板显示 `--color-warning` 的暂停状态
- **当** 用户点击“恢复学习”
- **则** 蒸馏触发恢复正常

## [ADDED] Requirement: 记忆溯源（Memory Provenance）

系统必须记录并展示 `GenerationTrace`：

- `generationId`
- `memoryReferences`（working/episodic/semantic 引用 ID）
- `influenceWeights`（每条引用的影响权重）

IPC 约束：

- `memory:trace:get`：Request-Response
- `memory:trace:feedback`：Fire-and-Forget

### Scenario: MS3-R2-S1 用户查看生成溯源

- **假设** AI 已生成一段文本
- **当** 用户点击“为什么这样写？”
- **则** 系统通过 `memory:trace:get` 返回 GenerationTrace
- **并且** UI 按记忆类型分组展示引用及权重

### Scenario: MS3-R2-S2 用户反馈溯源判断有误

- **假设** 溯源结果引用了用户认为不相关的规则
- **当** 用户点击“判断有误”
- **则** 系统通过 `memory:trace:feedback` 记录负反馈
- **并且** 负反馈可进入后续蒸馏学习链路

## [ADDED] Requirement: 模块级可验收与异常覆盖（MS-3 范围）

本 change 必须覆盖异常矩阵中的以下范围：

- 数据异常：trace 失配
- 权限/安全：跨项目读取

### Scenario: MS3-X-S1 trace 失配返回可判定错误

- **假设** `generationId` 对应 trace 缺失或字段不完整
- **当** 调用 `memory:trace:get`
- **则** 返回 `MEMORY_TRACE_MISMATCH`
- **并且** UI 使用安全兜底文案而非崩溃

### Scenario: MS3-X-S2 跨项目读取被拒绝

- **假设** 当前项目 ID 与被查询 trace 所属项目不一致
- **当** 调用 `memory:trace:get`
- **则** 返回 `MEMORY_SCOPE_DENIED`
- **并且** 不泄漏其他项目的记忆引用信息

## Out of Scope

- 蒸馏后台流程实现。
- 衰减与冲突引擎实现。
- 作用域清除与降级策略执行。
