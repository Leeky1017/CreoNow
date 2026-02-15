# Governance Task Spec

## Requirement: Sprint3 change scaffolding must be complete and auditable

The task must generate all Sprint 3 OpenSpec change docs with anti-regression guidance and produce main-session audit evidence.

#### Scenario: all Sprint3 changes are scaffolded with three required files

- **Given** Sprint 3 defines 17 changes in `docs/plans/unified-roadmap.md`
- **When** this task is completed
- **Then** each change has `proposal.md`, `tasks.md`, and one `specs/*-delta.md`
- **And** each proposal contains anti-regression tags and pitfall/audit notes

#### Scenario: execution order is synchronized to Sprint3 dependency topology

- **Given** there are multiple active Sprint 3 changes
- **When** execution order is updated
- **Then** `openspec/changes/EXECUTION_ORDER.md` reflects current wave order and dependencies
- **And** the update timestamp is refreshed
