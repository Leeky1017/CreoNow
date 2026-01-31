# ISSUE-32

- Issue: #32
- Branch: task/32-p0-013-constraints-judge
- PR: <fill-after-created>

## Plan

- 实现 constraints IPC：SSOT `.creonow/rules/constraints.json`（get/set + 校验 + 可观测日志）
- 实现 judge 状态机 + IPC：`judge:model:getState/ensure`（Windows E2E 可测降级；稳定错误码）
- renderer Settings 增加 `JudgeSection`，并补齐 Integration + Windows E2E

## Runs

### 2026-01-31 17:01 setup + contract + typecheck

- Command: `rulebook task validate issue-32-p0-013-constraints-judge`
- Key output: `✅ Task issue-32-p0-013-constraints-judge is valid`

- Command: `pnpm install --frozen-lockfile || pnpm install`
- Key output: `Done in 1.4s`

- Command: `pnpm -s contract:generate`
- Key output: `(no output)`

- Command: `pnpm typecheck`
- Key output: `exit 0`

### 2026-01-31 17:02 unit tests

- Command: `pnpm test:unit`
- Key output: `exit 0`

### 2026-01-31 17:22 db migration update (typecheck)

- Command: `pnpm typecheck`
- Key output: `exit 0`

### 2026-01-31 17:32 verify (lint + tests)

- Command: `pnpm lint`
- Key output: `exit 0`

- Command: `pnpm test:unit`
- Key output: `exit 0`

- Command: `pnpm test:integration`
- Key output: `exit 0`

- Command: `pnpm -C apps/desktop test:e2e -- judge.spec.ts db-bootstrap.spec.ts`
- Key output: `2 passed`
