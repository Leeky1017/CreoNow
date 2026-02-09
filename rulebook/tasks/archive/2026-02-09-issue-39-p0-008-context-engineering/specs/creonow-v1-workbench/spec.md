# Spec Delta: creonow-v1-workbench (ISSUE-39)

## Scope

Implement `CNWB-REQ-060` context engineering minimal loop: `.creonow` ensure/watch,
deterministic 4-layer assembly, token budget + trim evidence, redaction evidence,
and a Context Viewer with stable selectors for Windows E2E gating.

## Additions / Clarifications

- IPC channels:
  - `context:creonow:watch:start` / `context:creonow:watch:stop` (idempotent)
  - Expand V1 minimum ops for `.creonow` sources used by context assembly
- Renderer diagnostics (UI + E2E assertable):
  - `stablePrefixHash` (stable prefix only)
  - `promptHash` (stable prefix + dynamic)
  - `ContextBudget` token estimates
  - `TrimEvidence[]` (per-layer, per-sourceRef actions/reasons)
  - `RedactionEvidence[]` (patternId/sourceRef/matchCount)
- Stable test selectors:
  - `ai-context-toggle`, `ai-context-panel`
  - `ai-context-layer-rules/settings/retrieved/immediate`
  - `ai-context-trim`

## Scenarios

- WHEN only `retrieved/immediate` changes THEN `stablePrefixHash` stays constant.
- WHEN `rules/settings` change THEN `stablePrefixHash` changes and is explainable.
- WHEN sensitive content appears in `.creonow/**` THEN viewer/log/prompt injection
  MUST show `***REDACTED***` and MUST NOT leak the original secret/path.
