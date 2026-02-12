# Proposal: issue-441-p5-workbench-rightpanel-statusbar

## Why

`workbench-p5-03-rightpanel-statusbar` 与主规范存在直接偏差：AiPanel 仍含内部 Assistant/Info 子 tab，造成 RightPanel 双层信息架构；StatusBar 缺失项目名/文档名/字数/时间与完整保存状态机；`Cmd/Ctrl+L` 在折叠展开时未强制回 AI tab，`activeRightPanel` 也未持久化。该偏差会影响 Workbench P5 的可用性与一致性，必须按 OpenSpec change 全量修复并交付。

## What Changes

- 按 `workbench-p5-03-rightpanel-statusbar` 执行完整流程：Specification -> TDD Mapping -> Red -> Green -> Refactor -> Evidence。
- 完成 Dependency Sync Check（对齐 `archive/workbench-p5-00-contract-sync` 的 RightPanel tab 契约）。
- 通过先测后改修复以下点：
  - AiPanel 移除内部 sub-tab 与占位 InfoPanel；
  - `Cmd/Ctrl+L` 从折叠展开时强制切换 AI tab；
  - `layoutStore` 增加 `activeRightPanel` 持久化与恢复（非法值回退）；
  - StatusBar 补齐项目名、文档名、字数、保存状态机、当前时间；
  - 提取 `SaveIndicator` 并补齐 RightPanel/StatusBar Storybook 场景。
- 记录 RUN_LOG 证据并完成 PR auto-merge + main 收口。

## Impact

- Affected specs:
  - `openspec/changes/workbench-p5-03-rightpanel-statusbar/*`
  - `openspec/_ops/task_runs/ISSUE-441.md`
- Affected code:
  - `apps/desktop/renderer/src/features/ai/AiPanel.tsx`
  - `apps/desktop/renderer/src/components/layout/AppShell.tsx`
  - `apps/desktop/renderer/src/stores/layoutStore.tsx`
  - `apps/desktop/renderer/src/lib/preferences.ts`
  - `apps/desktop/renderer/src/components/layout/StatusBar.tsx`
  - `apps/desktop/renderer/src/components/layout/SaveIndicator.tsx`
  - 相关测试与 Storybook 文件
- Breaking change: NO
- User benefit: 右侧面板结构与交互符合规范，状态栏信息完整且可重试，布局偏好恢复一致性提升。
