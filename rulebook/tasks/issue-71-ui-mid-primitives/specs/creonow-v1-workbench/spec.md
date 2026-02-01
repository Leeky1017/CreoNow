# Spec Delta: creonow-v1-workbench (ISSUE-71)

## Scope

Migrate a set of mid-complexity renderer panels from inline styles to the shared
design system primitives (Tailwind + Radix-based primitives), while keeping
stable `data-testid` for Windows Playwright Electron E2E.

## Additions / Clarifications

- Target components SHOULD prefer primitives + Tailwind classes over inline
  `style={{ ... }}`.
- Interactive list items MUST be keyboard-activatable via Enter/Space to satisfy
  basic accessibility expectations in the workbench UI.

## Scenarios

- WHEN CreateProjectDialog is open THEN clicking `create-project-submit` creates
  a project and closes the dialog (without relying on unsafe event casting).
- WHEN CommandPalette is open THEN `command-item-export-markdown` is clickable
  and keyboard-activatable.
- WHEN Analytics is opened from Settings THEN `analytics-page` is visible and
  key stats fields are present (`analytics-today-words`, `analytics-today-skills`).

