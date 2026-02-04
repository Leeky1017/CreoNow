# ISSUE-159

- Issue: #159
- Branch: task/159-e2e-appshell-fix
- PR: <fill-after-created>

## Plan

1. 在 preload 中暴露 E2E 模式标志
2. 在 onboardingStore 中检测 E2E 模式并跳过 onboarding
3. 验证 E2E 测试通过

## Runs

### 2026-02-04 16:00 Root cause analysis

- Problem: E2E tests fail because `app-shell` element not found
- Root cause: AppRouter shows OnboardingPage when onboarding not completed
- E2E uses isolated userDataDir, so onboarding is never completed
- Solution: Expose CREONOW_E2E flag to renderer and skip onboarding in E2E mode

### 2026-02-04 16:00 Implementation

- Modified: `preload/src/index.ts` - expose `__CN_E2E__.enabled` flag
- Modified: `renderer/src/global.d.ts` - add `enabled` property to type
- Modified: `renderer/src/main.tsx` - preserve `enabled` flag when setting `ready`
- Modified: `renderer/src/stores/onboardingStore.tsx` - skip onboarding in E2E mode
