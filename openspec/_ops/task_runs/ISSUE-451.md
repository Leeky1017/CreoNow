# ISSUE-451

- Issue: #451
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/451
- Branch: task/451-p5-05-hardening-gate
- PR: https://github.com/Leeky1017/CreoNow/pull/452

## Plan

1. Add zod validation to layoutStore + themeStore with fallback + write-back
2. Add activeLeftPanel persistence, shortcut debounce, dual-drag guard, RightPanel collapse button
3. Storybook audit + NFR threshold tests + full regression

## Dependency Sync Check

- **Input**: Change 01–04 all archived and merged to main
- **Store API**: layoutStore exports `LAYOUT_DEFAULTS`, `LeftPanelType`, `RightPanelType`, `createLayoutStore(preferences)`; themeStore exports `ThemeMode`, `createThemeStore(preferences)` — confirmed consistent
- **Component props**: Resizer(`testId, getStartWidth, onDrag, onCommit, onDoubleClick`), RightPanel(`width, collapsed, onOpenSettings?, onOpenVersionHistory?`) — confirmed consistent
- **IPC contracts**: No new IPC channels in this change — N/A
- **Error codes**: No cross-change error codes — N/A
- **Conclusion**: No drift detected. Proceed to Red.

## Runs

### 2026-02-12 18:20 Red phase — failing tests written
- Command: `pnpm vitest run` (targeted 5 files)
- Key output: Tests fail on `layoutResetNotice`, `dismissLayoutResetNotice`, `onCollapse`, dual-drag, debounce — all expected Red failures
- Evidence: layoutStore.test.ts, themeStore.test.ts, Resizer.test.tsx, RightPanel.test.tsx, AppShell.test.tsx

### 2026-02-12 18:23 Green phase — implementation complete
- Command: `pnpm vitest run` (targeted 5 files)
- Key output: `Tests 85 passed (85)`
- Changes:
  - `layoutStore.tsx`: zod schemas for all layout prefs, `validateOrDefault()`, `layoutResetNotice`, `dismissLayoutResetNotice`, `activeLeftPanel` persistence
  - `themeStore.tsx`: zod `themeModeSchema` replaces manual `normalizeMode`, write-back on invalid init
  - `Resizer.tsx`: global `globalDragging` flag prevents dual-drag, `__resetGlobalDragging()` for tests
  - `RightPanel.tsx`: `onCollapse` prop + collapse button with `data-testid="right-panel-collapse-btn"`
  - `AppShell.tsx`: 300ms debounce refs for `Cmd/Ctrl+\` and `Cmd/Ctrl+L`, wired `onCollapse` to RightPanel
  - `preferences.ts`: added `activeLeftPanel` to `PreferenceKey` union
  - `package.json`: added `zod` dependency

### 2026-02-12 18:25 Full regression
- Command: `pnpm vitest run`
- Key output: `Test Files 112 passed (112), Tests 1345 passed (1345)`
- Command: `pnpm typecheck`
- Key output: Clean exit (0)

### 2026-02-12 18:30 CI windows-e2e fix (PR #453)
- 4 E2E failures on PR #452: 2 caused by debounce (command-palette shortcut toggle tests), 2 pre-existing flaky (theme timeout, system-dialog)
- Fix: Added 350ms `waitForTimeout` between toggle presses in `command-palette.spec.ts` to respect 300ms debounce window
- layout-panels marked "flaky" by Playwright (passed on retry) — not our regression
- PR #453 CI: all checks green (ci ✓, openspec-log-guard ✓, merge-serial ✓, windows-e2e ✓)

### 2026-02-12 18:52 Closure
- PR #452 merged to main (squash) — main feature delivery
- PR #453 merged to main (squash) — E2E debounce fix
- Control plane synced: `git pull origin main` — fast-forward to 5353605c
- Worktree removed: `.worktrees/issue-451-p5-05-hardening-gate`
- Local branches deleted: `task/451-p5-05-hardening-gate`, `fix/451-e2e-debounce-wait`
