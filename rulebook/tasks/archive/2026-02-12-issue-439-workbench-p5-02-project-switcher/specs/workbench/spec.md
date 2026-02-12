# Spec Delta: workbench (ISSUE-439)

本任务交付 `openspec/changes/workbench-p5-02-project-switcher` 的完整实现闭环，聚焦 Sidebar 顶部项目切换器：

- ProjectSwitcher 从原生 `<select>` 升级为可搜索下拉面板
  - 150ms debounce 搜索过滤
  - 项目按 `updatedAt` 降序
  - 空态展示「暂无项目」+「创建新项目」
  - 切换超过 1s 展示顶部 2px 进度条
- Sidebar 顶部集成 ProjectSwitcher，确保面板内容位于其下方
- AppShell 注入项目列表与切换回调，走 `project:project:list` / `project:project:switch` 既有契约路径
- Storybook 覆盖展开态、搜索态、空态

## Acceptance

- `apps/desktop/renderer/src/features/projects/ProjectSwitcher.test.tsx` 覆盖并通过：
  - Sidebar 顶部集成
  - 下拉样式与搜索输入自动聚焦
  - 搜索过滤 + 排序
  - 空状态
  - 切换回调
  - 超时进度条
- `apps/desktop/renderer/src/components/layout/Sidebar.test.tsx` 与 `apps/desktop/renderer/src/components/layout/AppShell.test.tsx` 回归通过。
- `openspec/changes/workbench-p5-02-project-switcher/tasks.md` 全部勾选并记录 Dependency Sync Check 结论。
- `openspec/_ops/task_runs/ISSUE-439.md` 记录 Red/Green、命令输出与最终交付证据。
