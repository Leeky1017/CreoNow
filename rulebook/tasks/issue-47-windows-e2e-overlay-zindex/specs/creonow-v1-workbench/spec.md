# Spec Delta: creonow-v1-workbench (ISSUE-47)

## Scope

Fix modal overlay stacking so `.cn-overlay` surfaces always sit above side panels,
unblocking Windows Playwright E2E for project creation.

## Additions / Clarifications

- `.cn-overlay` MUST have an explicit high z-index so dialogs are not covered by
  side panels (e.g. `layout-panel` / `ai-panel`) and clicks are not intercepted.

## Scenarios

- WHEN CreateProjectDialog is open THEN clicking `create-project-submit` works
  even with the right panel visible.
- WHEN CommandPalette is open THEN it captures clicks/input regardless of panel
  visibility.
