# ISSUE-21

- Issue: #21
- Branch: task/21-p0-004-sqlite-bootstrap-migrations-logs
- PR: <fill-after-created>

## Plan

- 引入 SQLite 持久化底座（db path + init + migrations）
- 增加 main.log 结构化日志并在启动时写入 `db_ready`
- Windows Playwright E2E 断言 db + tables + logs 证据

## Runs

### 2026-01-31 13:58 desktop e2e

- Command: `pnpm -C apps/desktop test:e2e`
- Key output: `electron-rebuild ✔ Rebuild Complete; playwright 3 passed`
- Evidence: `apps/desktop/tests/e2e/db-bootstrap.spec.ts`（断言 `creonow.db` + `db_ready`）

### 2026-01-31 14:01 preflight

- Command: `scripts/agent_pr_preflight.sh`
- Key output: `prettier/typecheck/lint/contract:check/test:unit ✅`
- Evidence: `scripts/agent_pr_preflight.py`
