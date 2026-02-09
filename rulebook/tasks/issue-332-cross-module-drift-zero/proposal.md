# Proposal: issue-332-cross-module-drift-zero

## Why

`cross-module:check` currently passes with 16 approved drifts, which weakens contract governance and hides real cross-module mismatch. We need to remove drift exceptions and align implementation/spec contracts so the gate stays green without whitelist bypass.

## What Changes

- Align channel naming conflicts with IPC naming governance and remove alias approvals.
- Implement/add missing contract items (`ai:chat:send`, `export:project:bundle`, stream split channel recognition).
- Add missing cross-module error codes into IPC contract dictionary.
- Unify envelope target to the actual IPC envelope (`ok`) and remove approved envelope drift.

## Impact

- Affected specs: cross-module-integration-spec, skill-system, document-management (delta only)
- Affected code: ipc contract, ai ipc bridge, export ipc/service, cross-module gate, baseline
- Breaking change: YES (channel contract updates in generated types)
- User benefit: cross-module gate becomes true drift-zero signal, no hidden drift whitelist
