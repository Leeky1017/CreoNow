# Memory System Delta — memory-system-p0-architecture-episodic-storage

## [ADDED] Requirement: 三层记忆架构的数据层基础

系统必须先落地可验证的数据层基础，再进入后续蒸馏与生命周期能力：

- 工作记忆：纯内存（Zustand），不可持久化。
- 情景记忆：SQLite 持久化，每个 episode 一行。
- 语义记忆：本 change 仅定义容量预算与占位结构，不实现蒸馏生成。

数据结构约束：

- 工作记忆条目必须包含：`id`、`projectId`、`sessionId`、`kind`、`tokenCount`、`importance`、`createdAt`、`updatedAt`。
- 情景记忆条目必须包含：`id`、`projectId`、`chapterId`、`sceneType`、`skillUsed`、`selectedIndex`、`editDistance`、`implicitSignal`、`importance`、`recallCount`、`compressed`、`createdAt`。
- 情景记忆表必须建立索引：`projectId+createdAt`、`sceneType`、`lastRecalledAt`。

### Scenario: MS1-R1-S1 三层记忆协作并向 CE 暴露可消费结构

- **假设** 用户请求续写动作场景
- **当** Memory System 组装输出给 Context Engine
- **则** 工作记忆返回本会话即时上下文结构（Immediate 可消费）
- **并且** 情景记忆可按项目与场景检索最近交互案例
- **并且** 语义记忆返回规则占位结构（Settings 可消费，允许为空）

### Scenario: MS1-R1-S2 工作记忆超 8K token 时按重要性淘汰

- **假设** 工作记忆累计 token 达到 8K 上限
- **当** 新条目写入工作记忆
- **则** 系统按 `importance` 从低到高淘汰
- **并且** 与当前编辑焦点弱相关的旧条目优先淘汰
- **并且** 写入流程不触发磁盘持久化

### Scenario: MS1-R1-S3 会话结束触发归档并清空工作记忆

- **假设** 当前编辑会话结束（关闭应用或切换项目）
- **当** 会话终止钩子执行
- **则** 达到阈值的临时偏好信号被压缩为情景记忆写入 SQLite
- **并且** 未达阈值的信号丢弃
- **并且** 工作记忆被清空

## [ADDED] Requirement: 情景记忆记录与隐式反馈提取（纯函数）

系统必须在技能执行后记录 episode，并以纯函数提取隐式反馈权重。

隐式反馈信号权重（可测试常量）：

- `DIRECT_ACCEPT`（直接接受无修改）=> `+1.00`
- `LIGHT_EDIT`（editDistance < 0.20）=> `+0.45`
- `HEAVY_REWRITE`（editDistance > 0.60）=> `-0.45`
- `FULL_REJECT`（全部候选拒绝）=> `-0.80`
- `UNDO_AFTER_ACCEPT`（延迟负反馈）=> `-1.00`
- `REPEATED_SCENE_SKILL`（场景-技能重复偏好）=> `+0.15`（可累积）

IPC 约束：

- `memory:episode:record` 必须为 Fire-and-Forget，写失败写日志并进入重试队列。
- `memory:episode:query` 必须为 Request-Response，返回 3-5 条按混合得分排序的结果。

### Scenario: MS1-R2-S1 技能执行后自动记录 episode

- **假设** 用户在动作场景执行续写技能并选择候选 B，`editDistance=0.15`
- **当** 系统处理技能完成事件
- **则** 自动写入一条 episode 到 SQLite
- **并且** 隐式反馈纯函数返回 `LIGHT_EDIT` 对应权重 `+0.45`
- **并且** 通过 `memory:episode:record` 完成异步持久化

### Scenario: MS1-R2-S2 撤销触发延迟负反馈

- **假设** 用户先接受 AI 输出
- **当** 30 秒内执行撤销恢复原文
- **则** 系统更新对应 episode 的隐式反馈为 `UNDO_AFTER_ACCEPT`
- **并且** 权重使用 `-1.00`

### Scenario: MS1-R2-S3 情景记忆按场景+语义混合召回

- **假设** 用户在对白场景再次触发续写
- **当** 调用 `memory:episode:query`
- **则** 先按 `sceneType` 过滤，再按语义相似度排序
- **并且** 返回最相关 3-5 条 episode

## [ADDED] Requirement: 存储策略与淘汰机制执行细则（LRU + TTL）

存储预算与淘汰规则必须可验证：

- 工作记忆：8K tokens（实时写入前检查）
- 情景记忆活跃：最多 1000 条
- 情景记忆压缩：最多 5000 条
- 语义记忆：最多 200 条（本 change 仅校验预算，不实现 CRUD）

调度接口必须暴露四类 trigger：

- `realtimeEvictionTrigger()`
- `dailyDecayRecomputeTrigger()`
- `weeklyCompressTrigger()`
- `monthlyPurgeTrigger()`

当前阶段仅要求手动触发上述接口，不要求 cron 常驻任务。

### Scenario: MS1-R3-S1 超上限时执行 TTL + LRU 清理

- **假设** 某项目情景记忆超过活跃上限 1000 条
- **当** 新 episode 写入前执行容量检查
- **则** 先淘汰 TTL 过期条目
- **并且** 仍超限时按 LRU 从低热度到高热度淘汰
- **并且** 用户确认条目标记为保留不淘汰

### Scenario: MS1-R3-S2 检索失败回退到默认规则集

- **假设** 情景检索因索引不可读返回失败
- **当** Context Engine 请求记忆注入
- **则** Memory System 返回内置默认规则集并标记 `memoryDegraded=true`
- **并且** 不阻断续写主流程

## [ADDED] Requirement: 模块级可验收与异常覆盖（MS-1 范围）

本 change 必须覆盖模块级验收标准与异常矩阵中的以下范围：

- 指标：`memory:episode:record` p95 < 150ms，`memory:episode:query` p95 < 220ms
- 类型：记忆对象必须带 `projectId/scope/version`
- 异常：网络/IO 写失败、容量溢出

### Scenario: MS1-X-S1 记忆库写入失败返回硬错误并重试

- **假设** SQLite 写入 episode 发生 IO 错误
- **当** 处理 `memory:episode:record`
- **则** 返回可判定错误码 `MEMORY_EPISODE_WRITE_FAILED`
- **并且** 系统最多重试 3 次并记录失败日志

### Scenario: MS1-X-S2 容量溢出触发保护与告警

- **假设** 某项目 episode 条目超过可配置上限
- **当** 写入请求继续到达
- **则** 系统先执行淘汰策略再尝试写入
- **并且** 若仍无法满足预算，返回 `MEMORY_CAPACITY_EXCEEDED`

## Out of Scope

- 语义记忆蒸馏与 LLM 调用。
- 衰减公式实现。
- 冲突检测与用户决策流。
- 记忆面板 UI 与溯源展示。
- 多档降级策略的完整实现。
