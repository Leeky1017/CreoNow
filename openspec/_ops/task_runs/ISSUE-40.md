# ISSUE-40
- Issue: #40
- Branch: task/40-p0-007-ai-diff-apply
- PR: <fill-after-created>

## Plan
- Add AI diff view + apply selection flow
- Ensure actor=ai versions + conflict detection
- Add Windows E2E coverage + log evidence

## Runs

### 2026-01-31 19:41 worktree + rulebook
- Command: `scripts/agent_worktree_setup.sh 40 p0-007-ai-diff-apply`
- Key output: `Worktree created: .worktrees/issue-40-p0-007-ai-diff-apply`
- Evidence: `.worktrees/issue-40-p0-007-ai-diff-apply/openspec/_ops/task_runs/ISSUE-40.md`

### 2026-01-31 19:41 deps + contract
- Command: `pnpm install && pnpm contract:generate`
- Key output: `contract:generate ... tsx scripts/contract-generate.ts`
- Evidence: `packages/shared/types/ipc-generated.ts`

### 2026-01-31 19:41 typecheck
- Command: `pnpm typecheck`
- Key output: `tsc --noEmit`
- Evidence: `pnpm typecheck`

### 2026-01-31 19:41 unit
- Command: `pnpm test:unit`
- Key output: `... unifiedDiff.test.ts`
- Evidence: `apps/desktop/tests/unit/unifiedDiff.test.ts`

### 2026-01-31 19:41 e2e
- Command: `pnpm desktop:test:e2e`
- Key output: `14 passed`
- Evidence: `apps/desktop/tests/e2e/ai-apply.spec.ts`
