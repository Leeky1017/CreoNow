# ISSUE-25

- Issue: #25
- Branch: task/25-p0-014-project-lifecycle-current-project
- PR: <fill-after-created>

## Plan

- 实现 project IPC + ProjectService（create/list/setCurrent/getCurrent/delete）
- 创建项目时 ensure `<projectRoot>/.creonow/` 目录结构并提供可测 status
- Renderer 增加 welcome-screen + create-project-dialog，并补齐 Windows E2E

## Runs

### 2026-01-31 15:15 contract + e2e

- Command: `pnpm -s contract:generate`
- Key output: `(no output)`

- Command: `pnpm -C apps/desktop test:e2e -- project-lifecycle.spec.ts`
- Key output: `1 passed`

### 2026-01-31 15:20 typecheck + lint

- Command: `pnpm -C apps/desktop typecheck`
- Key output: `exit 0`

- Command: `pnpm -C apps/desktop lint`
- Key output: `exit 0`

### 2026-01-31 15:24 preflight formatting

- Command: `scripts/agent_pr_preflight.sh`
- Key output: `PRE-FLIGHT FAILED: prettier --check`

- Command: `pnpm exec prettier --write <files>`
- Key output: `formatted files`
