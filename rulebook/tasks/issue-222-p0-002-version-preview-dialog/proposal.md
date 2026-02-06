# Proposal: issue-222-p0-002-version-preview-dialog

## Why

Version History preview was a TODO with `console.log`, so users could not inspect historical content safely before restore decisions. This is a P0 closure item for MVP readiness.

## What Changes

- Add `VersionPreviewDialog` for read-only historical snapshot display.
- Update `VersionHistoryContainer` preview handler to call `version:read` and wire loading/success/error states.
- Add `VersionHistoryContainer` tests for:
  - success path (reads and renders read-only content)
  - error path (renders `error.code: error.message`)

## Impact

- Affected specs:
  - `openspec/specs/creonow-mvp-readiness-remediation/spec.md` (CNMVP-REQ-002)
- Affected code:
  - `apps/desktop/renderer/src/features/version-history/VersionHistoryContainer.tsx`
  - `apps/desktop/renderer/src/features/version-history/VersionPreviewDialog.tsx`
  - `apps/desktop/renderer/src/features/version-history/VersionHistoryContainer.test.tsx`
- Breaking change: NO
- User benefit: Version preview becomes functional, read-only, and diagnosable on failure.
