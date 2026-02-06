# Proposal: issue-224-p0-004-error-boundary

## Why

A render-time crash currently risks blanking the renderer surface. MVP readiness requires global crash containment and a recoverable fallback path.

## What Changes

- Add class-based `ErrorBoundary` with `componentDidCatch` diagnostics capture.
- Provide fallback UI actions:
  - `Reload App`
  - `Copy error details`
- Mount `ErrorBoundary` globally in `renderer/src/main.tsx`.
- Export `ErrorBoundary` from patterns index.
- Add `ErrorBoundary` tests covering fallback rendering and action buttons.

## Impact

- Affected specs:
  - `openspec/specs/creonow-mvp-readiness-remediation/spec.md` (CNMVP-REQ-004)
- Affected code:
  - `apps/desktop/renderer/src/components/patterns/ErrorBoundary.tsx`
  - `apps/desktop/renderer/src/components/patterns/ErrorBoundary.test.tsx`
  - `apps/desktop/renderer/src/components/patterns/index.ts`
  - `apps/desktop/renderer/src/main.tsx`
- Breaking change: NO
- User benefit: renderer no longer white-screens on render crashes; users can recover and report diagnostics.
