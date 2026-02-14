# Governance Delivery Delta

## Change: issue-522-sprint0-batch-delivery

### Requirement: Sprint0 OpenSpec changes must be delivered in one governed batch [ADDED]

The repository must deliver all Sprint0 OpenSpec change documents in one task branch and one pull request, then merge to `main` with required checks and auto-merge enabled.

#### Scenario: Single-issue single-PR delivery closure [ADDED]

- **Given** Sprint0 has 8 active changes prepared under `openspec/changes/s0-*`
- **When** the delivery task runs through Rulebook + preflight + GitHub checks
- **Then** all Sprint0 change documents and execution-order updates are merged into `main` in one PR
- **And** RUN_LOG records commands, outcomes, and main-session audit evidence
