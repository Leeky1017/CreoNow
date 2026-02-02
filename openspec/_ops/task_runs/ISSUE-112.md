# ISSUE-112

- Issue: #112
- Branch: task/112-search-fts-agent-local-rerank
- PR: https://github.com/Leeky1017/CreoNow/pull/115

## Plan

- Keep lexical-first recall via SQLite FTS5 and add observable query planning diagnostics.
- Add optional local embedding rerank for topN candidates with explicit `MODEL_NOT_READY` degrade semantics.
- Align `rag:retrieve` output + viewer and add tests for rerank enabled/disabled paths.

## Runs

### 2026-02-02 bootstrap (controlplane)

- Command: `gh auth status && git remote -v`
- Key output: `Logged in to github.com` / `origin https://github.com/Leeky1017/CreoNow.git`
- Evidence: Local terminal output

### 2026-02-02 bootstrap (issue)

- Command: `gh issue create -t "Search: FTS+Agent query planning + local embedding rerank" -b "<...>"`
- Key output: `https://github.com/Leeky1017/CreoNow/issues/112`
- Evidence: Issue #112

### 2026-02-02 worktree

- Command: `scripts/agent_worktree_setup.sh 112 search-fts-agent-local-rerank`
- Key output: `Worktree created: .worktrees/issue-112-search-fts-agent-local-rerank`
- Evidence: Local terminal output

### 2026-02-02 rulebook task

- Command: `rulebook task create issue-112-search-fts-agent-local-rerank`
- Key output: `Task issue-112-search-fts-agent-local-rerank created successfully`
- Evidence: `rulebook/tasks/issue-112-search-fts-agent-local-rerank/`

### 2026-02-02 rulebook validate

- Command: `rulebook task validate issue-112-search-fts-agent-local-rerank`
- Key output: `Task issue-112-search-fts-agent-local-rerank is valid`
- Evidence: `rulebook/tasks/issue-112-search-fts-agent-local-rerank/`

### 2026-02-02 deps

- Command: `pnpm install`
- Key output: `Done in 3s`
- Evidence: Local terminal output

### 2026-02-02 contract

- Command: `pnpm contract:generate`
- Key output: `scripts/contract-generate.ts`
- Evidence: `packages/shared/types/ipc-generated.ts`

### 2026-02-02 unit tests

- Command: `pnpm test:unit`
- Key output: `exit 0`
- Evidence: Local terminal output

### 2026-02-02 integration tests

- Command: `pnpm test:integration`
- Key output: `exit 0`
- Evidence: Local terminal output

### 2026-02-02 type/lint

- Command: `pnpm typecheck && pnpm lint`
- Key output: `exit 0`
- Evidence: Local terminal output

### 2026-02-02 e2e (search-rag)

- Command: `pnpm -C apps/desktop test:e2e -- tests/e2e/search-rag.spec.ts`
- Key output: `3 passed`
- Evidence: `apps/desktop/test-results/` (trace/zip on failure) + Local terminal output

### 2026-02-02 push

- Command: `git push -u origin HEAD`
- Key output: `HEAD -> task/112-search-fts-agent-local-rerank`
- Evidence: Local terminal output

### 2026-02-02 pr

- Command: `gh pr create --title \"... (#112)\" --body \"Closes #112 ...\"`
- Key output: `https://github.com/Leeky1017/CreoNow/pull/115`
- Evidence: PR #115
