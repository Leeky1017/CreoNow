# ISSUE-27

- Issue: #27
- Branch: task/27-p0-005-editor-ssot-autosave-versioning
- PR: <fill-after-created>

## Plan

- 实现 editor SSOT（DB）+ autosave 状态机 + versioning（actor=user/auto）
- 扩展 IPC contract（file/version）并确保 derived 生成 deterministic
- Windows E2E：输入→autosave→重启恢复，并断言 version 证据

## Runs

### 2026-01-31 15:36 install deps

- Command: `pnpm install --no-frozen-lockfile`
- Key output: `Done`

### 2026-01-31 15:45 unit tests

- Command: `pnpm test:unit`
- Key output: `exit 0`

### 2026-01-31 15:49 desktop e2e

- Command: `pnpm -C apps/desktop test:e2e -- editor-autosave.spec.ts`
- Key output: `1 passed`

### 2026-01-31 16:02 preflight

- Command: `scripts/agent_pr_preflight.sh`
- Key output: `prettier/typecheck/lint/contract:check/test:unit ✅`
