# Version Control Specification Delta

## Change: version-control-p3-branch-merge-conflict

### Requirement: 分支管理、合并与冲突解决 [ADDED]

版本系统必须支持文档级分支工作流。

- 每个文档默认存在 `main` 分支。
- 分支命名规则：`[a-z0-9-]{3,32}`，同文档内唯一。
- 分支元数据：`id`、`documentId`、`name`、`baseSnapshotId`、`headSnapshotId`、`createdBy`、`createdAt`。
- IPC 通道：`version:branch:create/list/switch/merge`、`version:conflict:resolve`（均为 Request-Response）。
- 合并策略：默认三方合并（base/source/target）。
- 无冲突时自动合并，生成 `reason=branch-merge` 快照。
- 有冲突时返回冲突块列表，禁止自动落盘。
- 单次合并超时阈值 5s → `VERSION_MERGE_TIMEOUT`。
- 冲突解决 UI：Diff 面板进入冲突解决模式（逐块选取 ours/theirs/manual）。

#### Scenario: 创建分支并无冲突合并 [ADDED]

- **假设** 用户在 `main` 分支基础上创建 `alt-ending`
- **当** 用户在 `alt-ending` 完成修改并触发合并到 `main`
- **则** 通过 `version:branch:merge` 执行三方合并
- **并且** 无冲突时自动提交合并结果
- **并且** 版本历史新增 `reason=branch-merge` 快照

#### Scenario: 合并冲突进入人工解决流程 [ADDED]

- **假设** `main` 与 `alt-ending` 同时修改同一段落
- **当** 用户执行合并
- **则** 返回 `CONFLICT` 与冲突块列表
- **并且** Diff 面板进入冲突解决模式（逐块选取 ours/theirs/manual）
- **当** 用户提交解决结果
- **则** 通过 `version:conflict:resolve` 落盘并生成合并快照

## Out of Scope

- 跨文档分支（分支仅限单文档粒度）
- 分支权限 / 协作锁
- 自动冲突解决（冲突必须人工解决）
