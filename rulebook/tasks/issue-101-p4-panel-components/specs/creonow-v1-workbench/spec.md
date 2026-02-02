# Spec Delta: Issue-101 Phase 4 Panel QA hardening

## Scope

This delta tightens the Phase 4 panel component delivery so Storybook + tests
remain maintainable and CI-green, with a specific focus on `FileTreePanel`.

## FileTreePanel UI constraints

### Rename overflow (must never happen)

- Rename mode MUST NOT cause the row to grow beyond the panel width.
- The input MUST be constrained by the row container (e.g. `min-w-0` + `overflow-hidden`),
  and action buttons MUST NOT force the container wider than available space.

### File actions placement

- Rename/Delete MUST NOT be rendered inline beside the filename by default.
- Actions MUST be accessible via:
  - Right click ContextMenu on the file row, and
  - A discoverable `⋯` menu on the row (e.g. visible on hover/focus).

## Radix trigger compatibility

- Any design-system primitive used as a Radix `asChild` trigger MUST forward refs
  (e.g. `Button`, `ListItem`) to avoid runtime ref warnings and broken positioning/focus.

## Storybook build artifacts

- `apps/desktop/storybook-static/` MUST NOT be committed.
- Repo MUST ignore that path to keep PR diffs reviewable and stable.
