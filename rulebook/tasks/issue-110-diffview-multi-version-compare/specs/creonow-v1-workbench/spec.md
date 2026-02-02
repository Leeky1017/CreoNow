# Spec Delta: Issue-110 DiffView multi-version compare

## Scope

This delta adds a multi-version comparison view for Diff-related workflows, enabling
authors to compare multiple iterations of the same content side-by-side (up to 4 versions).
It also polishes DiffView header/footer for consistency with the design system.

## Multi-version compare (2–4 versions)

- The UI MUST support comparing 2–4 versions simultaneously.
- The default layout MUST be:
  - 2 versions: 1x2 horizontal split
  - 3 versions: 2 panes on top + 1 pane spanning the full bottom row
  - 4 versions: 2x2 grid
- Each pane MUST display a version label and provide a scrollable content area.
- The content area MUST use the mono font token (`--font-family-mono`) and compact UI sizing.

## Interaction: synchronized scrolling

- The view SHOULD support synchronized vertical scrolling across panes.
- When enabled, scrolling one pane SHOULD update other panes to the same scroll position.
- When disabled, panes MUST scroll independently.

## DiffView header/footer polish

- Header version selectors and navigation text MUST keep a single-line layout at narrow widths
  (no forced wrapping), using consistent `text-xs` sizing.
- Footer MUST NOT duplicate Close when the header already provides a close affordance (X).
- Restore action MUST remain visually consistent with existing button styles and design tokens.
