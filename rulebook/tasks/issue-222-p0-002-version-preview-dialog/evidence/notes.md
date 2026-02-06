# Notes — issue-222-p0-002-version-preview-dialog

## Scope

- Strictly implement P0-002 preview closure without bundling restore-confirm behavior.

## TDD Evidence

- RED: tests fail because preview path does not call `version:read`.
- GREEN: tests pass after introducing `VersionPreviewDialog` and async preview read flow.

## Artifacts

- `apps/desktop/renderer/src/features/version-history/VersionHistoryContainer.tsx`
- `apps/desktop/renderer/src/features/version-history/VersionPreviewDialog.tsx`
- `apps/desktop/renderer/src/features/version-history/VersionHistoryContainer.test.tsx`
- `openspec/_ops/task_runs/ISSUE-222.md`
