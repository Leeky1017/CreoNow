# ISSUE-163

- Issue: #163
- Branch: task/163-proxy-e2e-fix
- PR: <fill-after-created>

## Plan

1. 修复 proxy-error-semantics.spec.ts 使用 CREONOW_E2E=1

## Runs

### 2026-02-04 16:40 Fix proxy E2E tests

- Problem: proxy-error-semantics.spec.ts uses CREONOW_E2E=0, cannot skip onboarding
- Solution: Change to CREONOW_E2E=1 to enable E2E mode
