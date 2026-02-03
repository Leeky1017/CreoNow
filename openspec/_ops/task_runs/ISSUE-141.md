# ISSUE-141

- Issue: #141
- Branch: task/141-outline-panel
- PR: <fill-after-created>

## Plan

1. 实现 OutlinePanel 组件 (P0/P1 功能)
2. 集成 OutlinePanel 到 Sidebar Tab
3. 添加完整测试和 Storybook stories

## Runs

### 2026-02-03 21:43 OutlinePanel 实现

- Command: `Write OutlinePanel.tsx, OutlinePanel.stories.tsx, OutlinePanel.test.tsx, index.ts`
- Key output:
  - OutlinePanel.tsx: 29832 bytes - 完整组件实现
  - OutlinePanel.stories.tsx: 14227 bytes - 12 个 stories
  - OutlinePanel.test.tsx: 15439 bytes - 28 个测试用例
  - index.ts: 138 bytes - barrel export

### 2026-02-03 21:43 Sidebar 集成

- Command: `StrReplace Sidebar.tsx, Sidebar.stories.tsx`
- Key output:
  - 添加 Outline Tab 到 Sidebar (Files | Outline | Search | KG)
  - 添加 AllTabs story 展示完整 Sidebar 切换

### 2026-02-03 21:43 测试验证

- Command: `npm run test -- --run features/outline/OutlinePanel.test.tsx`
- Key output:
  ```
  Test Files  1 passed (1)
       Tests  28 passed (28)
  ```

### 2026-02-03 21:43 TypeScript 检查

- Command: `npx tsc --noEmit`
- Key output: Exit code 0, 无错误

## 功能清单

### P0 核心功能
- [x] 单节点展开/折叠 - 折叠箭头按钮
- [x] 完整拖拽支持 - before/after/into 三种位置
- [x] 编辑器同步接口 - scrollSyncEnabled + onScrollSync

### P1 体验优化
- [x] 字数统计显示
- [x] 搜索/过滤功能
- [x] 多选批量操作支持 (Ctrl/Cmd+Click, Shift+Click)
- [x] 完整键盘导航 (Arrow/F2/Delete/Escape)

### UI 集成
- [x] 将 Outline 添加到 Sidebar Tab
