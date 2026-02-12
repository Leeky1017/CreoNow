# Proposal: issue-438-workbench-p5-01-layout-iconbar-shell

## Why

`openspec/changes/workbench-p5-01-layout-iconbar-shell` 是 Workbench P5 Phase B 的并行主流程之一，负责 IconBar 视觉规范、三栏折叠动画过渡、以及布局偏好持久化验证。如果不按 OpenSpec + Rulebook + GitHub 治理完成该 change，下游 `workbench-p5-05-hardening-gate` 将在漂移基线上硬化，导致返工与验收争议。

## What Changes

- 完成 change `workbench-p5-01-layout-iconbar-shell` 的 Specification/TDD/Red/Green/Refactor/Evidence 全链路。
- 先执行 Dependency Sync Check，对齐已归档 `workbench-p5-00-contract-sync` 的 IconBar 列表与命名基线（`knowledgeGraph`）。
- 以 TDD 方式补齐并通过以下行为验证：
  - IconBar 激活态左侧 2px `--color-accent` 指示条；
  - IconBar 顺序与图标规格（24px 图标、40x40 按钮、aria-label）；
  - Sidebar 折叠/展开动画使用 `var(--duration-slow)`；
  - `creonow.layout.sidebarCollapsed` / `creonow.layout.sidebarWidth` 持久化。
- 补齐 Storybook 目标覆盖：IconBar 默认/激活/悬停态，AppShell 四态（全展开、左折叠、右折叠、双折叠）。
- 完成交付闭环：RUN_LOG 证据、preflight、PR auto-merge、main 收口、Rulebook task 归档。

## Impact
- Affected specs:
  - `openspec/changes/workbench-p5-01-layout-iconbar-shell/**`
  - `openspec/changes/EXECUTION_ORDER.md`
- Affected code:
  - `apps/desktop/renderer/src/components/layout/IconBar.tsx`
  - `apps/desktop/renderer/src/components/layout/IconBar.test.tsx`
  - `apps/desktop/renderer/src/components/layout/IconBar.stories.tsx`
  - `apps/desktop/renderer/src/components/layout/AppShell.tsx`
  - `apps/desktop/renderer/src/components/layout/AppShell.test.tsx`
  - `apps/desktop/renderer/src/stores/layoutStore.test.ts`
  - `openspec/_ops/task_runs/ISSUE-438.md`
  - `rulebook/tasks/issue-438-workbench-p5-01-layout-iconbar-shell/**`
- Breaking change: NO
- User benefit: IconBar 与 AppShell 的视觉/交互与 Spec 对齐，布局行为更一致，后续 hardening 阶段基线更稳定。
