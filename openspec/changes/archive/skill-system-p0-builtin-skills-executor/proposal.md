# 提案：skill-system-p0-builtin-skills-executor

## 背景

Skill System 将 AI 能力抽象为可组合的「技能」。本 change 建立核心执行层：8 个内置技能的 I/O 定义、`SkillExecutor` 统一调度、流式响应管道和取消机制。后续所有技能管理功能（触发 UI、作用域、自定义技能、并发调度）均依赖本 change。

## 变更内容

- 定义 8 个内置技能的数据结构：`polish`、`rewrite`、`continue`、`expand`、`condense`、`style-transfer`、`translate`、`summarize`，每个含 `id`、`name`、输入类型、输出类型、`context_rules`。
- 实现 `SkillExecutor`：
  - 执行前校验输入（如 `polish` 需要选中文本非空，`continue` 需要文档上下文非空）。
  - 组装上下文（通过 Context Engine 注入 Immediate / Rules / Settings / Retrieved 层）。
  - 调用 LLM 并返回 `SkillResult`（`output`、`metadata`、`traceId`）。
- 实现流式响应 IPC 管道：
  - `ai:skill:run`（Request-Response）→ 返回 `executionId`。
  - `skill:stream:chunk`（Push Notification）→ 逐步推送生成内容。
  - `skill:stream:done`（Push Notification）→ 推送完成信号 + 完整 `SkillResult`。
- 实现取消机制：`ai:skill:cancel`（Request-Response）中断 LLM 调用、释放资源。
- 错误处理：LLM 失败/超时返回结构化错误 `{ code: "LLM_API_ERROR" | "SKILL_INPUT_EMPTY", message }`，AI 面板展示 + 重试入口。

## 受影响模块

- Skill System（`main/src/services/skills/`、`main/skills/packages/`、`main/src/ipc/skills.ts`）
- AI Store（`renderer/src/stores/skillStore.ts` — executionId / streaming 状态）
- IPC（`ai:skill:run`、`skill:stream:chunk`、`skill:stream:done`、`ai:skill:cancel` 通道定义）

## 依赖关系

- 上游依赖：
  - AI Service（Phase 1，已归档）— LLM 代理调用、流式响应与取消生命周期
  - Context Engine（Phase 3，已归档）— 上下文组装 API
  - IPC（Phase 0，已归档）— 通道注册机制
- 下游依赖：`skill-system-p1` ~ `skill-system-p4`

## 不做什么

- 不实现技能触发 UI / 技能选择面板（→ skill-system-p1）
- 不实现自定义技能 CRUD（→ skill-system-p2）
- 不实现作用域管理（→ skill-system-p1）
- 不实现并发调度 / 超时 / 队列管理（→ skill-system-p3）

## 审阅状态

- Owner 审阅：`PENDING`
