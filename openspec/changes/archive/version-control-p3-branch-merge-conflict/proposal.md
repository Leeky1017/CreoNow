# 提案：version-control-p3-branch-merge-conflict

## 背景

版本快照、对比与回滚（version-control-p0/p1/p2）就绪后，需要实现文档级分支工作流：分支创建/切换/列出、三方合并、冲突检测与人工解决全链路。分支功能让创作者可以在不影响主线的前提下探索不同叙事方向。

## 变更内容

- 实现分支模型：
  - 每个文档默认存在 `main` 分支。
  - 分支命名规则：`[a-z0-9-]{3,32}`，同文档内唯一。
  - 分支元数据：`id`、`documentId`、`name`、`baseSnapshotId`、`headSnapshotId`、`createdBy`、`createdAt`。
- 实现分支 IPC 通道：
  - `version:branch:create`（Request-Response）— 创建分支。
  - `version:branch:list`（Request-Response）— 列出分支。
  - `version:branch:switch`（Request-Response）— 切换分支。
  - `version:branch:merge`（Request-Response）— 合并分支。
  - `version:conflict:resolve`（Request-Response）— 提交冲突解决结果。
- 实现合并策略：
  - 默认三方合并（base / source / target）。
  - 无冲突时自动合并，生成 `reason=branch-merge` 快照。
  - 有冲突时返回冲突块列表，禁止自动落盘。
  - 单次合并超时阈值 5s → `VERSION_MERGE_TIMEOUT`。
- 实现冲突解决 UI：
  - Diff 面板进入冲突解决模式（逐块选取 ours/theirs/manual）。
  - 用户提交解决结果通过 `version:conflict:resolve` 落盘并生成合并快照。

## 受影响模块

- Version Control（`main/src/services/version/`、`main/src/ipc/version.ts`、`renderer/src/features/version-history/`、`renderer/src/stores/versionStore.tsx`）
- IPC（`version:branch:*`、`version:conflict:resolve` 通道定义）

## 依赖关系

- 上游依赖：
  - `version-control-p0-snapshot-history`（快照 CRUD）
  - `version-control-p2-diff-rollback`（Diff 组件、快照对比）
- 下游依赖：`version-control-p4`

## 不做什么

- 不实现跨文档分支（分支仅限单文档粒度）
- 不实现分支权限/协作锁
- 不实现自动冲突解决（冲突必须人工解决）

## 审阅状态

- Owner 审阅：`PENDING`
