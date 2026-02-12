# 提案：skill-system-p3-scheduler-concurrency-timeout

## 背景

核心执行层就绪后，需要补齐生产级调度能力：同会话 FIFO 串行、全局并发上限、执行超时中断、技能依赖声明与缺失阻断、队列溢出保护。这些能力确保技能系统在高并发和异常场景下行为可预测。

## 变更内容

- 实现调度器核心策略：
  - 同会话仅允许 1 个运行中技能（FIFO 排队）。
  - 全局并发上限 8。
  - 每会话队列上限 20，超限直接拒绝（`SKILL_QUEUE_OVERFLOW`）。
  - 队列状态实时推送到 AI 面板。
- 实现执行超时：
  - 每个技能定义 `timeoutMs`（默认 30,000，最大 120,000）。
  - 到达 timeout 后调度器中断执行，释放资源，返回 `SKILL_TIMEOUT`。
- 实现技能依赖管理：
  - 技能可声明 `dependsOn: string[]`。
  - 执行前校验依赖技能存在且已启用，缺失则返回 `SKILL_DEPENDENCY_MISSING`。
- 错误码汇总：`SKILL_TIMEOUT`、`SKILL_DEPENDENCY_MISSING`、`SKILL_QUEUE_OVERFLOW`。

## 受影响模块

- Skill System（`main/src/services/skills/` — 调度器核心）
- AI Store（`renderer/src/stores/skillStore.ts` — 队列状态展示）

## 依赖关系

- 上游依赖：
  - `skill-system-p0-builtin-skills-executor`（SkillExecutor、执行管道）
- 下游依赖：`skill-system-p4`

## 不做什么

- 不修改已有的内置技能定义与 I/O 结构
- 不实现技能优先级插队（仅 FIFO + 系统重试例外）
- 不实现跨节点分布式调度

## 审阅状态

- Owner 审阅：`PENDING`
