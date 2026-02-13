# ISSUE-515

- Issue: #515
- Branch: task/515-agents-rewrite-ai-runtime
- PR: https://github.com/Leeky1017/CreoNow/pull/516

## Plan

- 重写 `AGENTS.md`（按 `AGENTS撰写.md` 的结构与写法约束，去冗余、可回查）。
- 新增并落盘 `docs/references/*`，并同步更新 `docs/delivery-rule-mapping.md` 的章节引用。
- 增加确定性的 AI Service 回归测试（provider unavailable + stream/non-stream 多轮链路一致）。
- 通过 `ci` / `openspec-log-guard` / `merge-serial`，启用 auto-merge 并完成控制面 `main` 收口。

## Runs

### 2026-02-13 20:11 issue-created

- Command: `gh issue create ...`
- Key output: issue `#515` created
- Result: ✅
- Evidence: `https://github.com/Leeky1017/CreoNow/issues/515`

### 2026-02-13 20:12 controlplane-sync-and-worktree

- Command: `scripts/agent_controlplane_sync.sh && scripts/agent_worktree_setup.sh 515 agents-rewrite-ai-runtime`
- Key output: controlplane fast-forwarded; worktree created at `.worktrees/issue-515-agents-rewrite-ai-runtime` on `task/515-agents-rewrite-ai-runtime`
- Result: ✅
- Evidence: `.worktrees/issue-515-agents-rewrite-ai-runtime/`

### 2026-02-13 20:23 rulebook-init

- Command: `rulebook task create issue-515-agents-rewrite-ai-runtime && rulebook task validate issue-515-agents-rewrite-ai-runtime`
- Key output: task created; validate passed (warning: no spec files)
- Result: ✅
- Evidence: `rulebook/tasks/issue-515-agents-rewrite-ai-runtime/`

### 2026-02-13 20:15 agents-rewrite

- Command: update `AGENTS.md`; add `docs/references/*`; update `docs/delivery-rule-mapping.md`
- Key output: AGENTS 改为 P1–P7 核心原则 + 7 章结构；补充禁令 ≤5；外部参考文件统一索引
- Result: ✅
- Evidence: `AGENTS.md`, `docs/references/*`, `docs/delivery-rule-mapping.md`

### 2026-02-13 20:26 ai-service-regression-tests

- Command: add deterministic tests under `apps/desktop/main/src/services/ai/__tests__`
- Key output: coverage for provider-unavailable and stream/non-stream multi-turn payload assembly
- Result: ✅
- Evidence: `apps/desktop/main/src/services/ai/__tests__/aiService-provider-unavailable.test.ts`, `apps/desktop/main/src/services/ai/__tests__/aiService-runtime-multiturn.test.ts`

### 2026-02-13 20:30 local-verification

- Command:
  - `pnpm install --frozen-lockfile`
  - `pnpm exec prettier --check ...`
  - `pnpm typecheck && pnpm lint && pnpm contract:check && pnpm cross-module:check`
  - `pnpm test:unit`
- Key output: dependencies installed (lockfile unchanged); Prettier/typecheck/lint/contract/cross-module/unit all passed.
- Result: ✅
- Evidence: `scripts/agent_pr_preflight.py` output (see PR logs), `pnpm test:unit` output.

### 2026-02-13 20:45 pr-and-merge

- Command: `scripts/agent_pr_automerge_and_sync.sh`
- Key output: PR `#516` created; RUN_LOG PR link backfilled; required checks (`ci` / `openspec-log-guard` / `merge-serial`) green; merged to `main` with merge commit `904a1658`.
- Result: ✅
- Evidence: `https://github.com/Leeky1017/CreoNow/pull/516`
