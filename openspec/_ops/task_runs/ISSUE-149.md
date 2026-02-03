# ISSUE-149
- Issue: #149
- Branch: task/149-storybook-coverage
- PR: https://github.com/Leeky1017/CreoNow/pull/150

## Plan
- 补充 P5 前所有组件的 Storybook 场景覆盖（边界条件、键盘交互、Windows 快捷键）
- 修复 AppShell.stories.tsx 中的 state 属性名 bug（sidebarVisible→sidebarCollapsed）
- 通过浏览器实际验证所有新增场景

## Runs

### 2026-02-04 00:46 实施 Storybook 场景补充
- Command: 手动编辑 8 个 .stories.tsx 文件
- Key output: 
  - P0: 修复 CommandPalette/AppShell 快捷键为 Windows 格式（Ctrl+N/B/Z）
  - P1: 新增 AppShell 折叠状态、Resizer 边界测试、AiPanel 状态场景（12 个场景）
  - P2: 新增 CommandPalette/SearchPanel/FileTreePanel 键盘导航（6 个场景）
  - P3: 新增 QualityGatesPanel/ZenMode 补充场景（4 个场景）
  - 总计: 2 文件快捷键修复 + 22 个新场景
- Evidence: git diff

### 2026-02-04 01:15 浏览器实际测试
- Command: Storybook dev server (http://172.18.248.30:6012) + MCP browser 测试
- Key output:
  - ✅ CommandPalette - KeyboardNavigationDemo: Windows 快捷键正确
  - ✅ Resizer - DragToMinWidth: 边界测试正确
  - ✅ AiPanel - EmptyConversation/SendButtonStates: 状态正确
  - ✅ QualityGatesPanel - ErrorLevelIssues: 红色错误状态正确
  - ✅ ZenMode - SavingState: 保存状态正确
  - ✅ SearchPanel - KeyboardNavigation: 键盘提示正确
  - ✅ FileTreePanel - KeyboardNavigation: Windows 快捷键提示正确（中文）
- Evidence: 截图已在对话中展示

### 2026-02-04 01:20 发现并修复 bug
- Command: `Read AppShell.stories.tsx` + `StrReplace`
- Key output:
  - Bug: AppShell.stories.tsx 使用错误的 state 属性名
    - 原: sidebarVisible / rightPanelVisible（不存在于 layoutStore）
    - 修: sidebarCollapsed / panelCollapsed
  - 修复后验证:
    - ✅ AppShell - SidebarCollapsed: 侧边栏正确折叠
    - ✅ AppShell - BothCollapsed: 双面板正确折叠
- Evidence: git diff apps/desktop/renderer/src/components/layout/AppShell.stories.tsx

### 2026-02-04 01:25 Linter 检查
- Command: `ReadLints`
- Key output: No linter errors found.
- Evidence: ReadLints 工具输出
