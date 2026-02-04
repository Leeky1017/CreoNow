# ISSUE-153

- Issue: #153
- Branch: task/153-panel-layout-v2
- PR: https://github.com/Leeky1017/CreoNow/pull/154

## Plan

- 扩展 layoutStore（LeftPanelType 8 views + RightPanelType 3 tabs + activeRightPanel）
- 重做 IconBar 多入口 + 重构 Sidebar→LeftPanel
- 右侧 RightPanel 3-tab（AI/Info/Quality）+ Settings 迁移左侧
- 面板组件解耦 + 测试/Storybook 更新

## Runs

### 2026-02-04 开始

- Worktree: `.worktrees/issue-153-panel-layout-v2`
- 开始扩展 layoutStore

### 2026-02-04 Phase 7.0 核心任务完成

已完成：
1. **layoutStore 扩展**
   - LeftPanelType: 8 种 view (files/search/outline/versionHistory/memory/characters/knowledgeGraph/settings)
   - RightPanelType: 3 种 tab (ai/info/quality)
   - 新增 activeRightPanel + setActiveRightPanel

2. **IconBar 重做** (Windsurf 风格)
   - 8 个导航按钮对应 8 个左侧 view
   - 点击逻辑：不同 view 切换并展开，相同 view 切换折叠
   - 完善的 aria-label/aria-pressed/testid

3. **Sidebar 重构**
   - 删除内部 tabs，改为按 activeLeftPanel 渲染对应面板
   - 添加 header 显示当前 view 标题
   - 支持所有 8 个面板：Files/Search/Outline/VersionHistory/Memory/Characters/KnowledgeGraph/Settings

4. **RightPanel 3-tab**
   - 移除 SettingsPanel（迁移到左侧）
   - 添加 AI/Info/Quality 三个 tab
   - Tab 切换由 layoutStore 控制

5. **测试更新**
   - IconBar.test.tsx: 14 个测试全通过
   - Sidebar.test.tsx: 21 个测试全通过
   - RightPanel.test.tsx: 16 个测试全通过
   - Layout.test.tsx/AppShell.test.tsx: 更新选择器

6. **验证**
   - TypeScript 编译通过
   - 布局测试 104 个全通过
   - Storybook build 成功
