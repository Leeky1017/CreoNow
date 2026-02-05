# ISSUE-200

- Issue: #200
- Branch: task/200-version-history-read
- PR: <fill-after-created>

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
