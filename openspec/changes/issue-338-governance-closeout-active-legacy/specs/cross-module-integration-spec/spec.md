# Cross Module Integration Specification Delta

## Change: issue-338-governance-closeout-active-legacy

### Requirement: 已合并治理 change 必须归档收口 [ADDED]

Merged governance changes MUST be moved out of active OpenSpec change space to keep execution status consistent with repository reality.

#### Scenario: 已合并 change 进入归档 [ADDED] (S1)

- **Given** `issue-334` 与 `issue-336` 已合并到 `main`
- **When** 执行治理收口流程
- **Then** `openspec/changes/` active 目录不再包含上述 change
- **And** 两个 change 均位于 `openspec/changes/archive/`

### Requirement: 已关闭 issue 的历史 pending task 不得长期驻留 active [ADDED]

Rulebook pending tasks bound to closed historical issues MUST be archived when they are declared out of new execution scope.

#### Scenario: 历史 pending task 进入归档 [ADDED] (S2)

- **Given** `issue-39` 与 `issue-50` 已处于 GitHub `CLOSED`
- **When** 执行 Rulebook 治理收口流程
- **Then** `rulebook/tasks/` active 目录不再包含 `issue-39` 与 `issue-50`
- **And** 两个 task 被移动到 `rulebook/tasks/archive/`

### Requirement: 执行顺序文档必须与当前活跃集一致 [ADDED]

Execution-order documentation MUST reflect the current active-change set after governance archive actions.

#### Scenario: 执行顺序文档与活跃集合一致 [ADDED] (S3)

- **Given** 本次归档动作已完成
- **When** 审阅 `openspec/changes/EXECUTION_ORDER.md`
- **Then** 文档中的活跃 change 集合与 `openspec/changes/` 实际目录一致
- **And** 文档不再声明已完成 change 处于进行中
