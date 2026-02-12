# ISSUE-439

- Issue: #439
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/439
- Branch: task/439-workbench-p5-02-project-switcher
- PR: https://github.com/Leeky1017/CreoNow/pull/443
- Scope: 完成 `openspec/changes/workbench-p5-02-project-switcher` 全部规划任务并按治理流程合并回控制面 `main`
- Out of Scope: `workbench-p5-01`/`workbench-p5-03`/`workbench-p5-04`/`workbench-p5-05` 的实现交付

## Plan

- [x] 准入：创建 OPEN issue 与隔离 worktree
- [x] Rulebook task 初始化并补齐 `specs/workbench/spec.md`
- [x] Dependency Sync Check（对齐已归档 change 00 IPC 命名结论）
- [x] TDD Red：先写失败测试并记录失败证据
- [x] TDD Green：最小实现通过 + 回归验证
- [x] change 02 文档勾选、归档与 `EXECUTION_ORDER.md` 同步
- [ ] preflight + PR + auto-merge + main 收口 + Rulebook 归档 + worktree 清理

## Runs

### 2026-02-12 准入（Issue）

- Command:
  - `gh issue create --title "Deliver workbench-p5-02-project-switcher and merge to main" --body-file - <<'EOF' ... EOF`
- Exit code: `0`
- Key output:
  - `https://github.com/Leeky1017/CreoNow/issues/439`

### 2026-02-12 环境隔离（worktree）

- Command:
  - `scripts/agent_worktree_setup.sh 439 workbench-p5-02-project-switcher`
- Exit code: `0`
- Key output:
  - `Worktree created: .worktrees/issue-439-workbench-p5-02-project-switcher`
  - `Branch: task/439-workbench-p5-02-project-switcher`
  - `HEAD is now at 1cc054eb ... (#437)`

### 2026-02-12 Rulebook task 初始化

- Command:
  - `rulebook task create issue-439-workbench-p5-02-project-switcher`
  - `rulebook task validate issue-439-workbench-p5-02-project-switcher`
- Exit code: `0`
- Key output:
  - `Task issue-439-workbench-p5-02-project-switcher created successfully`
  - `Task issue-439-workbench-p5-02-project-switcher is valid`
  - warning: `No spec files found (specs/*/spec.md)`

### 2026-02-12 规格审阅 + Dependency Sync Check（进入 Red 前）

- Command:
  - `nl -ba openspec/specs/workbench/spec.md | sed -n '220,268p'`
  - `git show origin/main:apps/desktop/renderer/src/features/projects/ProjectSwitcher.tsx | nl -ba | sed -n '1,140p'`
  - `nl -ba openspec/changes/archive/workbench-p5-00-contract-sync/specs/workbench-delta.md | sed -n '40,54p'`
  - `nl -ba packages/shared/types/ipc-generated.ts | sed -n '2380,2450p'`
  - `rg -n "project:project:list|project:project:switch" apps/desktop/renderer/src/stores/projectStore.tsx -S`
- Exit code: `0`
- Key output:
  - 主 spec 明确要求 Sidebar 顶部切换器 + 可搜索下拉 + 空态 + Storybook 覆盖（`workbench/spec.md:220-263`）
  - 基线实现仍为原生 `<select>`，未满足可搜索下拉与 Sidebar 集成（`origin/main:ProjectSwitcher.tsx:65-82`）
  - 上游 change 00 明确通道名：`project:project:switch`、`project:project:list`（`workbench-delta.md:47-50`）
  - 生成契约与 store 调用侧一致（`ipc-generated.ts:2386/2430`，`projectStore.tsx:151/213`）
- Dependency Sync Check 结论:
  - 无漂移，可按现有 change 02 规格进入 Red/Green

### 2026-02-12 TDD 环境基线

- Command:
  - `pnpm install --frozen-lockfile`
- Exit code: `0`
- Key output:
  - `Lockfile is up to date`
  - `Done in 2.3s`

### 2026-02-12 TDD Red（首次执行，环境阻塞）

- Command:
  - `pnpm exec vitest run apps/desktop/renderer/src/features/projects/ProjectSwitcher.test.tsx`
- Exit code: `1`
- Key output:
  - `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL`
  - `Command "vitest" not found`
- Action:
  - 调整为 workspace 子包命令 `pnpm -C apps/desktop exec vitest ...` 后重跑 Red。

### 2026-02-12 TDD Red（真实失败）

