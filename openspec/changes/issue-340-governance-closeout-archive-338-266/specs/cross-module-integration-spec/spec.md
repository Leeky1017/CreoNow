# Cross Module Integration Specification Delta

## Change: issue-340-governance-closeout-archive-338-266

### Requirement: 已合并 active change 必须在治理收口中归档 [ADDED]

Merged active changes MUST be moved out of active OpenSpec change space so the execution surface reflects repository reality.

#### Scenario: 已合并 active change 进入归档 [ADDED] (S1)

- **Given** `issue-338` 与 `issue-266` 对应 PR（`#339`、`#279`）已合并到 `main`
- **When** 执行治理收口流程
- **Then** `openspec/changes/` active 目录不再包含 `issue-338` 与 `db-native-binding-doctor`
- **And** 两个 change 均位于 `openspec/changes/archive/`

### Requirement: 已合并 change 对应 Rulebook active task 必须归档 [ADDED]

Rulebook active tasks bound to merged delivery issues MUST be archived to keep task state consistent.

#### Scenario: 已合并任务进入 Rulebook 归档 [ADDED] (S2)

- **Given** `issue-338` 与 `issue-266` 已完成合并交付
- **When** 执行 Rulebook 治理收口流程
- **Then** `rulebook/tasks/` active 目录不再包含对应 task
- **And** 两个 task 被移动到 `rulebook/tasks/archive/`

### Requirement: 执行顺序文档必须与归档后活跃集一致 [ADDED]

Execution-order documentation MUST reflect the current active-change set after governance archive actions.

#### Scenario: 执行顺序文档与活跃集合一致 [ADDED] (S3)

- **Given** 本次归档动作已完成
- **When** 审阅 `openspec/changes/EXECUTION_ORDER.md`
- **Then** 文档中的活跃 change 集合与 `openspec/changes/` 实际目录一致
- **And** 文档不再声明已归档 change 处于进行中
