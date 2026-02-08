# ISSUE-311

- Issue: #311
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/311
- Branch: `task/311-kg-e2e-default-graph-mode`
- PR: https://github.com/Leeky1017/CreoNow/pull/314
- Scope: 修复 KG 默认 Graph 视图后两条 E2E 的前置交互路径（仅测试修复）
- Out of Scope: 业务功能变更、组件 UI 重构、非相关 E2E 改造

## Goal

- 使 E2E 与 KG2 既有行为一致：进入 KG 默认 Graph，切 List 后执行 List-CRUD 断言。
- 保留原用例验证目标，仅修复前置步骤。
- 完成独立 worktree 开发、PR 合并与控制面 main 收口。

## Plan

- 在 `knowledge-graph.spec.ts` 和 `system-dialog.spec.ts` 增加「进入 KG 后先切到 List」的稳定前置步骤。
- 复现旧用例失败（Red），再验证修复后目标用例通过（Green）。
- 通过 `agent_pr_automerge_and_sync.sh` 完成 PR、门禁检查与合并收口。

## Status

- CURRENT: 进行中（目标用例已本地转绿，待 preflight / PR / merge / 收口）。

## Root Cause

- `KnowledgeGraphPanel` 默认 `viewMode` 为 `"graph"`（`apps/desktop/renderer/src/features/kg/KnowledgeGraphPanel.tsx`）。
- `kg-entity-name` / `kg-entity-create` 仅在 List 视图渲染。
- 现有 E2E 在进入 KG 后直接访问 `kg-entity-*`，缺少切换 List 的前置步骤。

## Runs

### 2026-02-08 23:31 +0800 任务入口与隔离环境

- Command:
  - `gh issue create --title "Fix KG E2E flow for default graph mode" ...`
  - `gh issue edit 311 --body-file -`
  - `git worktree add -b task/311-kg-e2e-default-graph-mode .worktrees/issue-311-kg-e2e-default-graph-mode origin/main`
  - `rulebook task create issue-311-kg-e2e-default-graph-mode`
  - `rulebook task validate issue-311-kg-e2e-default-graph-mode`
- Exit code: `0`
- Key output:
  - `https://github.com/Leeky1017/CreoNow/issues/311`
  - `Preparing worktree (new branch 'task/311-kg-e2e-default-graph-mode')`
  - `Task issue-311-kg-e2e-default-graph-mode is valid`

### 2026-02-08 23:33 +0800 Red-1（环境阻断：缺少 Playwright 命令）

- Command:
  - `pnpm -C apps/desktop exec playwright test ...`
- Exit code: `1`
- Key output:
  - `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL Command "playwright" not found`
- Fix:
  - `pnpm install --frozen-lockfile`

### 2026-02-08 23:33 +0800 Red-2（环境阻断：未构建 dist）

- Command:
  - `pnpm -C apps/desktop exec playwright test ...`
- Exit code: `1`
- Key output:
  - `Cannot find module ... apps/desktop/dist/main/index.js`
- Fix:
  - `pnpm -C apps/desktop test:e2e -- ...`（先构建）

### 2026-02-08 23:33 +0800 Red-3（行为失败：system-dialog 旧前置）

- Command:
  - `pnpm -C apps/desktop exec playwright test -c tests/e2e/playwright.config.ts --grep "system dialog: cancel/confirm across file tree + knowledge graph"`
- Exit code: `1`（预期）
- Key output:
  - `TimeoutError: waiting for getByTestId('kg-entity-name')`
  - `tests/e2e/system-dialog.spec.ts:152`

### 2026-02-08 23:33 +0800 Red-4（行为失败：knowledge-graph 旧前置）

- Command:
  - `pnpm -C apps/desktop exec playwright test -c tests/e2e/playwright.config.ts --grep "knowledge graph: sidebar CRUD + context viewer injection (skill gated)"`
- Exit code: `1`（预期）
- Key output:
  - `expect(locator).toBeEnabled failed`
  - `waiting for getByTestId('kg-entity-create')`
  - `tests/e2e/knowledge-graph.spec.ts:86`

### 2026-02-08 23:34 +0800 Green（最小修复后目标用例通过）

