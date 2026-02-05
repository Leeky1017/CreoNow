# ISSUE-196

- Issue: #196
- Branch: task/196-settingsdialog-close-button
- PR: <fill-after-created>

## Plan

- Fix SettingsDialog close button positioning from `top-6 right-8` to `top-4 right-4`
- Verify in Storybook that button appears at dialog corner
- Run CI checks to ensure no regressions

## Runs

### 2026-02-05 18:55 Initial fix

- Command: `StrReplace on SettingsDialog.tsx`
- Key output: Changed `top-6 right-8` to `top-4 right-4` in closeButtonStyles
- Evidence: Visual confirmation in Storybook - close button now at top-right corner
