# ISSUE-278

- Issue: #278
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/278
- Branch: `task/278-document-management-p1-file-tree-organization`
- PR: (待回填)
- Scope: 完成 `document-management-p1-file-tree-organization`（文件树与章节组织）从 OpenSpec 拆分到实现、测试、交付收口
- Out of Scope: 文档间互相引用、文档导出、主 spec 直接修改

## Goal

- 交付文件树 P1 能力：拖拽排序、文件夹层级、右键菜单、键盘导航、空态、Storybook 覆盖。
- 完成 Scenario→测试映射与 Red→Green 证据落盘。
- 满足 Rulebook + OpenSpec + required checks 门禁并合并回控制面 `main`。

## Status

- CURRENT: `IN_PROGRESS`（本地实现与目标测试已通过，进入 preflight / PR auto-merge 阶段）

## Plan

- 完成 Rulebook task 文档并通过 validate。
- 执行 preflight（typecheck/lint/contract/unit + openspec/rulebook checks）。
- 创建 PR、开启 auto-merge，等待 `ci` / `openspec-log-guard` / `merge-serial` 全绿并合并。
- 合并后同步控制面 `main`，完成收口记录。

## Runs

### 2026-02-08 17:19 +0800 green verification (targeted file-tree suite)

- Command:
  - `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C apps/desktop exec vitest run --maxWorkers=1 renderer/src/features/files/FileTreePanel.test.tsx renderer/src/features/files/FileTreePanel.types-status.test.tsx renderer/src/features/files/FileTreePanel.drag-drop.test.tsx renderer/src/features/files/FileTreePanel.context-menu.test.tsx renderer/src/features/files/FileTreePanel.keyboard-nav.test.tsx renderer/src/features/files/FileTreePanel.empty-state.test.tsx renderer/src/features/files/FileTreePanel.storybook-coverage.test.ts`
- Exit code: `0`
- Key output:
  - `Test Files 7 passed`
  - `Tests 19 passed`
- Note:
  - 控制台存在 React `act(...)` warning，不影响断言结果与退出码。

### 2026-02-08 17:21 +0800 red environment bootstrap

- Command:
  - `git worktree add /tmp/creonow-issue-278-red origin/main`
  - `pnpm -C apps/desktop exec vitest run ...`
- Exit code: `1`
- Key output:
  - `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL Command "vitest" not found`
- Note:
  - 临时 worktree 未安装依赖，先补依赖后重跑 Red。

### 2026-02-08 17:22 +0800 red reproduction on origin/main baseline

- Command:
  - `pnpm install --frozen-lockfile`（在 `/tmp/creonow-issue-278-red`）
  - `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C apps/desktop exec vitest run --maxWorkers=1 renderer/src/features/files/FileTreePanel.drag-drop.test.tsx renderer/src/features/files/FileTreePanel.context-menu.test.tsx renderer/src/features/files/FileTreePanel.keyboard-nav.test.tsx renderer/src/features/files/FileTreePanel.empty-state.test.tsx renderer/src/features/files/FileTreePanel.storybook-coverage.test.ts`
- Exit code: `1`
- Key output:
  - `Test Files 5 failed`
  - `Tests 6 failed`
  - 典型失败：
    - `Unable to find role="menuitem" and name "Copy"`
    - `expected "vi.fn()" to be called ... Number of calls: 0`（`reorder` / `moveToFolder`）
    - `Unable to find ... "暂无文件，开始创建你的第一个文件"`
    - `Unable to find ... [data-testid="file-tree-list"]`
    - `expected ... to contain "export const NestedHierarchy"`
- Note:
  - 证明在 `origin/main` 基线下，P1 文件树 requirement 对应测试为红灯。

### 2026-02-08 17:23 +0800 red workspace cleanup

- Command:
  - `git worktree remove --force /tmp/creonow-issue-278-red`
  - `git worktree prune`
- Exit code: `0`
- Key output:
  - 临时 Red worktree 清理完成。

## Blockers

- NONE（当前无阻塞）

## Next

- 执行 `rulebook task validate issue-278-document-management-p1-file-tree-organization`。
- 执行 `scripts/agent_pr_preflight.sh`。
- 推送分支并通过 `scripts/agent_pr_automerge_and_sync.sh` 完成 PR 自动合并与控制面同步。
