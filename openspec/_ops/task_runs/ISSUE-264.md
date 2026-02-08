# ISSUE-264

- Issue: #264
- Branch: task/264-ai-panel-model-mode-wiring
- PR: https://github.com/Leeky1017/CreoNow/pull/264

## Plan

- 修复 AI Panel 的 Mode/Model 选择器“仅 UI 生效”问题，贯通到 `ai:skill:run` 与 AI Service 上游请求。
- 严格按 TDD 执行：先 Red（失败测试）再 Green（最小实现）并保持 Refactor 后全绿。
- 完成 OpenSpec/Rulebook/RunLog 证据链并通过 preflight + required checks。

## Runs

### 2026-02-08 11:44 +0800 issue intake and branch/worktree bootstrap

- Command: `git fetch origin main`
- Key output: `From ... main -> FETCH_HEAD`
- Command: `git worktree add -b task/264-ai-panel-model-mode-wiring .worktrees/issue-264-ai-panel-model-mode-wiring origin/main`
- Key output: `Preparing worktree ... HEAD is now at ...`

### 2026-02-08 11:45 +0800 specification bootstrap

- Command: `add openspec/changes/ai-panel-model-mode-wiring/*`
- Key output: 新增 `proposal.md`、`tasks.md`、`specs/ipc/spec.md`、`specs/ai-service/spec.md`。
- Command: `add rulebook/tasks/issue-264-ai-panel-model-mode-wiring/*`
- Key output: 新增 Rulebook `proposal.md` 与 `tasks.md`。


### 2026-02-08 13:08 +0800 dynamic model catalog wiring (proxy/BYOK)

- Command: `pnpm.cmd contract:generate`
- Key output: contract generation succeeded and refreshed `packages/shared/types/ipc-generated.ts`.
- Command: `pnpm.cmd typecheck`
- Key output: `tsc --noEmit` passed.
- Command: `pnpm.cmd exec tsx apps/desktop/tests/unit/ai-service-run-options.test.ts`
- Key output: passed.
- Command: `pnpm.cmd exec tsx apps/desktop/tests/unit/ai-store-run-request-options.test.ts`
- Key output: passed.
- Command: `pnpm.cmd exec tsx apps/desktop/tests/unit/ai-service-model-catalog.test.ts`
- Key output: passed.

### 2026-02-08 13:09 +0800 DB_ERROR root-cause confirmation

- Evidence: `C:\Users\HP\AppData\Roaming\@creonow\desktop\logs\main.log`
- Key output: `migration_failed` / `db_init_failed` with native binding mismatch (`better_sqlite3.node`, NODE_MODULE_VERSION 141 vs 143).
- Mitigation validated by user: `pnpm.cmd -C apps/desktop rebuild:native` resolves DB init and clears `Database not ready` path.

### 2026-02-08 14:18 +0800 provider mode + URL join hardening

- Command: `pnpm.cmd contract:generate`
- Key output: regenerated `packages/shared/types/ipc-generated.ts` for proxy settings provider-mode fields.
- Command: `pnpm.cmd exec tsx apps/desktop/tests/unit/ai-service-model-catalog.test.ts`
- Key output: passed (covers `/api/v1` path-prefix model catalog + non-JSON upstream mapping).
- Command: `pnpm.cmd exec tsx apps/desktop/tests/unit/ai-service-run-options.test.ts`
- Key output: passed (covers `/api/v1` path-prefix runSkill + non-JSON upstream mapping).
- Command: `pnpm.cmd exec tsx apps/desktop/tests/unit/ai-store-run-request-options.test.ts`
- Key output: passed.
- Command: `pnpm.cmd typecheck`
- Key output: `tsc --noEmit` passed.
