# Notes — issue-226-p0-003-restore-confirmation

## Scope

- Unify restore confirmation behavior for both restore entry points.

## Evidence Highlights

- VersionHistory restore cancel path does not call `version:restore`.
- VersionHistory restore confirm path calls `version:restore` and re-bootstrap editor.
- AppShell compare restore obeys same confirm gating semantics.

## Artifacts

- `apps/desktop/renderer/src/features/version-history/restoreConfirmCopy.ts`
- `apps/desktop/renderer/src/features/version-history/VersionHistoryContainer.tsx`
- `apps/desktop/renderer/src/components/layout/AppShell.tsx`
- `apps/desktop/renderer/src/features/version-history/VersionHistoryContainer.test.tsx`
- `apps/desktop/renderer/src/components/layout/AppShell.restoreConfirm.test.tsx`
- `openspec/_ops/task_runs/ISSUE-226.md`
