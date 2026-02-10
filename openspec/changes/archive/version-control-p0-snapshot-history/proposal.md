# 提案：version-control-p0-snapshot-history

## 背景

Version Control 模块管理写作版本的全生命周期。本 change 建立基础层：版本快照的生成、存储与自动合并策略，以及版本历史的 UI 展示入口。后续所有版本功能（预览、Diff、回滚、分支）均依赖本 change。

## 变更内容

- 实现版本快照生成与存储：
  - 四种触发时机：用户手动保存（`actor:user, reason:manual-save`）、自动保存（`actor:auto, reason:autosave`）、AI 修改被接受（`actor:ai, reason:ai-accept`）、文档状态变更（`actor:user, reason:status-change`）。
  - 快照数据结构：`id`、`documentId`、`projectId`、`content`（TipTap JSON）、`actor`、`reason`、`wordCount`、`createdAt`。
  - IPC 通道：`version:snapshot:create`、`version:snapshot:list`、`version:snapshot:read`（均为 Request-Response）。
  - 自动保存版本合并策略：5 分钟时间窗口内 autosave 合并为 1 个，保留最新内容；用户手动保存和 AI 修改的快照不参与合并。
- 实现版本历史入口与展示：
  - 入口：右键文档菜单「版本历史」、Info 面板「查看版本历史」链接、命令面板搜索。
  - 时间线列表：时间戳、actor 标识（人物/时钟/AI 图标）、reason 描述、字数变化（+N / -N）。
  - 按时间降序排列。
- 编写 Storybook Stories：版本历史面板（多版本默认态 / 单版本最简态 / 加载态）。

## 受影响模块

- Version Control（`main/src/services/version/`、`main/src/ipc/version.ts`、`renderer/src/features/version-history/`、`renderer/src/stores/versionStore.tsx`）
- IPC（`version:snapshot:create/list/read` 通道定义）

## 依赖关系

- 上游依赖：
  - IPC（Phase 0，已归档）
  - Document Management（Phase 1，已归档）— 文档 ID、项目 ID
  - Editor p0（Phase 4）— 保存事件触发快照（autosave / manual-save）
- 下游依赖：`version-control-p1` ~ `version-control-p4`

## 不做什么

- 不实现 AI 修改区分显示（→ version-control-p1）
- 不实现版本预览（→ version-control-p1）
- 不实现版本 Diff 对比（→ version-control-p2）
- 不实现版本回滚（→ version-control-p2）
- 不实现分支管理（→ version-control-p3）

## 审阅状态

- Owner 审阅：`PENDING`
