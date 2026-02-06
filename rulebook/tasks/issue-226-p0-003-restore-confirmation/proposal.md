# Proposal: issue-226-p0-003-restore-confirmation

## Why

Restore operations are destructive and currently execute without confirmation in two places (compare mode restore and version-history restore). MVP readiness requires explicit confirmation semantics and consistent copy.

## What Changes

- Add shared confirmation copy in `restoreConfirmCopy.ts`.
- Update `VersionHistoryContainer` restore flow to use `useConfirmDialog + SystemDialog`.
- Update `AppShell` compare restore flow to use the same confirmation path.
- Add/extend tests to cover cancel/confirm behavior and ensure cancel does not invoke `version:restore`.

## Impact

- Affected specs:
  - `openspec/specs/creonow-mvp-readiness-remediation/spec.md` (CNMVP-REQ-003)
- Affected code:
  - `apps/desktop/renderer/src/features/version-history/restoreConfirmCopy.ts`
  - `apps/desktop/renderer/src/features/version-history/VersionHistoryContainer.tsx`
  - `apps/desktop/renderer/src/components/layout/AppShell.tsx`
  - `apps/desktop/renderer/src/features/version-history/VersionHistoryContainer.test.tsx`
  - `apps/desktop/renderer/src/components/layout/AppShell.restoreConfirm.test.tsx`
- Breaking change: NO
- User benefit: restore now has explicit guardrail and consistent behavior across entry points.
