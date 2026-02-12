## 1. Implementation

- [x] 1.1 准入：创建 OPEN issue #439 + `task/439-workbench-p5-02-project-switcher` worktree
- [x] 1.2 Rulebook task 完整化并 `validate` 通过
- [x] 1.3 完成 Dependency Sync Check：核对 Change 00 归档结论与 IPC 通道一致性
- [x] 1.4 完成 ProjectSwitcher/Sidebar/AppShell 功能实现与 Storybook 覆盖
- [x] 1.5 完成 change 02 文档勾选、归档、`EXECUTION_ORDER.md` 同步（若触发归档）

## 2. Testing

- [x] 2.1 运行 `pnpm install --frozen-lockfile`（worktree 环境基线）
- [x] 2.2 Red：`pnpm -C apps/desktop exec vitest run renderer/src/features/projects/ProjectSwitcher.test.tsx`（6/6 fail）
- [x] 2.3 Green：同命令回归（6/6 pass）
- [x] 2.4 运行 `pnpm -C apps/desktop exec vitest run renderer/src/components/layout/Sidebar.test.tsx renderer/src/components/layout/AppShell.test.tsx`
- [x] 2.5 运行 `scripts/agent_pr_preflight.sh`（或通过 `agent_pr_automerge_and_sync.sh` 内置 preflight）

## 3. Documentation

- [x] 3.1 维护 `openspec/_ops/task_runs/ISSUE-439.md`（关键命令、输出、结论）
- [x] 3.2 完成 PR + auto-merge + main 收口后归档 `rulebook/tasks/issue-439-workbench-p5-02-project-switcher`
