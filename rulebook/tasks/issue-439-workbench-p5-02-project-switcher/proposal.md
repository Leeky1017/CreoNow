# Proposal: issue-439-workbench-p5-02-project-switcher

## Why

`openspec/changes/workbench-p5-02-project-switcher` 定义了 Workbench P5 Phase B 的关键交互：Sidebar 顶部项目切换器。当前代码仍是未集成 Sidebar 的原生 `<select>`，无法满足可搜索下拉、空态、超时进度条与 Storybook 覆盖等规范。若不按 TDD 和交付流程完整落地，后续 `workbench-p5-05-hardening-gate` 会基于不完整交互继续推进，导致验收返工。

## What Changes

- 以 TDD 方式重写 `ProjectSwitcher`：原生 `<select>` 升级为可搜索下拉面板（debounce 150ms、按 `updatedAt` 降序、空态按钮、>1s 进度条）。
- 在 `Sidebar` 顶部集成 `ProjectSwitcher`，确保面板内容始终位于其下方。
- 在 `AppShell` 传递项目列表与切换回调，实际调用 `project:project:switch` / `project:project:list` 对应 store 流程。
- 新增 `ProjectSwitcher` Storybook，覆盖展开态、搜索态、空态。
- 更新 `openspec/changes/workbench-p5-02-project-switcher/tasks.md` 勾选状态与 Dependency Sync Check 结论。
- 维护 `openspec/_ops/task_runs/ISSUE-439.md`，沉淀 Red/Green 与门禁证据，最终合并并收口到控制面 `main`。

## Impact

- Affected specs:
  - `openspec/changes/workbench-p5-02-project-switcher/tasks.md`
  - `openspec/changes/workbench-p5-02-project-switcher/specs/workbench-delta.md`
- Affected code:
  - `apps/desktop/renderer/src/features/projects/ProjectSwitcher.tsx`
  - `apps/desktop/renderer/src/features/projects/ProjectSwitcher.test.tsx`
  - `apps/desktop/renderer/src/features/projects/ProjectSwitcher.stories.tsx`
  - `apps/desktop/renderer/src/components/layout/Sidebar.tsx`
  - `apps/desktop/renderer/src/components/layout/AppShell.tsx`
  - `openspec/_ops/task_runs/ISSUE-439.md`
- Breaking change: NO
- User benefit: Workbench 左侧项目切换交互与 OpenSpec 对齐，支持快速检索与可靠切换反馈，降低多项目写作切换成本。
