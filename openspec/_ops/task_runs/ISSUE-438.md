# ISSUE-438

- Issue: #438
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/438
- Branch: task/438-workbench-p5-01-layout-iconbar-shell
- PR: (待回填)
- Scope: 完成 `openspec/changes/workbench-p5-01-layout-iconbar-shell` 全部规划任务并按治理流程合并回控制面 `main`
- Out of Scope: `workbench-p5-02/03/04/05` 及任何与 change 01 无关的功能改动

## Plan

- [x] 准入：创建 OPEN issue 与隔离 worktree
- [x] Rulebook task 初始化与完整化
- [x] 依赖同步检查（基于 archive/workbench-p5-00-contract-sync）
- [x] TDD Red（失败测试）证据落盘
- [x] Green 实现 + Refactor + Storybook 覆盖
- [ ] preflight + PR + auto-merge + main 收口 + Rulebook 归档 + worktree 清理

## Runs

### 2026-02-12 16:08 +0800 准入（Issue）

- Command:
  - `gh issue create --title "Deliver workbench-p5-01-layout-iconbar-shell and merge to main" --body-file - <<'EOF' ... EOF`
- Exit code: `0`
- Key output:
  - `https://github.com/Leeky1017/CreoNow/issues/438`

### 2026-02-12 16:09 +0800 环境隔离（worktree）

- Command:
  - `scripts/agent_worktree_setup.sh 438 workbench-p5-01-layout-iconbar-shell`
- Exit code: `0`
- Key output:
  - `Worktree created: .worktrees/issue-438-workbench-p5-01-layout-iconbar-shell`
  - `Branch: task/438-workbench-p5-01-layout-iconbar-shell`
  - `HEAD is now at 1cc054eb ... (#437)`

### 2026-02-12 16:10 +0800 Rulebook task 初始化

- Command:
  - `rulebook task create issue-438-workbench-p5-01-layout-iconbar-shell`
  - `rulebook task validate issue-438-workbench-p5-01-layout-iconbar-shell`
- Exit code:
  - create: `0`
  - validate(first): `1`（CLI 读取状态短暂不一致，重试后恢复）
  - validate(retry): `0`
- Key output:
  - `Task issue-438-workbench-p5-01-layout-iconbar-shell created successfully`
  - `Task issue-438-workbench-p5-01-layout-iconbar-shell is valid`

### 2026-02-12 16:12 +0800 Rulebook task 完整化 + validate

- Command:
  - `apply_patch rulebook/tasks/issue-438-workbench-p5-01-layout-iconbar-shell/proposal.md`
  - `apply_patch rulebook/tasks/issue-438-workbench-p5-01-layout-iconbar-shell/tasks.md`
  - `apply_patch rulebook/tasks/issue-438-workbench-p5-01-layout-iconbar-shell/.metadata.json`
  - `apply_patch rulebook/tasks/issue-438-workbench-p5-01-layout-iconbar-shell/specs/workbench/spec.md`
  - `rulebook task validate issue-438-workbench-p5-01-layout-iconbar-shell`
- Exit code: `0`
- Key output:
  - `Task issue-438-workbench-p5-01-layout-iconbar-shell is valid`

### 2026-02-12 16:13 +0800 Dependency Sync Check（Change 00 -> Change 01）

- Command:
  - `nl -ba openspec/changes/archive/workbench-p5-00-contract-sync/specs/workbench-delta.md | sed -n '1,220p'`
  - `nl -ba openspec/changes/workbench-p5-01-layout-iconbar-shell/specs/workbench-delta.md | sed -n '1,220p'`
  - `nl -ba apps/desktop/renderer/src/components/layout/IconBar.tsx | sed -n '1,220p'`
  - `nl -ba apps/desktop/renderer/src/stores/layoutStore.tsx | sed -n '1,220p'`
  - `nl -ba openspec/specs/workbench/spec.md | sed -n '26,170p'`
  - `rg -n "knowledgeGraph|graph|MAIN_ICONS|sidebarCollapsed|sidebarWidth|duration-slow|iconButtonActive" ...`
- Exit code: `0`
- Key output:
  - Change 00 约束的 IconBar 顺序与 `graph -> knowledgeGraph` 命名在代码侧一致。
  - 持久化 key `creonow.layout.sidebarCollapsed/sidebarWidth` 在 `layoutStore.tsx` 已存在且读写路径完整。
  - 漂移结论：无阻断漂移，可进入 Red。

### 2026-02-12 16:16 +0800 Red 前置环境安装

- Command:
  - `pnpm -C apps/desktop test:run src/components/layout/IconBar.test.tsx src/components/layout/AppShell.test.tsx src/stores/layoutStore.test.ts`
  - `pnpm install --frozen-lockfile`
