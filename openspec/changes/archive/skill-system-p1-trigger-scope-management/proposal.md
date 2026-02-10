# 提案：skill-system-p1-trigger-scope-management

## 背景

核心执行层（skill-system-p0）就绪后，需要建立技能的前端触发入口和三级作用域管理体系。技能选择面板是用户调用 AI 技能的唯一 UI 入口，作用域决定技能的可见性、生命周期和覆盖优先级。

## 变更内容

- 实现技能选择面板 UI：
  - 位于 AI 面板对话输入区上方，图标 + 名称水平排列。
  - 点击展开分类列表（内置 / 全局自定义 / 项目级自定义）。
  - 已停用技能灰显（`opacity: 0.5`，`cursor: not-allowed`），不可触发。
  - 无自定义技能时显示空状态 + 「创建技能」按钮入口。
  - 选择技能后自动判断输入来源（选中文本 / 文档上下文）并启动执行。
- 实现三级作用域管理：
  - `builtin`（系统，不可删除，可停用）、`global`（用户，所有项目可见）、`project`（用户，仅当前项目）。
  - 可见性解析顺序：`project → global → builtin`，同名项目级优先。
  - 技能启停：`skill:registry:toggle`（Request-Response，语义对齐主规范 `skill:toggle`）持久化启停状态。
  - 作用域升降：project ↔ global 互转，通过 `skill:custom:update` 持久化。
- 编写 Storybook Stories：技能选择面板（默认态 / 空状态 / 禁用态）。

## 受影响模块

- Skill System（`renderer/src/features/ai/`、`renderer/src/stores/skillStore.ts`、`main/src/ipc/skills.ts`）
- IPC（`skill:registry:toggle` / `skill:custom:update` 通道定义）

## 依赖关系

- 上游依赖：
  - `skill-system-p0-builtin-skills-executor`（技能定义、SkillExecutor、execute IPC）
- 下游依赖：`skill-system-p2`（自定义技能 CRUD）、`skill-system-p4`

## 不做什么

- 不实现自定义技能的创建/编辑/删除 UI（→ skill-system-p2）
- 不实现并发调度 / 队列管理（→ skill-system-p3）
- 不实现命令面板触发（仅面板按钮触发）

## 审阅状态

- Owner 审阅：`PENDING`
