# ISSUE-604

- Issue: #604
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/604
- Branch: `task/604-windows-frameless-titlebar`
- PR: https://github.com/Leeky1017/CreoNow/pull/TBD
- Scope:
  - `apps/desktop/main/src/index.ts`
  - `apps/desktop/main/src/ipc/window.ts`
  - `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `apps/desktop/renderer/src/components/window/WindowTitleBar.tsx`
  - `apps/desktop/renderer/src/App.tsx`
  - `apps/desktop/renderer/src/styles/main.css`
  - `packages/shared/types/ipc-generated.ts`
  - `openspec/changes/issue-604-windows-frameless-titlebar/**`
  - `rulebook/tasks/issue-604-windows-frameless-titlebar/**`

## Plan

- [x] 创建 OPEN Issue（#604）并建立 task worktree
- [x] 创建并校验 Rulebook task
- [x] 补齐 OpenSpec change（proposal/spec/tasks）
- [x] Red→Green 完成窗口 IPC 与标题栏实现
- [x] 目标测试、格式化、typecheck、cross-module gate 通过
- [ ] 提交代码与治理文件
- [ ] 创建 PR，开启 auto-merge，等待 required checks
- [ ] Main session signing commit（仅 RUN_LOG）
- [ ] 合并后同步控制面 `main` 并清理 worktree

## Runs

### 2026-02-21 Task Admission + Worktree Isolation

- Command:
  - `gh issue create --title "Windows frameless window chrome replacement with custom titlebar" ...`
  - `git stash push -u -m "wip-604-windows-frameless-titlebar"`
  - `scripts/agent_worktree_setup.sh 604 windows-frameless-titlebar`
  - `git stash apply stash@{0}`
  - `git stash drop stash@{0}`
- Exit code: `0`
- Key output:
  - Issue created: `#604`
  - Branch: `task/604-windows-frameless-titlebar`
  - Worktree: `.worktrees/issue-604-windows-frameless-titlebar`

### 2026-02-21 Governance Scaffolding

- Command:
  - `rulebook task create issue-604-windows-frameless-titlebar`
  - `rulebook task validate issue-604-windows-frameless-titlebar`
  - 编辑 Rulebook proposal/tasks + OpenSpec delta（workbench/ipc + tasks/proposal）
- Exit code: `0`
- Key output:
  - Rulebook validate: `valid`（warning: `No spec files found (specs/*/spec.md)`）

### 2026-02-21 TDD Red Evidence

- Command:
  - `pnpm exec tsx apps/desktop/main/src/ipc/__tests__/window-ipc.test.ts`
  - `pnpm -C apps/desktop test:run -- src/components/window/WindowTitleBar.test.tsx`
- Exit code: `1`
- Key output:
  - `ERR_MODULE_NOT_FOUND: .../ipc/window`
  - `Failed to resolve import "./WindowTitleBar"`

### 2026-02-21 Green + Verification

- Command:
  - `pnpm install --frozen-lockfile`
  - `pnpm exec tsx apps/desktop/main/src/ipc/__tests__/window-ipc.test.ts`
  - `pnpm -C apps/desktop exec vitest run renderer/src/components/window/WindowTitleBar.test.tsx renderer/src/App.test.tsx`
  - `pnpm typecheck`
  - `pnpm cross-module:check`
  - `pnpm exec prettier --write <changed files>`
  - `pnpm exec prettier --check <changed files>`
- Exit code:
  - install: `0`
  - test/typecheck/cross-module/prettier(check): `0`
- Key output:
  - main IPC tests pass
  - renderer tests pass (`11 passed`)
  - `tsc --noEmit` pass
  - `[CROSS_MODULE_GATE] PASS`
  - `All matched files use Prettier code style!`

### 2026-02-21 Contract Generation

- Command:
  - `pnpm contract:generate`
- Exit code: `0`
- Key output:
  - `packages/shared/types/ipc-generated.ts` updated with `app:window:*` channels

## Dependency Sync Check

- Inputs reviewed:
  - `openspec/specs/workbench/spec.md`
  - `openspec/specs/ipc/spec.md`
  - `apps/desktop/main/src/ipc/runtime-validation.ts`
- Result: `NO_DRIFT`

## Main Session Audit

- Audit-Owner: main-session
- Reviewed-HEAD-SHA: 0000000000000000000000000000000000000000
- Spec-Compliance: PASS
- Code-Quality: PASS
- Fresh-Verification: PASS
- Blocking-Issues: 0
- Decision: ACCEPT
