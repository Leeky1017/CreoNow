# Spec Delta: P0-004 ExportDialog integration + UNSUPPORTED semantics

## Scope

This task makes `Features/ExportDialog` the single export UI path:

- CommandPalette “Export…” opens `ExportDialog` (no direct export command).
- Export is executed via typed IPC:
  - `export:markdown`
  - `export:pdf`
  - `export:docx`
- Unsupported formats MUST be surfaced clearly to users.

## Renderer semantics

- ExportDialog MUST show deterministic UI states:
  - config → progress → success (with `relativePath` and `bytesWritten`)
  - error state with `error.code: error.message` and dismiss/retry
- When backend returns `{ ok: false, error: { code: "UNSUPPORTED", ... } }`:
  - the corresponding format MUST be clearly unavailable (disabled + tooltip preferred),
  - or clicking it MUST show an explicit “UNSUPPORTED” explanation.

## Stable selectors (E2E)

- CommandPalette export entry:
  - `command-item-export` opens ExportDialog
- ExportDialog root MUST have a stable `data-testid` for Playwright E2E.
- Export result MUST expose `relativePath` and `bytesWritten` fields in success view.

## E2E coverage

- Update `apps/desktop/tests/e2e/export-markdown.spec.ts` to use ExportDialog flow.
- Add `apps/desktop/tests/e2e/export-dialog.spec.ts`:
  - open dialog, export markdown and assert success view
  - assert pdf/docx disabled (UNSUPPORTED)

