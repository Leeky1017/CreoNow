## 1. Implementation

- [x] 1.1 准入：创建 OPEN issue #440 + `task/440-workbench-p5-04-command-palette` worktree
- [x] 1.2 Rulebook task 完整化并 `validate` 通过
- [x] 1.3 Dependency Sync Check：核对 archive `workbench-p5-00-contract-sync` 的 IPC 通道名、fileStore 数据结构、错误码/阈值并落盘
- [x] 1.4 Red：完成分类搜索、文件搜索/打开、无结果文案、分页、最近使用 FIFO 失败测试证据
- [x] 1.5 Green：实现 recentItems 存储、AppShell 动态 commands 注入、CommandPalette 分类过滤与分页加载
- [x] 1.6 Refactor：Storybook 三场景对齐并保持行为不回归

## 2. Testing

- [x] 2.1 运行命令面板相关单测（含 Red→Green 证据）
- [x] 2.2 运行 `pnpm --filter @creonow/desktop test -- src/features/commandPalette/CommandPalette.test.tsx`
- [x] 2.3 运行 `pnpm --filter @creonow/desktop test -- src/features/commandPalette/recentItems.test.ts`
- [x] 2.4 运行 `pnpm --filter @creonow/desktop test -- src/components/layout/AppShell.test.tsx`
- [x] 2.5 运行 `scripts/agent_pr_preflight.sh`

## 3. Documentation

- [x] 3.1 维护 `openspec/_ops/task_runs/ISSUE-440.md`（Dependency Sync、Red/Green、门禁与合并证据）
- [x] 3.2 完成 `openspec/changes/workbench-p5-04-command-palette/tasks.md` 全部勾选并归档到 `openspec/changes/archive/workbench-p5-04-command-palette`
- [x] 3.3 PR auto-merge 后归档 `rulebook/tasks/issue-440-workbench-p5-04-command-palette`
