# Cross Module Integration Specification Delta

## Change: issue-330-cross-module-gate-autofix-classification

### Requirement: Gate failure must be machine-classified [ADDED]

The system MUST classify cross-module gate failures into machine-decidable categories.

- classify missing expected as implementation alignment
- classify unexpected actual contract items as new addition candidates
- classify stale drift as safe baseline cleanup

### Requirement: Dev branch supports safe autofix + optional commit [ADDED]

The system MUST provide safe autofix in development branches and MAY create a commit when explicitly requested.

- `cross-module:autofix --apply` cleans stale approved drifts
- `cross-module:autofix --apply --commit` creates commit on task branch when changes exist

### Requirement: CI remains check-only [ADDED]

CI MUST remain check-only and MUST NOT perform cross-module autofix mutations.

- CI runs `cross-module:check` only
