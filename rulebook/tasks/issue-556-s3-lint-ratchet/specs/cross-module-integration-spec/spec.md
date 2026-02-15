# Cross Module Integration Task Spec

## Requirement: Lint ratchet must block regressions with auditable baseline governance

The lint ratchet flow must parse a versioned baseline snapshot, compare current violations against baseline, fail CI on regressions, and enforce issue/reason traceability on baseline updates.

#### Scenario: CMI-S3-LR-S1 baseline can be parsed and validated deterministically

- **Given** a committed lint baseline file
- **When** ratchet reads baseline before comparison
- **Then** required fields are parsed stably
- **And** missing key fields (for example `snapshot.byRule`) fail with diagnostic error

#### Scenario: CMI-S3-LR-S2 CI blocks newly introduced lint violations

- **Given** baseline and current lint snapshots
- **When** current snapshot regresses on total or per-rule counts
- **Then** ratchet exits non-zero and blocks CI
- **And** output includes rule-level regression details

#### Scenario: CMI-S3-LR-S3 baseline update is traceable across sessions

- **Given** baseline refresh is attempted
- **When** governance fields (`issue`, `reason`) are missing or invalid
- **Then** ratchet rejects the baseline as non-compliant
- **And** baseline updates require auditable governance context
