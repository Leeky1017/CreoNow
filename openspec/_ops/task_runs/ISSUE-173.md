# ISSUE-173
- Issue: #173
- Branch: task/173-sync-e2e-tests
- PR: <fill-after-created>

## Plan
- Remove references to `ai-stream-toggle` (element removed in UI refactoring)
- Remove references to `ai-status` (element removed in UI refactoring)
- Update E2E tests to work with new Send/Stop button behavior

## Runs
### 2026-02-04 21:40 Analysis
- E2E tests failing due to missing UI elements after AI Panel refactoring
- `ai-stream-toggle` - removed (no Stream checkbox in new UI)
- `ai-status` - removed (no status display in new UI)

### 2026-02-04 21:45 Fix Implementation
- Updated ai-runtime.spec.ts:
  - Replaced `setStreamEnabled()` with `waitForAiReady()`
  - Removed all `ai-status` assertions
- Updated skills.spec.ts:
  - Removed stream toggle usage
  - Removed `ai-status` assertions
