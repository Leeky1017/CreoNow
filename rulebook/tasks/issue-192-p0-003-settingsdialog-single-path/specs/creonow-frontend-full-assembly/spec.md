# Spec Delta: P0-003 SettingsDialog single path

## Scope

This task collapses Settings into a single user-facing surface:

- `Features/SettingsDialog` becomes the only Settings UI path.
- `SettingsPanel` (sidebar surface) is removed or internalized (no second entry point).
- Entry points are unified:
  - IconBar Settings opens `SettingsDialog`
  - Cmd/Ctrl+, opens `SettingsDialog`
  - CommandPalette “Open Settings” opens `SettingsDialog`

## Settings capabilities (renderer)

`SettingsDialog` MUST expose the following existing capabilities:

- Appearance: theme mode uses existing `themeStore` and persists across restart.
- Proxy: view/update/test via `ai:proxy:settings:get/update/test` IPC.
- Judge: view state via `judge:model:getState` and allow `judge:model:ensure`.
- Analytics: render `AnalyticsPage` content or a direct entry inside the dialog.

## Failure modes and observability

- IPC failures MUST be user-visible as `error.code: error.message` (no silent failure).
- Initial state MUST be resilient when values are missing/corrupted:
  - Theme defaults to `"system"` when missing.
  - Proxy defaults to disabled with empty base URL when missing.

## E2E contract (stable selectors)

- `icon-bar-settings` opens SettingsDialog.
- Settings dialog root MUST have a stable `data-testid` for Playwright E2E.

## E2E coverage

- `apps/desktop/tests/e2e/settings-dialog.spec.ts` covers:
  - Cmd/Ctrl+, opens SettingsDialog
  - theme mode change persists across restart
  - proxy/judge failure modes are observable (validation/UI error state)

