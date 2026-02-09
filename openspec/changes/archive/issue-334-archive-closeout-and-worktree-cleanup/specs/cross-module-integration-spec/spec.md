# Cross Module Integration Specification Delta

## Change: issue-334-archive-closeout-and-worktree-cleanup

### Requirement: 已合并变更必须完成归档收口 [ADDED]

当 change 对应 PR 已 merge，且 RUN_LOG 已具备真实 PR 链接后，必须将该 change 与对应 Rulebook task 归档，避免活跃 change 列表长期悬挂。

#### Scenario: 已合并 change 被归档 [ADDED] (S1)

- **假设** change 对应 PR 已完成合并
- **当** 执行收口流程
- **则** `openspec/changes/<change>` 移动到 `openspec/changes/archive/<change>`
- **并且** `EXECUTION_ORDER.md` 同步更新

#### Scenario: Rulebook task 与 change 保持同态归档 [ADDED] (S2)

- **假设** 已合并 change 进入 archive
- **当** 执行 Rulebook 归档
- **则** `rulebook/tasks/issue-<N>-*` 被移动到 `rulebook/tasks/archive/*`
- **并且** 不再出现在 active task 列表
