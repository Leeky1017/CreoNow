## Change: issue-338-governance-closeout-active-legacy

### Requirement: Governance closeout archive consistency MUST be preserved [ADDED]

This governance workflow MUST archive stale active governance entries, and it SHALL keep active task/change lists aligned with current execution policy.

#### Scenario: merged OpenSpec changes are archived [ADDED]
- **Given** `issue-334` and `issue-336` are merged
- **When** governance closeout runs
- **Then** both changes are moved from active to `openspec/changes/archive/`

#### Scenario: closed historical issues do not keep active pending tasks [ADDED]
- **Given** `issue-39` and `issue-50` are closed
- **When** governance closeout runs
- **Then** both Rulebook tasks are moved from active to `rulebook/tasks/archive/`
