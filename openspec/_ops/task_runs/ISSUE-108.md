# ISSUE-108
- Issue: #108
- Branch: task/108-diffview-design
- PR: https://github.com/Leeky1017/CreoNow/pull/109

## Plan
- 升级 UnifiedDiffView（双列行号、+/- 指示器、悬停效果）
- 实现 DiffHeader（版本选择、视图切换、导航）
- 实现 DiffFooter（统计信息、操作按钮）
- 实现 DiffViewPanel 集成组件
- Storybook 验证所有交互

## Runs
### 2026-02-02 18:30 开始实现

### 2026-02-02 18:35 完成实现
- Command: `pnpm typecheck`
- Key output: 编译通过
- 新增组件:
  - `DiffView.tsx`: 升级为 UnifiedDiffView，双列行号 + +/- 指示器 + 悬停效果
  - `DiffHeader.tsx`: 版本选择器、Split/Unified 切换、上下导航、关闭按钮
  - `DiffFooter.tsx`: 统计信息（+N lines / -N lines / N changes）+ Close/Restore 按钮
  - `SplitDiffView.tsx`: 左右 Before/After 分屏视图 + 同步滚动
  - `DiffViewPanel.tsx`: 集成 Header + Content + Footer
- Storybook 验证:
  - FullPanelUnified: Header + UnifiedDiffView + Footer ✅
  - FullPanelSplit: Header + SplitDiffView + Footer ✅
  - InteractiveDemo: 完整交互 ✅
  - HeaderOnly / FooterOnly: 独立组件 ✅
