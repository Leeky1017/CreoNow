# ISSUE-244

- Issue: #244
- Branch: task/244-ipc-p0-contract-ssot-and-codegen
- PR: https://github.com/Leeky1017/CreoNow/pull/245

## Plan

- 执行 `openspec/changes/ipc-p0-contract-ssot-and-codegen/tasks.md` 全部条目
- 严格按 TDD：先补 Scenario→测试映射，再记录 Red 失败证据，最后 Green/Refactor
- 交付门禁：`ci`、`openspec-log-guard`、`merge-serial` 全绿并自动合并

## Runs

### 2026-02-07 22:55 +0000 issue & task bootstrap

- Command: `gh issue create --title "[IPC-P0] ipc-p0-contract-ssot-and-codegen" ...`
- Key output: `https://github.com/Leeky1017/CreoNow/issues/244`
- Command: `rulebook task create issue-244-ipc-p0-contract-ssot-and-codegen`
- Key output: `Task issue-244-ipc-p0-contract-ssot-and-codegen created successfully`
- Command: `rulebook task validate issue-244-ipc-p0-contract-ssot-and-codegen`
- Key output: `Task issue-244-ipc-p0-contract-ssot-and-codegen is valid`

### 2026-02-07 22:55 +0000 worktree setup

- Command: `scripts/agent_worktree_setup.sh 244 ipc-p0-contract-ssot-and-codegen`
- Key output: `Worktree created: .worktrees/issue-244-ipc-p0-contract-ssot-and-codegen`

### 2026-02-07 22:58 +0000 Red: environment gate

- Command: `pnpm test:unit`
- Key output: `tsx: not found`（worktree 缺少依赖，属于环境阻塞，尚未进入目标 Red）
- Command: `pnpm install --frozen-lockfile`
- Key output: `Lockfile is up to date ... Done`

### 2026-02-07 22:59 +0000 Red: failing test evidence

- Command: `pnpm test:unit`
- Key output: `SyntaxError: ... contract-generate does not provide an export named 'ContractGenerateError'`
- 结论：测试先失败，满足 Red 前置。

### 2026-02-07 23:01 +0000 Green: implementation

- Command: `pnpm exec tsx apps/desktop/tests/unit/contract-generate.validation.spec.ts`
- Key output: `exit 0`
- Command: `pnpm test:unit`
- Key output: `ERR_DLOPEN_FAILED better-sqlite3 NODE_MODULE_VERSION 143 vs 115`（原生模块 ABI 不匹配）
- Command: `npm run install`（目录：`node_modules/.pnpm/better-sqlite3@12.6.2/node_modules/better-sqlite3`）
- Key output: `prebuild-install || node-gyp rebuild --release`
- Command: `pnpm test:unit`
- Key output: `all assertions passed`（含新增 `contract-generate.validation.spec.ts`）
- Command: `pnpm contract:check`
- Key output: `pnpm contract:generate && git diff --exit-code ...` 通过

### 2026-02-07 23:07 +0000 Refactor & preflight

- Command: `pnpm typecheck`
- Key output: `exit 0`
- Command: `pnpm lint`
- Key output: `0 errors, 4 warnings`（既有 warnings，非本次引入）
- Command: `scripts/agent_pr_preflight.sh`
- Key output: 首次失败：`EXECUTION_ORDER.md missing required section/field: ## 执行顺序`
- 修复：更新 `openspec/changes/EXECUTION_ORDER.md` 标题与更新时间
- Command: `scripts/agent_pr_preflight.sh`（二次）
- Key output: `typecheck/lint/contract:check/test:unit` 全通过（lint 仅 warnings）
