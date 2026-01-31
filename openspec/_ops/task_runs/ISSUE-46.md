# ISSUE-46

- Issue: #46
- Branch: task/46-ai-skill-run-input-order
- PR: https://github.com/Leeky1017/CreoNow/pull/49

## Plan

- Reproduce E2E failure + root cause
- Fix prompt injection ordering (keep raw input last)
- Add regression unit test + rerun E2E

## Runs

### 2026-01-31 20:34 bootstrap

- Command: `gh issue create -t "P0-010 regression: ai:skill:run prompt injection breaks E2E ai-apply" -b "<...>"`
- Key output: `https://github.com/Leeky1017/CreoNow/issues/46`
- Evidence: `openspec/_ops/task_runs/ISSUE-46.md`

### 2026-01-31 20:34 worktree

- Command: `scripts/agent_worktree_setup.sh "46" "ai-skill-run-input-order"`
- Key output: `Worktree created: .worktrees/issue-46-ai-skill-run-input-order`
- Evidence: `.worktrees/issue-46-ai-skill-run-input-order`

### 2026-01-31 21:07 repro + verify

- Command: `pnpm desktop:test:e2e`
- Key output: `ai-apply.spec.ts failed: expected "E2E_RESULT: replace-world" (prompt injection polluted fake output)`
- Evidence: `apps/desktop/tests/e2e/ai-apply.spec.ts`

### 2026-01-31 21:07 unit regression (red→green)

- Command: `pnpm exec tsx apps/desktop/tests/unit/ai-skill-prompt-ordering.test.ts`
- Key output: `AssertionError (before fix) then exit 0 (after fix)`
- Evidence: `apps/desktop/tests/unit/ai-skill-prompt-ordering.test.ts`

### 2026-01-31 21:07 verification (green)

- Command: `pnpm typecheck && pnpm test:unit && pnpm lint && pnpm desktop:test:e2e`
- Key output: `typecheck OK; unit OK; lint OK; e2e OK (16 passed)`
- Evidence: `apps/desktop/main/src/ipc/ai.ts`

### 2026-01-31 21:08 verification (exact)

- Command: `pnpm typecheck`
- Key output: `exit 0`
- Evidence: `tsconfig.json`

- Command: `pnpm test:unit`
- Key output: `exit 0`
- Evidence: `apps/desktop/tests/unit/ai-skill-prompt-ordering.test.ts`

- Command: `pnpm lint`
- Key output: `exit 0`
- Evidence: `apps/desktop/main/src/services/ai/fakeAiServer.ts`

- Command: `pnpm desktop:test:e2e`
- Key output: `16 passed`
- Evidence: `apps/desktop/tests/e2e/skills.spec.ts`
