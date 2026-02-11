# ISSUE-408

- Issue: #408
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/408
- Branch: task/408-editor-bubble-menu-crash-fix
- PR: https://github.com/Leeky1017/CreoNow/pull/0
- Scope: 修复 AI apply 流程中 `EditorBubbleMenu` 卸载竞态导致的渲染崩溃，确保 success/conflict 路径稳定完成。
- Out of Scope: 不改动 AI apply 业务逻辑（`AiPanel`/`aiStore`）、不改 IPC 契约、不新增 BubbleMenu 功能。

## Plan

- [x] 准入：OPEN Issue + worktree + Rulebook task validate
- [x] Specification：补齐 delta spec + TDD tasks
- [x] Red：记录 `ai-apply` e2e 失败证据
- [x] Green：最小修复 + 定向 e2e 通过
- [x] Fresh 门禁：typecheck/lint/contract/cross-module/test:unit/desktop tests
- [ ] preflight + PR auto-merge + main 收口 + RUN_LOG 回填最终 PR 链接

## Runs

### 2026-02-11 23:27 +0800 准入（Issue / Worktree / Rulebook）

- Command:
  - `gh issue create --title "Fix EditorBubbleMenu removeChild crash after AI apply" --body-file -`
  - `scripts/agent_worktree_setup.sh 408 editor-bubble-menu-crash-fix`
  - `rulebook task create issue-408-editor-bubble-menu-crash-fix`
  - `rulebook task validate issue-408-editor-bubble-menu-crash-fix`
- Exit code: `0`
- Key output:
  - Issue 创建成功：`https://github.com/Leeky1017/CreoNow/issues/408`
  - 分支创建成功：`task/408-editor-bubble-menu-crash-fix`
  - worktree 创建成功：`.worktrees/issue-408-editor-bubble-menu-crash-fix`
  - Rulebook task validate 通过

### 2026-02-11 23:31 +0800 Red 失败证据（ai-apply 定向 e2e）

- Command:
  - `pnpm -C apps/desktop test:e2e -- tests/e2e/ai-apply.spec.ts`
- Exit code: `1`
- Key output:
  - 两条用例失败，ErrorBoundary 记录渲染崩溃：`NotFoundError: Failed to execute 'removeChild' on 'Node'`。
  - success 路径表现为 `ai-apply-status` 缺失；conflict 路径表现为 `ai-apply` 可见性超时。
  - 组件栈定位到 `EditorBubbleMenu`，符合 BubbleMenu 卸载/重挂载竞态特征。

### 2026-02-11 23:35 +0800 Green 最小修复（BubbleMenu 挂载策略）

- Change:
  - `apps/desktop/renderer/src/features/editor/EditorBubbleMenu.tsx`
- Fix:
  - 保持 `BubbleMenu` 持续挂载，使用 `shouldShow` 控制显隐。
  - Vitest runtime 分支保持测试可见性行为。
- Why:
  - 避免 ProseMirror 选区高频变更时的 unmount/remount 竞态。

### 2026-02-11 23:43 +0800 Green 回归（定向 e2e）

- Command:
  - `pnpm -C apps/desktop test:e2e -- tests/e2e/ai-apply.spec.ts`
- Exit code: `0`
- Key output:
  - `2 passed (4.3s)`
  - success/conflict 两条路径均恢复稳定。

### 2026-02-11 23:44 +0800 Fresh 门禁（type/lint/contract/cross-module）

- Command:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm contract:check`
  - `pnpm cross-module:check`
- Exit code: `0` / `0` / `0` / `0`
- Key output:
  - `contract:check` 通过（`contract:generate` 后 `ipc-generated.ts` 无差异）。
  - `[CROSS_MODULE_GATE] PASS`。

### 2026-02-11 23:45 +0800 Fresh 门禁（test:unit 首次失败）

- Command:
  - `pnpm test:unit`
- Exit code: `1`
- Key output:
  - `better-sqlite3` ABI 漂移：`NODE_MODULE_VERSION 143` vs Node `115`。

### 2026-02-11 23:47 +0800 ABI 修复 + test:unit 复跑

- Command:
  - `pnpm -C apps/desktop exec npm rebuild better-sqlite3 --build-from-source`
  - `pnpm test:unit`
- Exit code: `0` / `0`
- Key output:
  - native 依赖重建成功：`rebuilt dependencies successfully`
  - `test:unit` 通过（unit scripts 全绿）。

### 2026-02-11 23:48 +0800 Fresh 门禁（desktop 全量 vitest）

- Command:
  - `pnpm -C apps/desktop test:run`
- Exit code: `0`
- Key output:
  - `Test Files 102 passed`
  - `Tests 1266 passed`

### 2026-02-11 23:52 +0800 Change/Rulebook 自归档（同 PR 收口）

- Command:
- `rulebook task validate issue-408-editor-bubble-menu-crash-fix`
  - `mv openspec/changes/editor-bubble-menu-crash-fix openspec/changes/archive/editor-bubble-menu-crash-fix`
  - `mv rulebook/tasks/issue-408-editor-bubble-menu-crash-fix rulebook/tasks/archive/2026-02-11-issue-408-editor-bubble-menu-crash-fix`
- Exit code: `0`
- Key output:
  - OpenSpec change 已归档。
  - Rulebook task 已归档。

### 2026-02-11 23:58 +0800 preflight 通过（PR 前）

- Command:
  - `scripts/agent_pr_preflight.sh`
- Exit code: `0`
- Key output:
  - Issue freshness 校验通过：`#408` 仍为 `OPEN`。
  - Rulebook archive 路径结构校验通过。
  - `prettier --check` 通过（含 archive 路径）。
  - `typecheck` / `lint` / `contract:check` / `cross-module:check` / `test:unit` 全部通过。
