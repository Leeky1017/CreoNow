# ISSUE-33
- Issue: #33
- Branch: task/33-p0-006-ai-runtime-fake-provider
- PR: <fill-after-created>

## Plan
- Add AI IPC contract + handlers (run/cancel/feedback + stream).
- Implement main AI service with Fake-first provider, cancel/timeout, and error mapping.
- Add renderer AI panel/store + Windows E2E coverage.

## Runs
### 2026-01-31 16:50 setup
- Command: `gh issue create -t "[CN-V1] P0-006: AI Runtime (Fake-first stream/cancel/timeout)" ...`
- Key output: `https://github.com/Leeky1017/CreoNow/issues/33`
- Evidence: issue #33

### 2026-01-31 16:50 worktree
- Command: `scripts/agent_worktree_setup.sh 33 p0-006-ai-runtime-fake-provider`
- Key output: `Worktree created: .worktrees/issue-33-p0-006-ai-runtime-fake-provider`
- Evidence: branch `task/33-p0-006-ai-runtime-fake-provider`

### 2026-01-31 17:08 rulebook
- Command: `rulebook task validate issue-33-p0-006-ai-runtime-fake-provider`
- Key output: `✅ Task issue-33-p0-006-ai-runtime-fake-provider is valid`
- Evidence: `rulebook/tasks/issue-33-p0-006-ai-runtime-fake-provider/`

### 2026-01-31 17:08 deps + typecheck
- Command: `pnpm install`
- Key output: `Done in 1.6s`
- Evidence: node_modules present

### 2026-01-31 17:08 contract
- Command: `pnpm contract:generate`
- Key output: generated `packages/shared/types/ipc-generated.ts`
- Evidence: `packages/shared/types/ipc-generated.ts`

### 2026-01-31 17:08 typecheck
- Command: `pnpm typecheck`
- Key output: exit 0
- Evidence: `tsc --noEmit` clean

### 2026-01-31 17:30 unit
- Command: `pnpm test:unit`
- Key output: exit 0
- Evidence: `apps/desktop/tests/unit/contract-generate.spec.ts` + `apps/desktop/tests/unit/derive.test.ts`

### 2026-01-31 17:30 lint
- Command: `pnpm lint`
- Key output: exit 0
- Evidence: eslint clean

### 2026-01-31 17:30 e2e
- Command: `pnpm desktop:test:e2e`
- Key output: `10 passed (7.4s)`
- Evidence: includes `apps/desktop/tests/e2e/ai-runtime.spec.ts`

### 2026-01-31 17:31 contract gate
- Command: `pnpm contract:check`
- Key output: exit 0
- Evidence: `packages/shared/types/ipc-generated.ts` matches SSOT
