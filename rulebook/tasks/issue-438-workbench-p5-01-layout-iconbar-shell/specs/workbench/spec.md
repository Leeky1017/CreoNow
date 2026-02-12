# Spec Delta: workbench (ISSUE-438)

本任务交付 `openspec/changes/workbench-p5-01-layout-iconbar-shell` 的实现与收口，覆盖以下目标：

- IconBar 激活态由矩形高亮改为左侧 2px `--color-accent` 指示条；
- IconBar 顺序与 Change 00 基线一致：
  - `files -> search -> outline -> versionHistory -> memory -> characters -> knowledgeGraph`
- IconBar 图标规格与可访问性满足要求：
  - 图标 24px、按钮 40x40、居中、`aria-label`；
- Sidebar 折叠/展开过渡使用 `var(--duration-slow)`；
- 布局偏好持久化键验证：
  - `creonow.layout.sidebarCollapsed`
  - `creonow.layout.sidebarWidth`
- Storybook 覆盖：
  - AppShell 四态（全展开/左折叠/右折叠/双折叠）
  - IconBar 默认/激活/悬停态

## Acceptance

- `openspec/changes/workbench-p5-01-layout-iconbar-shell/tasks.md` 全部勾选完成并记录 Dependency Sync Check 结论。
- 相关测试在 Red 阶段先失败、Green 阶段通过，且证据写入 `openspec/_ops/task_runs/ISSUE-438.md`。
- change `workbench-p5-01-layout-iconbar-shell` 归档到 `openspec/changes/archive/`。
- `openspec/changes/EXECUTION_ORDER.md` 同步反映归档后的活跃 change 顺序与依赖。
