# Proposal: issue-110-diffview-multi-version-compare

## Why

Writers often iterate on the same passage multiple times; comparing only “before vs after”
is insufficient when evaluating several successive versions. We also need tighter visual
consistency in DiffView to reduce perceived UI mismatch and clutter.

## What Changes

- Add a multi-version comparison view (2–4 versions) rendered as a responsive grid.
- Add Storybook stories to visually validate multi-version layouts and sync scrolling.
- Polish DiffView header/footer sizing and remove redundant footer Close action.
- Add unit tests for the new multi-version compare behavior.

## Impact
- Affected specs:
  - `rulebook/tasks/issue-110-diffview-multi-version-compare/specs/creonow-v1-workbench/spec.md`
- Affected code:
  - `apps/desktop/renderer/src/features/ai/MultiVersionCompare.tsx`
  - `apps/desktop/renderer/src/features/ai/VersionPane.tsx`
  - `apps/desktop/renderer/src/features/ai/DiffView.stories.tsx`
  - `apps/desktop/renderer/src/features/ai/DiffHeader.tsx`
  - `apps/desktop/renderer/src/features/ai/DiffFooter.tsx`
- Breaking change: NO
- User benefit: Compare up to 4 versions at once with consistent UI styling and optional sync scrolling.
