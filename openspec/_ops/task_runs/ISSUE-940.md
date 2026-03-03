# RUN_LOG: ISSUE-940

更新时间：2026-03-03 15:00

- Issue: #940
- Branch: `task/940-fe-visual-noise-reduction`
- Change: `fe-visual-noise-reduction`
- PR: (待回填)

## Dependency Sync Check

前置依赖均已合并到 main：
- `fe-feature-focus-visible-coverage` ✓ (PR #928)
- `fe-rightpanel-ai-tabbar-layout` ✓ (PR #801)
- `fe-rightpanel-ai-guidance-and-style` ✓ (PR #809)
- `fe-leftpanel-dialog-migration` ✓ (PR #808)

当前分支基于最新 main (b4d5d655)，无上游漂移。

## Runs

### Red 阶段

```
$ pnpm -C apps/desktop test:run features/__tests__/visual-noise-guard
3 tests | 3 failed

S1: expected 10 to be less than or equal to 5   → ❌
S2: 8 × border-[var(--color-border-default)]    → ❌
S3: 12 separator violations (8 directional + 4 bg-divider) → ❌
```

### Green 阶段

修改文件:
- AiPanel.tsx: 移除 user-request/judge-result/usage-stats/selection-reference 边框; CodeBlock header → --color-separator
- ChatHistory.tsx, ModelPicker.tsx, ModePicker.tsx: popover header border-b → --color-separator
- DashboardPage.tsx: card wrappers → border-transparent; separators → --color-separator; tag badge → --color-separator
- SettingsGeneral.tsx, SettingsAccount.tsx, SettingsAppearancePage.tsx, SettingsExport.tsx: divider bg → --color-separator; card border removed
- SettingsDialog.tsx: sidebar border-r → --color-separator

```
$ pnpm -C apps/desktop test:run features/__tests__/visual-noise-guard
3 tests | 3 passed ✅
```

### 全量回归

```
$ pnpm -C apps/desktop test:run
Test Files  244 passed (244)
Tests       1731 passed (1731)

$ pnpm typecheck
0 errors ✅
```

## Main Session Audit
(由主会话填写，子代理不填)
