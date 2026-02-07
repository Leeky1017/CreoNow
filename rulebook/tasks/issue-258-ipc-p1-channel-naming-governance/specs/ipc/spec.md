# Spec Delta: ipc (ISSUE-258)

## Changes

- Enforce strict IPC channel naming governance in contract generation:
  - exact 3 segments: `<domain>:<resource>:<action>`
  - domain whitelist validation
  - stable error codes for invalid name / unknown domain / preload name collision
  - error details include actionable location fields
- Migrate existing IPC channel names to the new 3-segment lowercase scheme.

## Acceptance

- `apps/desktop/tests/unit/ipc-channel-naming-governance.spec.ts` covers S1~S4 and passes.
- `scripts/contract-generate.ts` blocks:
  - unknown domain (`IPC_CONTRACT_UNKNOWN_DOMAIN`)
  - non-3-segment naming (`IPC_CONTRACT_INVALID_NAME`)
  - preload method-name collision (`IPC_CONTRACT_NAME_COLLISION`)
- `pnpm contract:generate` succeeds and generated contract types align with source.
