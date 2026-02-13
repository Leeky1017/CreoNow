# RUN_LOG: ISSUE-499 — Fix KG aliases IPC contract drift

## Metadata

- Issue: #499
- Change: `openspec/changes/issue-499-fix-kg-aliases-ipc-contract`
- Branch: `task/499-fix-kg-aliases-ipc-contract`
- PR: (待回填)

## Plan

1. Admission: confirm OPEN issue #499 and isolated worktree branch.
2. Spec/Rulebook-first: create F499 change docs + EXECUTION_ORDER sync + validate rulebook task.
3. TDD: write failing runtime-contract regression test, then minimal fix.
4. Verification: run target + regression + contract/type checks.
5. Closure: preflight, auto-merge, sync control-plane `main`, archive task artifacts.

## Runs

### 2026-02-13 Admission / Issue

```bash
$ gh issue view 499 --json number,state,title,url
{"number":499,"state":"OPEN","title":"Fix Windows E2E: knowledge:entity:list INTERNAL_ERROR after aliases","url":"https://github.com/Leeky1017/CreoNow/issues/499"}
```

结果：任务入口 issue 为 OPEN。

### 2026-02-13 Environment Isolation

```bash
$ git worktree list --porcelain
worktree /home/leeky/work/CreoNow
HEAD abf70233aafd79aa80186e580318683cb59196d8
branch refs/heads/main

worktree /home/leeky/work/CreoNow/.worktrees/issue-499-fix-kg-aliases-ipc-contract
HEAD abf70233aafd79aa80186e580318683cb59196d8
branch refs/heads/task/499-fix-kg-aliases-ipc-contract
```

结果：`task/499-fix-kg-aliases-ipc-contract` worktree 已隔离。

### 2026-02-13 Spec/Rulebook First

```bash
$ rulebook task validate issue-499-fix-kg-aliases-ipc-contract
✅ Task issue-499-fix-kg-aliases-ipc-contract is valid

⚠️  Warnings:
  - No spec files found (specs/*/spec.md)
```

结果：Rulebook task validate 通过（仅 warning，不阻断）。

### 2026-02-13 Environment Bootstrap

```bash
$ pnpm install --frozen-lockfile
Lockfile is up to date, resolution step is skipped
Done in 1.9s
```

结果：worktree 依赖安装完成。

### 2026-02-13 TDD Red

```bash
$ pnpm tsx apps/desktop/tests/unit/kg/entity-list-runtime-contract-aliases.test.ts
AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:

false !== true
```

结果：目标测试先失败，复现了 `knowledge:entity:list` 未返回 `ok: true` 的故障（响应契约漂移）。

### 2026-02-13 TDD Green + Regression

```bash
$ pnpm contract:generate
# exit code 0

$ pnpm tsx apps/desktop/tests/unit/kg/entity-list-runtime-contract-aliases.test.ts
# exit code 0

$ pnpm tsx apps/desktop/tests/integration/kg/relation-delete.test.ts
# exit code 0

$ pnpm -C apps/desktop typecheck
# exit code 0
```

结果：目标测试与关键回归、类型检查通过。

### 2026-02-13 Contract Gate

```bash
$ pnpm contract:check
... git diff --exit-code packages/shared/types/ipc-generated.ts
# 首次失败：提示 ipc-generated.ts 与契约变更不一致（需要纳入本次提交）

$ git add packages/shared/types/ipc-generated.ts && pnpm contract:check
# exit code 0
```

结果：契约生成产物已与 schema 对齐，contract gate 通过。

### 2026-02-13 Delivery

```bash
$ scripts/agent_pr_automerge_and_sync.sh
# (待执行)
```

结果：待执行。
