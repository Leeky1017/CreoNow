# Governance Delivery Delta

## Change: issue-526-sprint0-group-a-c-delivery

### Requirement: Sprint0 Group A+C must be delivered as one governed implementation batch [ADDED]

All six Sprint0 changes in parallel group A and parallel group C must be implemented with evidence-backed TDD, main-session audit, and merge back to `main` through required checks and auto-merge.

#### Scenario: Multi-change implementation closure with audit-first quality gate [ADDED]

- **Given** six active Sprint0 changes (`s0-fake-queued-fix`, `s0-window-load-catch`, `s0-app-ready-catch`, `s0-skill-loader-error`, `s0-sandbox-enable`, `s0-context-observe`)
- **When** implementation, verification, and defect-first main-session audit are completed
- **Then** all six changes are archived from active path to `openspec/changes/archive/`
- **And** `EXECUTION_ORDER.md` is synchronized to the remaining active topology
- **And** PR passes `ci` + `openspec-log-guard` + `merge-serial` with auto-merge before final main sync
