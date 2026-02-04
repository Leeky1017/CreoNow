# ISSUE-161

- Issue: #161
- Branch: task/161-e2e-frozen-fix
- PR: <fill-after-created>

## Plan

1. 使用单独的 __CN_E2E_ENABLED__ 属性暴露 E2E 模式标志
2. 避免 contextBridge frozen object 问题

## Runs

### 2026-02-04 16:30 Fix frozen object issue

- Problem: contextBridge.exposeInMainWorld creates frozen objects
- main.tsx cannot set ready=true on frozen object
- Solution: Use separate __CN_E2E_ENABLED__ property for E2E flag

### Files modified

- `preload/src/index.ts` - Use __CN_E2E_ENABLED__ instead of __CN_E2E__.enabled
- `renderer/src/global.d.ts` - Update type definitions
- `renderer/src/main.tsx` - Remove enabled property
- `renderer/src/stores/onboardingStore.tsx` - Use __CN_E2E_ENABLED__
