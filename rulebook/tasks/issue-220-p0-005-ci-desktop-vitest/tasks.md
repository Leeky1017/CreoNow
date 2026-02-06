## 1. Implementation

- [x] 1.1 Normalize remediation spec/task-card design baseline references to existing design system docs.
- [x] 1.2 Add desktop Vitest gate (`pnpm -C apps/desktop test:run`) to CI `check` job.

## 2. Testing

- [x] 2.1 Run issue-scoped verification: `pnpm typecheck`, `pnpm lint`, `pnpm contract:check`, `pnpm test:unit`.
- [x] 2.2 Verify `design/Variant/DESIGN_SPEC.md` is not referenced in remediation spec/task-card scope.

## 3. Documentation and Delivery

- [x] 3.1 Create/update `openspec/_ops/task_runs/ISSUE-220.md` with append-only `Runs`.
- [x] 3.2 Add `rulebook/tasks/issue-220-p0-005-ci-desktop-vitest/evidence/notes.md` and capture key evidence links.
