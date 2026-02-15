# Governance Integration Spec

## Requirement: W1 Integrated Delivery
Main session must integrate all Sprint3 W1 changes, verify quality, archive completed OpenSpec changes, and merge to `main` through required checks.

#### Scenario: Main-session audit gates integrated branch
- **Given** W1 change implementations are completed on child branches
- **When** main session integrates and verifies the branch
- **Then** audit evidence must be written to RUN_LOG and preflight must pass
- **And** merge must happen through auto-merge with required checks green
