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

### 2026-02-12 18:52 Closure (initial)

- PR #452 merged to main (squash) — main feature delivery
- PR #453 merged to main (squash) — E2E debounce fix
- Control plane synced: `git pull origin main` — fast-forward to 5353605c
- Worktree removed: `.worktrees/issue-451-p5-05-hardening-gate`
- Local branches deleted: `task/451-p5-05-hardening-gate`, `fix/451-e2e-debounce-wait`

### 2026-02-12 19:05 Audit fix — reopened from archive

审计发现 7 项缺陷，change 从 `archive/` 移回 `openspec/changes/` 进行修复。

#### 问题 1 (P0): matchMedia 系统主题跟随无测试

- **原因**: TDD mapping 2.3 映射到 themeStore.test.ts，但 matchMedia 逻辑在 App.tsx
- **修复**: 新建 `renderer/src/App.test.tsx`，8 条测试覆盖：
  - system mode + OS dark → data-theme=dark
  - system mode + OS light → data-theme=light
  - OS 切换 dark→light 自动跟随
  - OS 切换 light→dark 自动跟随
  - explicit dark 不跟随 OS
  - explicit light 不跟随 OS
  - store mode 从 dark 切换到 system
  - unmount 清理 matchMedia listener
- **结果**: 8 passed (8)

#### 问题 2 (P0): NFR 性能测试完全缺失

- **原因**: `tests/perf/workbench-nfr.benchmark.test.ts` 未创建且在 vitest include 范围外
- **修复**: 新建 `renderer/src/stores/workbench-nfr.benchmark.test.ts`，7 条测试：
  - Layout 初始化 < 50ms（含有效值 + 非法值回退）
  - Sidebar toggle < 5ms 单次，100 次 < 100ms
  - 5000 项过滤 < 200ms
  - 最近项目列表上限 200
  - 命令面板单次返回上限 300
- **结果**: 7 passed (7)

#### 问题 3 (P1): Resizer hover 样式无测试

- **原因**: CSS pseudo-element `:hover::before` 在 JSDOM 中不可测
- **修复**: Resizer.test.tsx 新增 2 条测试验证 `cn-resizer` class 和 `role=separator`，注释记录 JSDOM 限制 + Storybook 视觉覆盖方案
- **结果**: 15 passed (15)

#### 问题 4 (P1): commandPalette zod 校验未实现

- **原因**: proposal 承诺但 delta spec 遗漏
- **修复**:
  - `CommandPalette.tsx` 新增 `commandItemSchema` (zod) + `validateCommandItems()`
  - 接入 `const commands = validateCommandItems(customCommands ?? defaultCommands)`
  - `CommandPalette.test.tsx` 新增 5 条 zod 测试（空 id、空 label、非法 category、合法 category、默认命令 pass-through）
  - delta spec 新增「命令面板输入校验」Scenario
- **结果**: 37 passed (37)

#### 问题 5 (P2): RightPanel Storybook 缺折叠按钮态

- **修复**: `RightPanel.stories.tsx` 新增 `WithCollapseButton` story（传入 `onCollapse` prop）

#### 问题 6 (P2): debounce hook 未提取

- **修复**:
  - 新建 `hooks/useDebouncedCallback.ts`（通用 hook，leading-edge debounce）
  - 新建 `hooks/useDebouncedCallback.test.ts`，5 条测试
  - `AppShell.tsx` 重构：移除内联 ref-based debounce，改用 `useDebouncedCallback`
- **结果**: useDebouncedCallback 5 passed; AppShell 23 passed（含 debounce 测试）

#### 问题 7 (P2): tasks.md checkbox 全部未勾选

- **修复**: 全部 checkbox 更新为 `[x]`，审计修复项标注「审计修复」注释

### 2026-02-12 19:14 Full regression after audit fix

- Command: `node_modules/.bin/vitest run`
- Key output: `Test Files 115 passed (115), Tests 1372 passed (1372)`
- Duration: 27.22s
- 新增测试统计: +27 条（App 8 + NFR 7 + Resizer 2 + CommandPalette zod 5 + useDebouncedCallback 5）
