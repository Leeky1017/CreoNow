# Notes — issue-224-p0-004-error-boundary

## Scope

- Implement global render crash containment via ErrorBoundary.

## TDD Evidence

- RED: test fails because `ErrorBoundary` module does not exist.
- GREEN: tests pass after adding ErrorBoundary component and global mount.

## Artifacts

- `apps/desktop/renderer/src/components/patterns/ErrorBoundary.tsx`
- `apps/desktop/renderer/src/components/patterns/ErrorBoundary.test.tsx`
- `apps/desktop/renderer/src/components/patterns/index.ts`
- `apps/desktop/renderer/src/main.tsx`
- `openspec/_ops/task_runs/ISSUE-224.md`
