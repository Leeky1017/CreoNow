# ISSUE-330

- Issue: #330
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/330
- Branch: task/330-cross-module-gate-autofix-classification
- PR: https://github.com/Leeky1017/CreoNow/pull/331
- Scope: cross-module 门禁失败后的自动分类、开发分支安全自动修复与可选自动提交
- Out of Scope: 全量 IPC 契约迁移、CI 自动改写

## Plan

- [x] 任务准入（OPEN issue、task branch、worktree）
- [x] 完成 OpenSpec/Rulebook 规格落盘与 Dependency Sync Check
- [x] 按 TDD 完成 Red -> Green（分类 + autofix + auto-commit）
- [ ] 回归验证与 preflight
- [ ] 提交、PR、auto-merge、收口

## Runs

### 2026-02-09 12:53 任务准入与环境隔离

- Command:
  - `gh issue create --title "Add cross-module gate autofix+classification flow" ...`
  - `scripts/agent_worktree_setup.sh 330 cross-module-gate-autofix-classification`
- Exit code: `0`
- Key output:
  - Issue 创建成功：`#330`
  - worktree 创建成功：`.worktrees/issue-330-cross-module-gate-autofix-classification`

### 2026-02-09 12:54 规格初始化

- Command:
  - `rulebook task create issue-330-cross-module-gate-autofix-classification`
  - `edit openspec/changes/issue-330-cross-module-gate-autofix-classification/*`
  - `edit rulebook/tasks/issue-330-cross-module-gate-autofix-classification/*`
  - `edit openspec/changes/EXECUTION_ORDER.md`
- Exit code: `0`
- Key output:
  - 新 change proposal/tasks/spec 完成。
  - Rulebook 任务 proposal/tasks/spec 完成。

### 2026-02-09 12:56 Dependency Sync Check（依赖 issue-328）

- Input checks:
  - `scripts/cross-module-contract-gate.ts` 当前仅提供 check 判定，不提供自动修复。
  - `openspec/guards/cross-module-contract-baseline.json` 已定义 alias/missing/envelope 漂移登记语义。
  - `ci.yml` 与 preflight 当前均执行 `cross-module:check`，无自动改写行为。
- Conclusion:
  - 无依赖漂移，可进入 Red。

### 2026-02-09 12:58 Red 失败证据

- Command:
  - `pnpm exec tsx apps/desktop/tests/unit/cross-module-contract-autofix.spec.ts`
- Exit code: `1`（预期 Red）
- Key output:
  - `ERR_MODULE_NOT_FOUND: ... scripts/cross-module-contract-autofix`

### 2026-02-09 12:59-13:02 Green 实现与测试转绿

- Edited:
  - `scripts/cross-module-contract-autofix.ts`
  - `apps/desktop/tests/unit/cross-module-contract-autofix.spec.ts`
  - `package.json`
  - `scripts/README.md`
- Command:
  - `pnpm exec tsx apps/desktop/tests/unit/cross-module-contract-autofix.spec.ts`
  - `pnpm cross-module:autofix`
  - `pnpm cross-module:check`
- Exit code: `0`
- Key output:
  - 新增单测通过。
  - `cross-module:autofix` 在当前基线下 PASS。
  - `cross-module:check` 仍保持 PASS（仅输出已登记漂移）。

### 2026-02-09 13:03-13:05 回归验证

- Command:
  - `pnpm exec prettier --check ...`
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm contract:check`
  - `pnpm test:unit`
  - `rulebook task validate issue-330-cross-module-gate-autofix-classification`
- Exit code: `0`
- Key output:
  - 全部命令通过（`lint` 仅仓库既有 warnings，无 errors）。
  - Rulebook task validate 通过。

### 2026-02-09 13:07 提交、推送与 PR

- Command:
  - `git add -A && git commit -m "feat: add cross-module autofix classification flow (#330)"`
  - `git push -u origin task/330-cross-module-gate-autofix-classification`
  - `gh pr create --base main --head task/330-cross-module-gate-autofix-classification --title "Add cross-module autofix classification flow (#330)" --body "... Closes #330"`
- Exit code: `0`
- Key output:
  - Commit: `e5b3c484`
  - PR: `https://github.com/Leeky1017/CreoNow/pull/331`
