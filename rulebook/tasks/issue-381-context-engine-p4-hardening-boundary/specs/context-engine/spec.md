# Context Engine Task Spec — issue-381-context-engine-p4-hardening-boundary

## Scope

- Deliver `openspec/changes/context-engine-p4-hardening-boundary` with CE5 boundary hardening:
  - Inspect permission gate (`debugMode` + `callerRole`).
  - Cross-project context injection blocking.
  - Input hard limit (`64k` token cap).
  - Per-document backpressure (`max 4` in-flight).
  - Redacted/summarized observability for overload/audit paths.

## Acceptance

- Scenario mapping is complete for CE5-R1-S1 / R1-S2 / R2-S1 / R2-S2 / R3-S1 / R3-S2.
- CE5 mapped tests exist at:
  - `apps/desktop/tests/integration/context/context-slo-thresholds.test.ts`
  - `apps/desktop/tests/unit/context/context-inspect-permission.test.ts`
  - `apps/desktop/tests/unit/context/context-budget-update-conflict.test.ts`
  - `apps/desktop/tests/unit/context/context-scope-violation.test.ts`
  - `apps/desktop/tests/unit/context/context-input-too-large.test.ts`
  - `apps/desktop/tests/integration/context/context-backpressure-redaction.test.ts`
- IPC error code contract includes:
  - `CONTEXT_INSPECT_FORBIDDEN`
  - `CONTEXT_INPUT_TOO_LARGE`
  - `CONTEXT_BACKPRESSURE`
  - `CONTEXT_SCOPE_VIOLATION`
- Delivery closes with OpenSpec change archive + Rulebook archive + controlplane `main` sync.