- Exit code:
  - first test run: `1`（`vitest: not found`）
  - install: `0`
- Key output:
  - `Local package.json exists, but node_modules missing`
  - `Lockfile is up to date`

### 2026-02-12 16:16 +0800 Red（失败测试证据）

- Command:
  - `pnpm -C apps/desktop test:run src/components/layout/IconBar.test.tsx src/components/layout/AppShell.test.tsx src/stores/layoutStore.test.ts`
- Exit code: `1`
- Key output:
  - `IconBar.test.tsx` 失败 2 项：
    - 激活态未使用左侧 `border-l-2 border-l-[var(--color-accent)]` 指示条
    - 图标尺寸为 `20`，不符合 `24`
  - `AppShell.test.tsx` 失败 1 项：
    - `layout-sidebar` 缺少 `var(--duration-slow)` 过渡属性
  - 失败总计：`3 failed | 37 passed`

### 2026-02-12 16:18 +0800 Green（最小实现通过）

- Command:
  - `apply_patch apps/desktop/renderer/src/components/layout/IconBar.tsx`
  - `apply_patch apps/desktop/renderer/src/components/layout/Sidebar.tsx`
  - `apply_patch apps/desktop/renderer/src/components/layout/IconBar.stories.tsx`
  - `pnpm -C apps/desktop test:run src/components/layout/IconBar.test.tsx src/components/layout/AppShell.test.tsx src/stores/layoutStore.test.ts`
- Exit code: `0`
- Key output:
  - `IconBar.tsx`：激活态改为左侧 2px `--color-accent`，图标改为 24px。
  - `Sidebar.tsx`：补充 `transition: width var(--duration-slow) ease`。
  - `IconBar.stories.tsx`：补齐默认/激活/悬停态展示。
  - 测试结果：`3 passed files, 40 passed tests`.

### 2026-02-12 16:18 +0800 Refactor 回归（Layout 相关全绿）

- Command:
  - `pnpm -C apps/desktop test:run src/components/layout/Layout.test.tsx src/components/layout/IconBar.test.tsx src/components/layout/Sidebar.test.tsx src/components/layout/RightPanel.test.tsx src/components/layout/Resizer.test.tsx src/components/layout/AppShell.test.tsx src/stores/layoutStore.test.ts`
- Exit code: `0`
- Key output:
  - `7 passed files, 102 passed tests`
  - 存在历史 `act(...)` warning（RightPanel/Layout 既有测试噪音），无失败。

### 2026-02-12 16:21 +0800 Green 复验（变更文档回填后）

- Command:
  - `pnpm -C apps/desktop test:run src/components/layout/IconBar.test.tsx src/components/layout/AppShell.test.tsx src/stores/layoutStore.test.ts`
- Exit code: `0`
- Key output:
  - `3 passed files, 40 passed tests`

### 2026-02-12 16:22 +0800 change 01 归档 + 执行顺序同步

- Command:
  - `git mv openspec/changes/workbench-p5-01-layout-iconbar-shell openspec/changes/archive/workbench-p5-01-layout-iconbar-shell`
  - `apply_patch openspec/changes/EXECUTION_ORDER.md`
- Exit code: `0`
- Key output:
  - `workbench-p5-01-layout-iconbar-shell` 已从 active 迁移至 archive
  - `EXECUTION_ORDER.md` 已更新为 active=4，并同步 Phase B/Phase C 依赖关系

### 2026-02-12 16:23 +0800 格式校验与修复

- Command:
  - `pnpm exec prettier --check $(git diff --name-only --diff-filter=ACMR)`
  - `pnpm exec prettier --write apps/desktop/renderer/src/components/layout/IconBar.stories.tsx apps/desktop/renderer/src/components/layout/IconBar.test.tsx apps/desktop/renderer/src/components/layout/IconBar.tsx openspec/changes/archive/workbench-p5-01-layout-iconbar-shell/proposal.md openspec/changes/archive/workbench-p5-01-layout-iconbar-shell/tasks.md`
  - `pnpm exec prettier --check $(git diff --name-only --diff-filter=ACMR)`
- Exit code:
  - first check: `1`
  - write: `0`
  - second check: `0`
- Key output:
  - 首次失败文件共 5 个，修复后 `All matched files use Prettier code style!`

### 2026-02-12 16:23 +0800 Green 终验（目标测试集）

- Command:
  - `pnpm -C apps/desktop test:run src/components/layout/IconBar.test.tsx src/components/layout/AppShell.test.tsx src/stores/layoutStore.test.ts`
- Exit code: `0`
- Key output:
  - `3 passed files, 40 passed tests`
