# Cross Module Integration Specification Delta

## Change: issue-342-governance-archive-issue-340-closeout

### Requirement: 已合并 active change 必须在治理收口中归档 [ADDED]

Merged active changes MUST be moved out of active OpenSpec change space so execution surface reflects repository reality.

#### Scenario: 已合并 active change 进入归档 [ADDED] (S1)

- **Given** `issue-340` 对应 PR（`#341`）已合并到 `main`
- **When** 执行治理收口流程
- **Then** `openspec/changes/` active 目录不再包含 `issue-340-governance-closeout-archive-338-266`
- **And** 该 change 位于 `openspec/changes/archive/`

### Requirement: 已合并 change 对应 Rulebook active task 必须归档 [ADDED]

Rulebook active tasks bound to merged delivery issues MUST be archived to keep task state consistent.

#### Scenario: 已合并任务进入 Rulebook 归档 [ADDED] (S2)

- **Given** `issue-340` 已完成合并交付
- **When** 执行 Rulebook 治理收口流程
- **Then** `rulebook/tasks/` active 目录不再包含 `issue-340-governance-closeout-archive-338-266`
- **And** 对应 task 被移动到 `rulebook/tasks/archive/`

### Requirement: 执行顺序文档必须与归档后活跃集一致 [ADDED]

Execution-order documentation MUST reflect the current active-change set after governance archive actions.

#### Scenario: 执行顺序文档与活跃集合一致 [ADDED] (S3)

- **Given** 本次归档动作已完成
- **When** 审阅 `openspec/changes/EXECUTION_ORDER.md`
- **Then** 文档中的活跃 change 集合与 `openspec/changes/` 实际目录一致
- **And** 文档不再声明已归档 change 处于进行中
