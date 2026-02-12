# Proposal: issue-440-workbench-p5-04-command-palette

## Why

`openspec/changes/workbench-p5-04-command-palette` 已定义命令面板应具备「最近使用 / 文件 / 命令」三类检索与展示能力，但当前运行时仍只使用静态默认命令，缺少文件搜索、最近使用记录、分页加载与目标文案（`未找到匹配结果`）。若不补齐，本 change 无法满足 Workbench Spec 对命令面板场景与容量边界的可验收要求。

## What Changes

- 按 TDD 补齐命令面板关键场景测试与 Red/Green 证据：
  - 分类展示（最近使用 / 文件 / 命令）
  - 文件搜索 + 选中文件打开文档
  - 无结果文案
  - 首屏 100 项 + 滚动分页
  - 最近使用 FIFO 淘汰（上限 20）
- 新增最近使用存储 util（localStorage）并补齐单测。
- 在 `AppShell` 运行时动态构建 `commands`，注入最近使用、文件列表、命令列表。
- 在 `CommandPalette` 实现查询态过滤策略与分页渲染。
- 更新 change 任务勾选、RUN_LOG、PR 门禁证据并完成 main 收口。

## Impact

- Affected specs:
  - `openspec/changes/workbench-p5-04-command-palette/proposal.md`
  - `openspec/changes/workbench-p5-04-command-palette/specs/workbench-delta.md`
  - `openspec/changes/workbench-p5-04-command-palette/tasks.md`
- Affected code:
  - `apps/desktop/renderer/src/features/commandPalette/CommandPalette.tsx`
  - `apps/desktop/renderer/src/features/commandPalette/recentItems.ts`
  - `apps/desktop/renderer/src/components/layout/AppShell.tsx`
- Affected tests:
  - `apps/desktop/renderer/src/features/commandPalette/CommandPalette.test.tsx`
  - `apps/desktop/renderer/src/features/commandPalette/recentItems.test.ts`
  - `apps/desktop/renderer/src/components/layout/AppShell.test.tsx`
- Breaking change: NO
- User benefit: 命令面板可直接检索并打开文件，常用操作具备最近使用回路，超大结果集可分页加载且反馈文案一致。