- Command:
  - `pnpm -C apps/desktop exec vitest run renderer/src/features/projects/ProjectSwitcher.test.tsx`
- Exit code: `1`
- Key output:
  - `6 tests | 6 failed`
  - 失败点聚焦：
    - Sidebar 未渲染 `project-switcher`
    - 组件仍为 `project-switcher-select`（原生 `<select>`），缺失下拉、搜索、空态与选项项 testid

### 2026-02-12 TDD Green（最小实现）

- Command:
  - `apply_patch ... ProjectSwitcher.tsx`
  - `apply_patch ... Sidebar.tsx`
  - `apply_patch ... AppShell.tsx`
  - `apply_patch ... ProjectSwitcher.test.tsx`
  - `apply_patch ... ProjectSwitcher.stories.tsx`
  - `apply_patch ... (delete) ProjectSwitcher.loading-bar.test.tsx`
  - `pnpm -C apps/desktop exec vitest run renderer/src/features/projects/ProjectSwitcher.test.tsx`
- Exit code: `0`
- Key output:
  - `✓ ProjectSwitcher.test.tsx (6 tests)`
  - 关键行为通过：Sidebar 顶部集成、下拉样式、搜索 debounce、空态、切换回调、超时进度条

### 2026-02-12 回归验证（受影响布局测试）

- Command:
  - `pnpm -C apps/desktop exec vitest run renderer/src/components/layout/Sidebar.test.tsx renderer/src/components/layout/AppShell.test.tsx`
- Exit code: `0`
- Key output:
  - `✓ Sidebar.test.tsx (20 tests)`
  - `✓ AppShell.test.tsx (18 tests)`

### 2026-02-12 Rulebook task 完整化 + validate

- Command:
  - `apply_patch rulebook/tasks/issue-439-workbench-p5-02-project-switcher/proposal.md`
  - `apply_patch rulebook/tasks/issue-439-workbench-p5-02-project-switcher/tasks.md`
  - `apply_patch rulebook/tasks/issue-439-workbench-p5-02-project-switcher/.metadata.json`
  - `apply_patch rulebook/tasks/issue-439-workbench-p5-02-project-switcher/specs/workbench/spec.md`
  - `rulebook task validate issue-439-workbench-p5-02-project-switcher`
- Exit code: `0`
- Key output:
  - `Task issue-439-workbench-p5-02-project-switcher is valid`
  - warning `No spec files found` 已消除

### 2026-02-12 格式与静态门禁（本地）

- Command:
  - `pnpm exec prettier --check <changed files>`
  - `pnpm exec prettier --write <changed files>`
  - `pnpm exec prettier --check <changed files>`
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm contract:check`
  - `pnpm cross-module:check`
- Exit code:
  - 首次 prettier check: `1`
  - 后续命令: `0`
- Key output:
  - 首次格式失败：`ProjectSwitcher.test.tsx`、`ProjectSwitcher.tsx`、`rulebook proposal.md`
  - 二次格式检查：`All matched files use Prettier code style!`
  - `CROSS_MODULE_GATE PASS`

### 2026-02-12 单元门禁回归（含 Storybook registry）

- Command:
  - `pnpm test:unit`
- Exit code:
  - 首次：`1`
  - 修复后重跑：`0`
- Key output（首次失败）:
  - `orphan stories: Features/Projects/ProjectSwitcher`
  - `AssertionError: Found 1 orphan stories not in registry`
- Root cause:
  - 新增 `ProjectSwitcher.stories.tsx` 后，`apps/desktop/renderer/src/surfaces/surfaceRegistry.ts` 未同步登记 `storybookTitle`
- Fix:
  - 在 `surfaceRegistry.ts` 增加 `projectSwitcher` 条目，`storybookTitle: Features/Projects/ProjectSwitcher`
- Key output（重跑通过）:
  - `All stories are mapped in the registry!`
  - `Total: 59/59`

### 2026-02-12 change 02 归档与执行顺序同步

- Command:
  - `git mv openspec/changes/workbench-p5-02-project-switcher openspec/changes/archive/workbench-p5-02-project-switcher`
  - `apply_patch openspec/changes/EXECUTION_ORDER.md`
- Exit code: `0`
- Key output:
  - change 02 从 active 迁移到 `openspec/changes/archive/workbench-p5-02-project-switcher`
  - `EXECUTION_ORDER.md` 已更新为 active=4，并移除 Phase B 活跃列表中的 change 02
