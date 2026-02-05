# ISSUE-200

- Issue: #200
- Branch: task/200-version-history-read
- PR: https://github.com/Leeky1017/CreoNow/pull/202

## Plan

1. 新增 `version:read` IPC (contract + handler + documentService)
2. 更新 renderer 侧 useVersionCompare 使用真实 IPC
3. 更新 Sidebar/AppShell 接入真实版本数据
4. 添加 E2E 测试

## Runs

### 2026-02-05 Initial Setup
- Command: `gh issue create` + `agent_worktree_setup.sh`
- Key output: Issue #200 created, worktree ready
- Evidence: https://github.com/Leeky1017/CreoNow/issues/200

### 2026-02-05 Implementation Complete
- Command: `pnpm typecheck && pnpm lint && npx playwright test tests/e2e/version-history.spec.ts`
- Key output:
  - typecheck: passed
  - lint: no new errors
  - E2E: 3 passed (6.7s)
- Evidence:
  - PR: https://github.com/Leeky1017/CreoNow/pull/202
  - Files changed: 13 files, +1008 -36 lines