- Command:
  - `pnpm -C apps/desktop exec playwright test -c tests/e2e/playwright.config.ts --grep "knowledge graph: sidebar CRUD + context viewer injection (skill gated)"`
  - `pnpm -C apps/desktop exec playwright test -c tests/e2e/playwright.config.ts --grep "system dialog: cancel/confirm across file tree + knowledge graph"`
- Exit code: `0`
- Key output:
  - `1 passed`（knowledge-graph）
  - `1 passed`（system-dialog）

### 2026-02-08 23:34 +0800 实现说明（最小改动）

- Files:
  - `apps/desktop/tests/e2e/knowledge-graph.spec.ts`
  - `apps/desktop/tests/e2e/system-dialog.spec.ts`
- Change:
  - 进入 KG 后先断言默认 Graph 按钮可见。
  - 显式点击 `List` 再访问 `kg-entity-name` / `kg-entity-create`。
  - 保留原有 CRUD 与确认弹窗断言不变。

### 2026-02-08 23:37 +0800 预检阻断（PR 链接未回填）

- Command:
  - `scripts/agent_pr_preflight.sh`
- Exit code: `1`（预期）
- Key output:
  - `PRE-FLIGHT FAILED: [RUN_LOG] PR field still placeholder ... ISSUE-311.md: (待回填)`
- Note:
  - 该门禁将由 `scripts/agent_pr_automerge_and_sync.sh` 在创建 PR 后自动回填 `- PR:` 并重跑 preflight。

### 2026-02-08 23:37 +0800 文档与规则校验

- Command:
  - `rulebook task validate issue-311-kg-e2e-default-graph-mode`
  - `pnpm exec prettier --check apps/desktop/tests/e2e/knowledge-graph.spec.ts apps/desktop/tests/e2e/system-dialog.spec.ts openspec/_ops/task_runs/ISSUE-311.md rulebook/tasks/issue-311-kg-e2e-default-graph-mode/proposal.md rulebook/tasks/issue-311-kg-e2e-default-graph-mode/tasks.md rulebook/tasks/issue-311-kg-e2e-default-graph-mode/.metadata.json`
- Exit code: `0`
- Key output:
  - `Task issue-311-kg-e2e-default-graph-mode is valid`
  - `All matched files use Prettier code style!`

### 2026-02-08 23:38 +0800 Green 回归确认（目标 E2E）

- Command:
  - `pnpm -C apps/desktop exec playwright test -c tests/e2e/playwright.config.ts --grep "knowledge graph: sidebar CRUD"`
  - `pnpm -C apps/desktop exec playwright test -c tests/e2e/playwright.config.ts --grep "system dialog: cancel/confirm across file tree + knowledge graph"`
- Exit code: `0`
- Key output:
  - `knowledge-graph.spec.ts ... 1 passed`
  - `system-dialog.spec.ts ... 1 passed`

### 2026-02-08 23:39 +0800 PR 自动流程首次执行（触发基线阻断）

- Command:
  - `scripts/agent_pr_automerge_and_sync.sh`
- Exit code: `中断重试`
- Key output:
  - 自动创建并回填 PR：`docs: backfill run log PR link (#311)`
  - preflight 阻断：`pnpm contract:check` 失败，`packages/shared/types/ipc-generated.ts` 产生漂移
- Note:
  - 漂移文件由 preflight 命令生成，未纳入本任务改动，已清理工作区。

### 2026-02-08 23:42 +0800 基线诊断与同步

- Command:
  - `git checkout --detach origin/main && pnpm contract:check`（在干净 checkout 验证）
  - `git fetch origin main`
  - `git merge --no-edit origin/main`
  - `git push`
- Exit code: `0`
- Key output:
  - 旧基线 `origin/main@ffa2a3ba` 下 `contract:check` 失败（非本任务引入）
  - 拉取到 `origin/main@ca0c20c2`（包含 `ipc-generated.ts` 修复）后，分支完成同步并推送

### 2026-02-08 23:44 +0800 门禁失败定位（openspec-log-guard）

- Command:
  - `scripts/agent_pr_automerge_and_sync.sh --skip-preflight --pr 314`
  - `gh run view 21800832801 --log-failed`
- Exit code: `失败定位完成`
- Key output:
  - `openspec-log-guard` 报错：`RUN_LOG missing required fields: Plan`
- Fix:
  - 在 `ISSUE-311.md` 增补 `## Plan` 段并重新推送触发检查。
