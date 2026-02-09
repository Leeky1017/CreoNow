# ISSUE-328

- Issue: #328
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/328
- Branch: task/328-cross-module-contract-alignment-gate
- PR: (待回填)
- Scope: 新增 cross-module 契约自动门禁（baseline + check script + CI/preflight 接线）
- Out of Scope: 全量 IPC 运行时命名迁移、主 spec 直接改写

## Plan

- [x] 完成任务准入（OPEN issue、task branch、worktree、Rulebook）
- [x] 完成 change proposal/tasks/spec 与 Dependency Sync Check
- [x] 按 TDD 完成 Red→Green（新增单测 + 门禁脚本）
- [x] 接入 `package.json`、`ci.yml`、`agent_pr_preflight.py`
- [ ] 创建 PR、开启 auto-merge、等待 checks 全绿并收口

## Runs

### 2026-02-09 12:20 准入与环境隔离

- Command:
  - `gh issue create --title "Add cross-module contract alignment gate in CI" ...`
  - `scripts/agent_worktree_setup.sh 328 cross-module-contract-alignment-gate`
- Exit code: `0`
- Key output:
  - 新任务 Issue 创建成功：`#328`
  - 新分支与 worktree 创建成功：`task/328-cross-module-contract-alignment-gate`

### 2026-02-09 12:22 规格与 Rulebook 初始化

- Command:
  - `rulebook task create issue-328-cross-module-contract-alignment-gate`
  - `rulebook task validate issue-328-cross-module-contract-alignment-gate`
- Exit code: `0`
- Key output:
  - Rulebook 任务创建成功并可校验。

### 2026-02-09 12:24 Dependency Sync Check（依赖 issue-326）

- Input checks:
  - issue-326 delta report 中已确认通道命名 / envelope / 错误码差异。
  - 本 change 基线文件采用 issue-326 结论作为“批准漂移初始集”。
  - 目标是“拦截未登记新漂移”，不在本 change 执行运行时大迁移。
- Conclusion:
  - 无依赖漂移，可进入 Red。

### 2026-02-09 12:26 Red 失败证据

- Command:
  - `pnpm install --frozen-lockfile`
  - `pnpm exec tsx apps/desktop/tests/unit/cross-module-contract-gate.spec.ts`
- Exit code: `1`（预期 Red）
- Key output:
  - `ERR_MODULE_NOT_FOUND: ... scripts/cross-module-contract-gate`

### 2026-02-09 12:27-12:30 Green 实现与回归

- Edited:
  - `scripts/cross-module-contract-gate.ts`
  - `openspec/guards/cross-module-contract-baseline.json`
  - `apps/desktop/tests/unit/cross-module-contract-gate.spec.ts`
  - `package.json`
  - `.github/workflows/ci.yml`
  - `scripts/agent_pr_preflight.py`
- Command:
  - `pnpm exec tsx apps/desktop/tests/unit/cross-module-contract-gate.spec.ts`
  - `pnpm cross-module:check`
- Exit code: `0`
- Key output:
  - 新增单测通过。
  - `cross-module:check` 输出已登记漂移并 PASS。

### 2026-02-09 12:31 门禁命令验证

- Command:
  - `pnpm test:unit`
  - `pnpm contract:check`
  - `pnpm typecheck`
  - `pnpm lint`
- Exit code: `0`
- Key output:
  - 所有命令通过（`lint` 仅仓库既有 warnings，无 errors）。

### 2026-02-09 12:32 文档收口

- Command:
  - `edit openspec/changes/issue-328-cross-module-contract-alignment-gate/*`
  - `edit rulebook/tasks/issue-328-cross-module-contract-alignment-gate/*`
  - `edit openspec/changes/EXECUTION_ORDER.md`
- Exit code: `0`
- Key output:
  - OpenSpec change 与 Rulebook 文档完成落盘，执行顺序文档已纳入双活跃 change。
