# ISSUE-17

- Issue: #17
- Branch: task/17-p0-002-ipc-contract-codegen
- PR: <fill-after-created>

## Plan

- 落地 IPC contract SSOT + codegen，生成共享 types 并在 CI 阻断漂移
- Preload 提供 typed invoke gate（唯一入口：`window.creonow.invoke`）
- Windows E2E 通过 `window.creonow.invoke('app:ping', {})` 验证契约链路

## Runs

### 2026-01-31 00:00 +0000 issue

- Command: `gh issue create -t "[CNWB-P0] P0-002: IPC contract SSOT + codegen" -b "..."`
- Key output: `https://github.com/Leeky1017/CreoNow/issues/17`

### 2026-01-31 00:00 +0000 worktree

- Command: `scripts/agent_worktree_setup.sh 17 p0-002-ipc-contract-codegen`
- Key output: `Worktree created: .worktrees/issue-17-p0-002-ipc-contract-codegen`

### 2026-01-31 00:00 +0000 rulebook task

- Command: `rulebook task create issue-17-p0-002-ipc-contract-codegen`
- Key output: `✅ Task issue-17-p0-002-ipc-contract-codegen created successfully`
- Command: `rulebook task validate issue-17-p0-002-ipc-contract-codegen`
- Key output: `✅ Task issue-17-p0-002-ipc-contract-codegen is valid`

### 2026-01-31 00:00 +0000 checks

- Command: `pnpm typecheck && pnpm lint && pnpm contract:check && pnpm test:unit`
- Key output: `exit 0`
- Command: `pnpm -C apps/desktop test:e2e`
- Key output: `1 passed`
