# Skill System Specification Delta

## Change: skill-system-p2-custom-skill-crud

### Requirement: 自定义技能管理 [ADDED]

用户必须能够新增、编辑、删除自定义技能。

- 手动创建：填写名称、描述、Prompt 模板、输入类型、上下文规则。
- AI 辅助创建：自然语言描述 → LLM 生成配置 → 可编辑表单 → 确认保存。
- IPC 通道：`skill:custom:create/update/delete/list`（均为 Request-Response）。
- 数据结构：`id`、`name`、`description`、`promptTemplate`、`inputType`、`contextRules`、`scope`、`enabled`、`createdAt`、`updatedAt`。
- 所有 IPC 数据必须通过 Zod schema 运行时校验。

#### Scenario: 用户手动创建自定义技能 [ADDED]

- **假设** 用户打开技能管理界面
- **当** 用户填写名称「文言文转白话」、描述、Prompt 模板，选择输入类型为「选中文本」，作用域为「项目级」
- **则** 通过 `skill:custom:create` 发送到主进程
- **并且** Zod 校验通过后写入 SQLite，新技能立即出现在技能选择面板

#### Scenario: 用户通过自然语言描述创建技能 [ADDED]

- **假设** 用户点击「AI 辅助创建」
- **当** 用户输入「创建一个技能，可以把我选中的内容改写成鲁迅风格」
- **则** LLM 生成技能配置（名称、Prompt 模板、上下文规则）
- **并且** 以可编辑表单展示，用户确认后通过 `skill:custom:create` 持久化

#### Scenario: 删除自定义技能的确认流程 [ADDED]

- **假设** 用户在技能管理界面查看自定义技能列表
- **当** 用户点击删除按钮
- **则** 弹出确认对话框（Dialog）提示不可撤销
- **当** 用户确认
- **则** 通过 `skill:custom:delete` 删除，技能从列表和面板中移除

#### Scenario: 创建技能时 Zod 校验失败 [ADDED]

- **假设** 用户创建技能时 Prompt 模板字段为空
- **当** 数据发送到主进程
- **则** Zod 校验失败，返回 `{ success: false, error: { code: "VALIDATION_ERROR", message: "promptTemplate 不能为空" } }`
- **并且** 表单对应字段显示内联错误提示（`--color-error`）

## Out of Scope

- 并发调度 / 队列管理（→ skill-system-p3）
- 技能市场 / 分享 / 导入导出
- Prompt 模板版本管理
