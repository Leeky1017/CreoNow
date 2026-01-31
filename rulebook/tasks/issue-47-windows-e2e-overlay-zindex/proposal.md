# Proposal: issue-47-windows-e2e-overlay-zindex

## Why

Windows CI E2E cannot click the Create Project dialog submit button because the
right panel intercepts pointer events. This blocks multiple flows and masks real
regressions.

## What Changes

Add an explicit `z-index` to `.cn-overlay` so modal overlays (CreateProjectDialog
and CommandPalette) always stack above side panels.

## Impact

- Affected specs: creonow-v1-workbench
- Affected code: `apps/desktop/renderer/src/styles/globals.css`
- Breaking change: NO
- User benefit: dialogs are clickable; Windows E2E is stable
