# 提案：skill-system-p2-custom-skill-crud

## 背景

技能触发与作用域体系（skill-system-p1）就绪后，需要实现自定义技能的完整生命周期管理：手动创建、AI 辅助创建、编辑、删除，以及 Zod 校验与 SQLite 持久化。

## 变更内容

- 实现自定义技能手动创建：
  - 技能管理界面表单：名称、描述、Prompt 模板、输入类型（选中文本 / 文档上下文）、上下文规则、作用域（global / project）。
  - 通过 `skill:custom:create`（Request-Response）提交到主进程。
  - 主进程 Zod schema 校验 → SQLite 写入 → 返回成功/校验错误。
- 实现 AI 辅助创建：
  - 用户输入自然语言描述 → 调用 LLM 生成技能配置（名称、Prompt 模板、上下文规则）。
  - 生成结果以可编辑表单展示，用户确认后通过 `skill:custom:create` 持久化。
- 实现自定义技能编辑：`skill:custom:update`（Request-Response）。
- 实现自定义技能删除：
  - 删除前弹出确认对话框（Dialog 组件）。
  - `skill:custom:delete`（Request-Response）。
- 实现自定义技能列表查询：`skill:custom:list`（Request-Response）。
- 自定义技能数据结构：`id`、`name`、`description`、`promptTemplate`、`inputType`、`contextRules`、`scope`、`enabled`、`createdAt`、`updatedAt`。
- 所有 IPC 数据通过 Zod schema 运行时校验，校验失败返回 `{ success: false, error: { code: "VALIDATION_ERROR", message } }`。

## 受影响模块

- Skill System（`main/src/services/skills/`、`main/src/ipc/skills.ts`、`renderer/src/features/ai/`）
- IPC（`skill:custom:create/update/delete/list` 四个通道定义）

## 依赖关系

- 上游依赖：
  - `skill-system-p1-trigger-scope-management`（技能选择面板、作用域体系）
  - AI Service（Phase 3，已归档）— LLM 调用（AI 辅助创建）
- 下游依赖：`skill-system-p4`

## 不做什么

- 不实现并发调度 / 队列管理（→ skill-system-p3）
- 不实现技能市场 / 分享 / 导入导出
- 不实现 Prompt 模板版本管理

## 审阅状态

- Owner 审阅：`PENDING`
