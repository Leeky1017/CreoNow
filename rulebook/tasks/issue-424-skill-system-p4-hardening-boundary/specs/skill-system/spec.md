# Skill System Task Spec — issue-424-skill-system-p4-hardening-boundary

## Scope

- Deliver `openspec/changes/skill-system-p4-hardening-boundary` with P4 boundary hardening:
  - Custom skill capacity cap: global `1000`, per-project `500`.
  - Cross-project custom skill access blocking with `SKILL_SCOPE_VIOLATION`.
  - Security audit logging for scope-violation attempts.
  - Single-output overlength guard on skill execution path.
  - IPC error-code contract completion for new skill boundary errors.

## Acceptance

- Scenario mapping is complete for:
  - timeout/queue overflow verification (regression keep-green)
  - same-name scope resolution consistency (project > global > builtin)
  - cross-project custom-skill scope violation block
  - global/project custom-skill capacity exceeded
  - global concurrency cap remains 8 with no silent drop
- P4 mapped tests include:
  - `apps/desktop/tests/unit/skill-scope-management.test.ts`
  - `apps/desktop/tests/integration/skill-session-queue-limit.test.ts`
  - `apps/desktop/tests/unit/cross-module-contract-gate.spec.ts`
  - `apps/desktop/tests/unit/cross-module-drift-zero.spec.ts`
- IPC error code contract includes:
  - `SKILL_CAPACITY_EXCEEDED`
  - `SKILL_SCOPE_VIOLATION`
- Delivery closes with OpenSpec change archive + Rulebook archive + controlplane `main` sync.
