# RUN_LOG — Issue #947: fe-reduced-motion-respect

| Field    | Value                                          |
| -------- | ---------------------------------------------- |
| Issue    | #947                                           |
| Branch   | `task/947-fe-reduced-motion-respect`           |
| Change   | `openspec/changes/fe-reduced-motion-respect`   |
| PR       | TBD                                            |
| Agent    | Worker-6-1                                     |

## Dependency Sync Check

前置依赖 `fe-visual-noise-reduction`（PR #943）已合并至 main（commit `72feb82c`）。当前分支基于最新 `origin/main`，无上游漂移。

## Runs

### Red Phase

```
$ pnpm -C apps/desktop test:run styles/__tests__/reduced-motion-global.guard

 ✗ WB-FE-MOTION-S1: main.css contains global reduced-motion rule
   → AssertionError: expected false to be true
 ✗ WB-FE-MOTION-S2: tokens.css overrides duration tokens under reduced motion
   → AssertionError: expected 0 to be greater than 0
 ✗ WB-FE-MOTION-S3: no inline @keyframes in feature files
   → AssertionError: expected SearchPanel.tsx not to match /@keyframes/

 Test Files  1 failed (1)
      Tests  3 failed (3)
   Duration  692ms
```

### Green Phase

```
$ pnpm -C apps/desktop test:run styles/__tests__/reduced-motion-global.guard

 ✓ renderer/src/styles/__tests__/reduced-motion-global.guard.test.ts (3 tests) 3ms

 Test Files  1 passed (1)
      Tests  3 passed (3)
   Duration  604ms
```

### 全量回归

```
$ pnpm -C apps/desktop test:run

 Test Files  251 passed (251)
      Tests  1757 passed (1757)
   Duration  61.00s
```

### TypeCheck

```
$ pnpm -C apps/desktop exec tsc --noEmit
(no errors)
```

## Commits

1. `3e568786` — `test: add reduced-motion guard tests (Red) (#947)`
2. `066645f7` — `feat: add global reduced-motion and motion token overrides (#947)`
3. (docs commit pending)
