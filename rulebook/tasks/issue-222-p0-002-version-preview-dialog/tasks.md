## 1. Implementation

- [x] 1.1 Add `VersionPreviewDialog` with read-only content area and metadata fields.
- [x] 1.2 Replace preview TODO/console in `VersionHistoryContainer` with `version:read` flow and dialog state handling.
- [x] 1.3 Surface preview error as `error.code: error.message` in dialog.

## 2. Testing

- [x] 2.1 Add test: preview calls `version:read` and renders read-only content.
- [x] 2.2 Add test: preview read failure shows `error.code + error.message`.
- [x] 2.3 Run issue-scoped preflight verification.

## 3. Documentation and Delivery

- [x] 3.1 Add `openspec/_ops/task_runs/ISSUE-222.md` with append-only runs.
- [x] 3.2 Capture evidence notes under `rulebook/tasks/issue-222-p0-002-version-preview-dialog/evidence/notes.md`.
